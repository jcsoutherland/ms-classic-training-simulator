import { describe, expect, it } from 'vitest';
import { locateTemplate } from './locate';
import { matchJob, parseExpPercent, parseFirstNumber, parseRange, parseWholeNumber } from './parse';
import { decodePrint, iconFingerprint, printDistance, type RawImage } from './rawImage';

function solid(width: number, height: number, value: (x: number, y: number) => number): RawImage {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4;
      data[index] = data[index + 1] = data[index + 2] = value(x, y);
      data[index + 3] = 255;
    }
  }
  return { width, height, data };
}

describe('text parsing', () => {
  it('reads a number with thousands separators', () => expect(parseWholeNumber('1,284')).toBe(1284));
  it('reads the first number of a value', () => expect(parseFirstNumber('34 (12)')).toBe(34));
  it('reads an attack range written with a tilde', () => expect(parseRange('103 ~ 195')).toEqual([103, 195]));
  it('reads an EXP percent', () => expect(parseExpPercent('124,816 [57.63%]')).toBe(57.63));
  it('matches a job name with an OCR slip', () => expect(matchJob('Assasin')).toBe(410));
  it('ignores text that is not a job', () => expect(matchJob('xyz')).toBeNull());
});

describe('locateTemplate', () => {
  const pattern = (x: number, y: number) => Math.round(120 + 80 * Math.sin(x / 5) * Math.cos(y / 4));
  const template = solid(24, 16, pattern);
  const screen = solid(120, 80, (x, y) => (x >= 41 && x < 65 && y >= 23 && y < 39 ? pattern(x - 41, y - 23) : 200));

  it('finds a window where it sits on the screen', () => {
    expect(locateTemplate(screen, template)).toMatchObject({ x: 41, y: 23 });
  });

  it('reports nothing when the window is not there', () => {
    expect(locateTemplate(solid(120, 80, () => 200), template)).toBeNull();
  });
});

describe('icon fingerprints', () => {
  it('scores an identical icon as a perfect match', () => {
    const icon = solid(32, 32, (x, y) => (x + y) * 4);
    const screenPrint = iconFingerprint(icon);
    const stored = new Uint8ClampedArray(64 * 4);
    for (let cell = 0; cell < 64; cell++) {
      stored.set(screenPrint.subarray(cell * 3, cell * 3 + 3), cell * 4);
      stored[cell * 4 + 3] = 255;
    }
    expect(printDistance(screenPrint, stored)).toBe(0);
  });

  it('decodes a stored fingerprint', () => {
    expect([...decodePrint(btoa(String.fromCharCode(1, 2, 3)))]).toEqual([1, 2, 3]);
  });
});
