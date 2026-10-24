import zlib from 'node:zlib';
import type { CanvasInfo } from '../wz/image';

export interface Bitmap {
  width: number;
  height: number;
  pixels: Buffer;
}

const FORMAT_BGRA4444 = 1;
const FORMAT_BGRA8888 = 2;
const FORMAT_RGB565 = 513;

export function decodeCanvas(buffer: Buffer, canvas: CanvasInfo): Bitmap {
  const compressed = buffer.subarray(canvas.dataOffset, canvas.dataOffset + canvas.dataLength + 1);
  const raw = zlib.inflateSync(compressed, { finishFlush: zlib.constants.Z_SYNC_FLUSH });
  const factor = 1 << canvas.scale;
  const storedWidth = Math.ceil(canvas.width / factor);
  const storedHeight = Math.ceil(canvas.height / factor);
  const stored = decodePixels(raw, storedWidth * storedHeight, canvas.format);
  const pixels = factor === 1 ? stored : enlarge(stored, storedWidth, canvas.width, canvas.height, factor);
  return { width: canvas.width, height: canvas.height, pixels };
}

export function decodePixels(raw: Buffer, count: number, format: number): Buffer {
  const out = Buffer.alloc(count * 4);
  if (format === FORMAT_BGRA4444) {
    for (let index = 0; index < count; index++) {
      const low = raw[index * 2];
      const high = raw[index * 2 + 1];
      out[index * 4] = (high & 15) * 17;
      out[index * 4 + 1] = (low >> 4) * 17;
      out[index * 4 + 2] = (low & 15) * 17;
      out[index * 4 + 3] = (high >> 4) * 17;
    }
    return out;
  }
  if (format === FORMAT_BGRA8888) {
    for (let index = 0; index < count; index++) {
      out[index * 4] = raw[index * 4 + 2];
      out[index * 4 + 1] = raw[index * 4 + 1];
      out[index * 4 + 2] = raw[index * 4];
      out[index * 4 + 3] = raw[index * 4 + 3];
    }
    return out;
  }
  if (format === FORMAT_RGB565) {
    for (let index = 0; index < count; index++) {
      const value = raw.readUInt16LE(index * 2);
      out[index * 4] = Math.round(((value >> 11) & 31) * 255 / 31);
      out[index * 4 + 1] = Math.round(((value >> 5) & 63) * 255 / 63);
      out[index * 4 + 2] = Math.round((value & 31) * 255 / 31);
      out[index * 4 + 3] = 255;
    }
    return out;
  }
  throw new Error(`Canvas pixel format ${format} isn't supported yet.`);
}

function enlarge(stored: Buffer, storedWidth: number, width: number, height: number, factor: number): Buffer {
  const out = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const source = (Math.floor(y / factor) * storedWidth + Math.floor(x / factor)) * 4;
      stored.copy(out, (y * width + x) * 4, source, source + 4);
    }
  }
  return out;
}
