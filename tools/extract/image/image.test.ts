import { describe, expect, it } from 'vitest';
import { decodePixels } from './canvas';
import { Composer } from './compose';
import { encodePng } from './encode';

describe('decodePixels', () => {
  it('expands a BGRA4444 pixel to full RGBA', () => {
    expect([...decodePixels(Buffer.from([0x21, 0xf3]), 1, 1)]).toEqual([51, 34, 17, 255]);
  });

  it('reorders a BGRA8888 pixel to RGBA', () => {
    expect([...decodePixels(Buffer.from([1, 2, 3, 4]), 1, 2)]).toEqual([3, 2, 1, 4]);
  });

  it('rejects pixel formats it does not know', () => {
    expect(() => decodePixels(Buffer.alloc(4), 1, 999)).toThrow(/isn't supported/);
  });
});

describe('encodePng', () => {
  it('writes the PNG signature first', () => {
    const png = encodePng({ width: 1, height: 1, pixels: Buffer.from([255, 0, 0, 255]) });
    expect([...png.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  });

  it('stores the width in the header', () => {
    const png = encodePng({ width: 7, height: 2, pixels: Buffer.alloc(7 * 2 * 4) });
    expect(png.readUInt32BE(16)).toBe(7);
  });
});

describe('Composer', () => {
  it('paints an opaque pixel over the background', () => {
    const composer = new Composer(1, 1);
    composer.draw({ width: 1, height: 1, pixels: Buffer.from([10, 20, 30, 255]) }, 0, 0);
    expect([...composer.toBitmap().pixels]).toEqual([10, 20, 30, 255]);
  });

  it('mirrors a sprite when flipped', () => {
    const composer = new Composer(2, 1);
    composer.draw({ width: 2, height: 1, pixels: Buffer.from([255, 0, 0, 255, 0, 0, 255, 255]) }, 0, 0, true);
    expect([...composer.toBitmap().pixels.subarray(0, 3)]).toEqual([0, 0, 255]);
  });

  it('ignores pixels outside the frame', () => {
    const composer = new Composer(1, 1);
    composer.draw({ width: 1, height: 1, pixels: Buffer.from([10, 20, 30, 255]) }, 5, 5);
    expect([...composer.toBitmap().pixels]).toEqual([0, 0, 0, 255]);
  });
});
