import { crop, decodePrint, iconFingerprint, printDistance, type RawImage } from './rawImage';

const NUDGE = 6;
const MASKED_NUDGE = 8;
const OPAQUE = 200;
const ICON_FRAME = 32;
export const MASKED_MATCH_LIMIT = 25;
export const ICON_MATCH_LIMIT = 38;

export interface IconMatch {
  id: number;
  distance: number;
}

export type PrintBook = [id: number, print: Uint8ClampedArray][];

export function decodePrintBook(prints: Record<string, string>, keep: (id: number) => boolean = () => true): PrintBook {
  return Object.entries(prints).map(([id, print]) => [Number(id), decodePrint(print)] as [number, Uint8ClampedArray]).filter(([id]) => keep(id));
}

export function matchIconAt(screen: RawImage, left: number, top: number, book: PrintBook): IconMatch | null {
  let best: IconMatch | null = null;
  for (let dy = -NUDGE; dy <= NUDGE; dy++) {
    for (let dx = -NUDGE; dx <= NUDGE; dx++) {
      const print = iconFingerprint(crop(screen, left + dx, top + dy, 32, 32));
      for (const [id, stored] of book) {
        const distance = printDistance(print, stored);
        if (!best || distance < best.distance) best = { id, distance };
      }
    }
  }
  return best && best.distance <= ICON_MATCH_LIMIT ? best : null;
}

export function closestByPrint(screen: RawImage, left: number, top: number, book: PrintBook, count: number): number[] {
  const best = new Map<number, number>();
  for (let dy = -NUDGE; dy <= NUDGE; dy += 2) {
    for (let dx = -NUDGE; dx <= NUDGE; dx += 2) {
      const print = iconFingerprint(crop(screen, left + dx, top + dy, 32, 32));
      for (const [id, stored] of book) {
        const distance = printDistance(print, stored);
        if (distance < (best.get(id) ?? Infinity)) best.set(id, distance);
      }
    }
  }
  return [...best].sort((a, b) => a[1] - b[1]).slice(0, count).map(([id]) => id);
}

export function maskedDifference(screen: RawImage, icon: RawImage, left: number, top: number): number {
  let total = 0;
  let count = 0;
  for (let y = 0; y < icon.height; y++) {
    for (let x = 0; x < icon.width; x++) {
      const source = (y * icon.width + x) * 4;
      if (icon.data[source + 3] < OPAQUE) continue;
      const screenX = left + x;
      const screenY = top + y;
      count++;
      if (screenX < 0 || screenY < 0 || screenX >= screen.width || screenY >= screen.height) {
        total += 255;
        continue;
      }
      const target = (screenY * screen.width + screenX) * 4;
      total += (Math.abs(icon.data[source] - screen.data[target]) + Math.abs(icon.data[source + 1] - screen.data[target + 1]) + Math.abs(icon.data[source + 2] - screen.data[target + 2])) / 3;
    }
  }
  return count ? total / count : Infinity;
}

export function bestMaskedMatch(screen: RawImage, left: number, top: number, icons: [id: number, icon: RawImage][]): IconMatch | null {
  let best: IconMatch | null = null;
  for (const [id, icon] of icons) {
    for (let dy = -MASKED_NUDGE; dy <= MASKED_NUDGE; dy++) {
      for (let dx = -MASKED_NUDGE; dx <= MASKED_NUDGE; dx++) {
        const distance = maskedDifference(screen, icon, left + dx + ICON_FRAME - icon.width, top + dy + ICON_FRAME - icon.height);
        if (!best || distance < best.distance) best = { id, distance };
      }
    }
  }
  return best && best.distance <= MASKED_MATCH_LIMIT ? best : null;
}
