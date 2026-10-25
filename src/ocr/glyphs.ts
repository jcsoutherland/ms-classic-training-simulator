import type { RawImage } from './rawImage';

const INK_BRIGHTNESS = 110;
const NEAREST_LIMIT = 3;

export type GlyphBook = Record<string, string>;

export interface Glyph {
  key: string;
  left: number;
}

export function inkAt(image: RawImage, x: number, y: number): boolean {
  const index = (y * image.width + x) * 4;
  return (image.data[index] + image.data[index + 1] + image.data[index + 2]) / 3 < INK_BRIGHTNESS;
}

export function glyphsIn(image: RawImage): Glyph[] {
  const columns = Array.from({ length: image.width }, (_, x) => Array.from({ length: image.height }, (_, y) => inkAt(image, x, y)));
  const glyphs: Glyph[] = [];
  let start = -1;
  for (let x = 0; x <= image.width; x++) {
    const hasInk = x < image.width && columns[x].some(Boolean);
    if (hasInk && start < 0) start = x;
    if (!hasInk && start >= 0) {
      glyphs.push({ key: keyOf(columns.slice(start, x)), left: start });
      start = -1;
    }
  }
  return glyphs;
}

export function readGlyphs(image: RawImage, book: GlyphBook): string {
  return glyphsIn(image).map((glyph) => book[glyph.key] ?? nearest(glyph.key, book) ?? '?').join('');
}

function keyOf(columns: boolean[][]): string {
  const rows = columns[0].map((_, y) => columns.map((column) => (column[y] ? '1' : '0')).join(''));
  const top = rows.findIndex((row) => row.includes('1'));
  const bottom = rows.length - 1 - [...rows].reverse().findIndex((row) => row.includes('1'));
  return `${columns.length}:${rows.slice(top, bottom + 1).join('/')}`;
}

function nearest(key: string, book: GlyphBook): string | null {
  let best: { character: string; distance: number } | null = null;
  for (const [known, character] of Object.entries(book)) {
    const distance = keyDistance(key, known);
    if (distance <= NEAREST_LIMIT && (!best || distance < best.distance)) best = { character, distance };
  }
  return best?.character ?? null;
}

function keyDistance(a: string, b: string): number {
  const [widthA, bitsA] = a.split(':');
  const [widthB, bitsB] = b.split(':');
  if (widthA !== widthB || bitsA.length !== bitsB.length) return Infinity;
  let distance = 0;
  for (let index = 0; index < bitsA.length; index++) if (bitsA[index] !== bitsB[index]) distance++;
  return distance;
}
