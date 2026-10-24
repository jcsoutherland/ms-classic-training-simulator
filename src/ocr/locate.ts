import type { RawImage } from './rawImage';

export interface Found {
  x: number;
  y: number;
  score: number;
}

interface Plane {
  width: number;
  height: number;
  values: Float32Array;
  opaque: Uint8Array;
}

const SAMPLE_STEP = 2;
const REFINE_RADIUS = 3;
export const MATCH_LIMIT = 26;

export function locateTemplate(screen: RawImage, template: RawImage): Found | null {
  if (screen.width < template.width || screen.height < template.height) return null;
  const screenFull = toPlane(screen);
  const templateFull = toPlane(template);
  const screenHalf = halve(screenFull);
  const templateHalf = halve(templateFull);
  const coarseSamples = samples(templateHalf);
  if (coarseSamples.length === 0) return null;
  let best: Found | null = null;
  for (let y = 0; y <= screenHalf.height - templateHalf.height; y++) {
    for (let x = 0; x <= screenHalf.width - templateHalf.width; x++) {
      const score = scoreAt(screenHalf, coarseSamples, x, y, best?.score ?? Infinity);
      if (!best || score < best.score) best = { x, y, score };
    }
  }
  if (!best) return null;
  const refined = refine(screenFull, templateFull, samples(templateFull), { x: best.x * 2, y: best.y * 2, score: Infinity });
  return refined.score <= MATCH_LIMIT ? refined : null;
}

function toPlane(image: RawImage): Plane {
  const values = new Float32Array(image.width * image.height);
  const opaque = new Uint8Array(image.width * image.height);
  for (let index = 0; index < values.length; index++) {
    values[index] = (image.data[index * 4] * 299 + image.data[index * 4 + 1] * 587 + image.data[index * 4 + 2] * 114) / 1000;
    opaque[index] = image.data[index * 4 + 3] > 240 ? 1 : 0;
  }
  return { width: image.width, height: image.height, values, opaque };
}

function halve(plane: Plane): Plane {
  const width = Math.floor(plane.width / 2);
  const height = Math.floor(plane.height / 2);
  const values = new Float32Array(width * height);
  const opaque = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const corners = [(y * 2) * plane.width + x * 2, (y * 2) * plane.width + x * 2 + 1, (y * 2 + 1) * plane.width + x * 2, (y * 2 + 1) * plane.width + x * 2 + 1];
      values[y * width + x] = corners.reduce((total, index) => total + plane.values[index], 0) / 4;
      opaque[y * width + x] = corners.every((index) => plane.opaque[index]) ? 1 : 0;
    }
  }
  return { width, height, values, opaque };
}

function samples(template: Plane): [number, number, number][] {
  const result: [number, number, number][] = [];
  for (let y = 0; y < template.height; y += SAMPLE_STEP) {
    for (let x = 0; x < template.width; x += SAMPLE_STEP) {
      const index = y * template.width + x;
      if (template.opaque[index]) result.push([x, y, template.values[index]]);
    }
  }
  return result;
}

function scoreAt(screen: Plane, points: [number, number, number][], left: number, top: number, giveUpAbove: number): number {
  let total = 0;
  const limit = giveUpAbove * points.length;
  for (const [x, y, value] of points) {
    total += Math.abs(screen.values[(top + y) * screen.width + left + x] - value);
    if (total > limit) return Infinity;
  }
  return total / points.length;
}

function refine(screen: Plane, template: Plane, points: [number, number, number][], start: Found): Found {
  let best = start;
  for (let y = Math.max(0, start.y - REFINE_RADIUS); y <= Math.min(screen.height - template.height, start.y + REFINE_RADIUS); y++) {
    for (let x = Math.max(0, start.x - REFINE_RADIUS); x <= Math.min(screen.width - template.width, start.x + REFINE_RADIUS); x++) {
      const score = scoreAt(screen, points, x, y, best.score);
      if (score < best.score) best = { x, y, score };
    }
  }
  return best;
}
