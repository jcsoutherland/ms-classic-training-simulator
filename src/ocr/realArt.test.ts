import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { locateTemplate } from './locate';
import { decodePrintBook, matchIconAt } from './matchIcon';
import type { RawImage } from './rawImage';

const DATA = fileURLToPath(new URL('../../public/data/', import.meta.url));

async function loadPng(path: string): Promise<RawImage> {
  const { data, info } = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { width: info.width, height: info.height, data: new Uint8ClampedArray(data) };
}

function noisyScreen(width: number, height: number): RawImage {
  const data = new Uint8ClampedArray(width * height * 4);
  let seed = 7;
  for (let index = 0; index < width * height; index++) {
    seed = (seed * 1103515245 + 12345) >>> 0;
    const value = 40 + (seed >>> 24) % 120;
    data.set([value, value * 0.8, value * 0.6, 255], index * 4);
  }
  return { width, height, data };
}

function paste(screen: RawImage, art: RawImage, left: number, top: number): void {
  for (let y = 0; y < art.height; y++) {
    for (let x = 0; x < art.width; x++) {
      const source = (y * art.width + x) * 4;
      const alpha = art.data[source + 3] / 255;
      const target = ((top + y) * screen.width + left + x) * 4;
      for (let channel = 0; channel < 3; channel++) screen.data[target + channel] = screen.data[target + channel] * (1 - alpha) + art.data[source + channel] * alpha;
    }
  }
}

describe('finding the real Stats window', () => {
  it('finds it on a busy screen even with text in its value cells', async () => {
    const art = await loadPng(`${DATA}img/ui/stat.png`);
    const screen = noisyScreen(640, 400);
    paste(screen, art, 217, 61);
    for (let y = 61 + 175; y < 61 + 189; y++) for (let x = 217 + 62; x < 217 + 90; x += 3) screen.data.set([20, 20, 20, 255], (y * 640 + x) * 4);
    expect(locateTemplate(screen, art)).toMatchObject({ x: 217, y: 61 });
  });
});

describe('matching a real equipment icon', () => {
  it('picks the right claw from every equipment fingerprint', async () => {
    const prints = JSON.parse(fs.readFileSync(`${DATA}equip-prints.json`, 'utf8')) as Record<string, string>;
    const book = decodePrintBook(prints, (id) => id < 1700000);
    const icon = await loadPng(`${DATA}img/items/1472009.png`);
    const screen: RawImage = { width: 64, height: 64, data: new Uint8ClampedArray(64 * 64 * 4).fill(235) };
    paste(screen, icon, 16, 16 + 32 - icon.height);
    expect(matchIconAt(screen, 16, 16, book)?.id).toBe(1472009);
  });
});
