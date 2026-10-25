import { fetchJson, imageUrl } from '../data/loadGameData';
import type { GlyphBook } from './glyphs';
import { decodePrintBook, type PrintBook } from './matchIcon';
import type { RawImage } from './rawImage';
import type { WindowKit, WindowLayout } from './readWindows';

let kit: Promise<WindowKit> | null = null;

export function loadWindowKit(): Promise<WindowKit> {
  kit ??= buildKit();
  return kit;
}

export async function fileToRawImage(file: Blob): Promise<RawImage> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('This browser cannot read screenshots (no canvas support).');
  context.drawImage(bitmap, 0, 0);
  const { data, width, height } = context.getImageData(0, 0, canvas.width, canvas.height);
  return { width, height, data };
}

async function buildKit(): Promise<WindowKit> {
  const [layout, glyphs, skillPrints, stat, detail, skill, equipment] = await Promise.all([
    fetchJson<WindowLayout>('ui-layout.json'),
    fetchJson<GlyphBook>('glyphs.json'),
    fetchJson<Record<string, string>>('skill-prints.json'),
    urlToRawImage(imageUrl('img/ui/stat.png')),
    urlToRawImage(imageUrl('img/ui/stat-detail.png')),
    urlToRawImage(imageUrl('img/ui/skill.png')),
    urlToRawImage(imageUrl('img/ui/equipment.png')),
  ]);
  let equipPrints: Promise<PrintBook> | null = null;
  const icons = new Map<number, Promise<RawImage>>();
  return {
    layout,
    glyphs,
    templates: { stat, 'stat-detail': detail, skill, equipment },
    skillPrints: decodePrintBook(skillPrints),
    equipPrints: () => {
      equipPrints ??= fetchJson<Record<string, string>>('equip-prints.json').then((prints) => decodePrintBook(prints));
      return equipPrints;
    },
    itemIcon: (itemId) => {
      if (!icons.has(itemId)) icons.set(itemId, urlToRawImage(imageUrl(`img/items/${itemId}.png`)));
      return icons.get(itemId) as Promise<RawImage>;
    },
  };
}

async function urlToRawImage(url: string): Promise<RawImage> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Couldn't load ${url} (${response.status}).`);
  return fileToRawImage(await response.blob());
}
