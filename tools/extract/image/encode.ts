import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import sharp from 'sharp';
import type { Bitmap } from './canvas';

export function encodePng(bitmap: Bitmap): Buffer {
  const { width, height, pixels } = bitmap;
  const rows = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) pixels.copy(rows, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', header),
    pngChunk('IDAT', zlib.deflateSync(rows, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

export function writePng(filePath: string, bitmap: Bitmap): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, encodePng(bitmap));
}

export async function writeWebp(filePath: string, bitmap: Bitmap): Promise<void> {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  await sharp(bitmap.pixels, { raw: { width: bitmap.width, height: bitmap.height, channels: 4 } })
    .webp({ quality: 88, alphaQuality: 100 })
    .toFile(filePath);
}

function pngChunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const typeAndData = Buffer.concat([Buffer.from(type), data]);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(zlib.crc32(typeAndData));
  return Buffer.concat([length, typeAndData, checksum]);
}
