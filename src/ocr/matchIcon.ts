import { crop, decodePrint, iconFingerprint, printDistance, type RawImage } from './rawImage';

const NUDGE = 6;
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
