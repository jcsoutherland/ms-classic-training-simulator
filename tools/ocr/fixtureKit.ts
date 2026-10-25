import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { decodePrintBook } from '../../src/ocr/matchIcon';
import type { GlyphBook } from '../../src/ocr/glyphs';
import type { RawImage } from '../../src/ocr/rawImage';
import type { WindowKit, WindowLayout } from '../../src/ocr/readWindows';

const DATA = path.resolve('public/data');

export async function loadPng(file: string): Promise<RawImage> {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { width: info.width, height: info.height, data: new Uint8ClampedArray(data) };
}

export async function fileKit(glyphs: GlyphBook = readJson('glyphs.json')): Promise<WindowKit> {
  const template = (name: string) => loadPng(path.join(DATA, 'img', 'ui', `${name}.png`));
  const [stat, detail, skill, equipment] = await Promise.all([template('stat'), template('stat-detail'), template('skill'), template('equipment')]);
  const equipPrints = decodePrintBook(readJson('equip-prints.json'));
  return {
    layout: readJson<WindowLayout>('ui-layout.json'),
    templates: { stat, 'stat-detail': detail, skill, equipment },
    glyphs,
    skillPrints: decodePrintBook(readJson('skill-prints.json')),
    equipPrints: async () => equipPrints,
    itemIcon: (itemId) => loadPng(path.join(DATA, 'img', 'items', `${itemId}.png`)),
  };
}

function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(path.join(DATA, file), 'utf8')) as T;
}
