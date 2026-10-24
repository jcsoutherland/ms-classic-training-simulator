import { JOB_NAMES } from '../character/jobs';

export function parseWholeNumber(text: string): number | null {
  const digits = text.replace(/[^0-9]/g, '');
  if (!digits) return null;
  return Number(digits);
}

export function parseFirstNumber(text: string): number | null {
  const match = text.replace(/,/g, '').match(/\d+/);
  return match ? Number(match[0]) : null;
}

export function parseRange(text: string): [number, number] | null {
  const match = text.replace(/,/g, '').match(/(\d+)\s*[~\-–]\s*(\d+)/);
  if (!match) return null;
  const low = Number(match[1]);
  const high = Number(match[2]);
  return low <= high ? [low, high] : [high, low];
}

export function parseExpPercent(text: string): number | null {
  const match = text.match(/(\d+(?:\.\d+)?)\s*%/);
  return match ? Math.min(99.99, Number(match[1])) : null;
}

export function matchJob(text: string): number | null {
  const cleaned = text.toLowerCase().replace(/[^a-z/ ]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!cleaned) return null;
  let best: { id: number; score: number } | null = null;
  for (const [id, name] of Object.entries(JOB_NAMES)) {
    const score = similarity(cleaned, name.toLowerCase());
    if (!best || score > best.score) best = { id: Number(id), score };
  }
  return best && best.score >= 0.6 ? best.id : null;
}

export function similarity(a: string, b: string): number {
  if (a === b) return 1;
  const longest = Math.max(a.length, b.length);
  return longest === 0 ? 1 : 1 - editDistance(a, b) / longest;
}

function editDistance(a: string, b: string): number {
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let row = 1; row <= a.length; row++) {
    let diagonal = previous[0];
    previous[0] = row;
    for (let column = 1; column <= b.length; column++) {
      const above = previous[column];
      previous[column] = Math.min(previous[column] + 1, previous[column - 1] + 1, diagonal + (a[row - 1] === b[column - 1] ? 0 : 1));
      diagonal = above;
    }
  }
  return previous[b.length];
}
