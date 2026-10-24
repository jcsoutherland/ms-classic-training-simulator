import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { readImage, type WzNode } from '../wz/image';

const SUPPORTED_VERSION = 4;
const KEY_OBSCURE = [
  0x7b, 0x2f, 0x35, 0x48, 0x43, 0x95, 0x02, 0xb9, 0xae, 0x91, 0xa6, 0xe1, 0xd8, 0xd6, 0x24, 0xb4,
  0x33, 0x10, 0x1d, 0x3d, 0xc1, 0xbb, 0xc6, 0xf4, 0xa5, 0xfe, 0xb3, 0x69, 0x6b, 0x56, 0xe4, 0x75,
];
const BLOCK = 64;
const ENCRYPTED_HEAD = 1024;
const CLASSIC_STRING_KEY = Buffer.alloc(0x10000);

interface PackEntry {
  name: string;
  start: number;
  size: number;
  key: Buffer;
}

export interface MsPack {
  buffer: Buffer;
  salt: string;
  entries: Map<string, PackEntry>;
}

export function chacha20(key: number[], nonce: Buffer, counter: number, data: Buffer): Buffer {
  const iv = Buffer.alloc(16);
  iv.writeUInt32LE(counter >>> 0, 0);
  nonce.copy(iv, 4);
  const decipher = crypto.createDecipheriv('chacha20', Buffer.from(key), iv);
  return Buffer.concat([decipher.update(data), decipher.final()]);
}

export function openPack(filePath: string): MsPack {
  const buffer = fs.readFileSync(filePath);
  const fileName = path.basename(filePath).toLowerCase();
  const header = readHeader(buffer, fileName);
  const entries = readEntries(buffer, fileName, header);
  return { buffer, salt: header.salt, entries };
}

export function packImageNames(pack: MsPack): string[] {
  return [...pack.entries.keys()];
}

export function readPackImage(pack: MsPack, name: string): { buffer: Buffer; root: WzNode } {
  const entry = pack.entries.get(name);
  if (!entry) throw new Error(`${name} is not in this pack.`);
  const buffer = decryptEntry(pack, entry);
  return { buffer, root: readImage(buffer, CLASSIC_STRING_KEY, 0) };
}

function sumOfCodes(text: string, multiplier = 1): number {
  let sum = 0;
  for (const character of text) sum += character.charCodeAt(0) * multiplier;
  return sum;
}

function readHeader(buffer: Buffer, fileName: string) {
  const randomCount = sumOfCodes(fileName) % 312 + 30;
  const randomBytes = Array.from(buffer.subarray(0, randomCount), (byte) => ((byte << 24 >> 24) >> 1) & 0xff);
  let position = randomCount;
  const encryptedVersion = buffer[position++];
  const version = encryptedVersion ^ randomBytes[0];
  if (version !== SUPPORTED_VERSION) throw new Error(`${fileName} is MS pack version ${version}; only version ${SUPPORTED_VERSION} is supported.`);
  const hashedSaltLength = buffer.readInt32LE(position);
  position += 4;
  const saltLength = (hashedSaltLength & 0xff) ^ randomBytes[0];
  const saltBytes = buffer.subarray(position, position + saltLength * 2);
  position += saltLength * 2;
  let salt = '';
  for (let index = 0; index < saltLength; index++) {
    const mixed = randomBytes[index] ^ saltBytes[index * 2];
    salt += String.fromCharCode((((mixed | 0x4b) << 1) - mixed - 75) & 0xffff);
  }
  const headerStart = position;
  const nameWithSalt = fileName + salt;
  const headerKey = Array.from({ length: 32 }, (_, index) => ((nameWithSalt.charCodeAt(index % nameWithSalt.length) + index) & 0xff) ^ KEY_OBSCURE[index]);
  const decrypted = chacha20(headerKey, Buffer.alloc(12), 0, buffer.subarray(position, position + 8));
  const hash = decrypted.readInt32LE(0);
  const entryCount = decrypted.readInt32LE(4);
  let expected = hashedSaltLength + encryptedVersion + version + entryCount;
  for (let index = 0; index < saltLength; index++) expected += saltBytes.readUInt16LE(index * 2);
  if ((hash | 0) !== (expected | 0)) throw new Error(`${fileName} failed its header check; the file may be damaged.`);
  const entriesStart = headerStart + 8 + sumOfCodes(fileName, 3) % 212 + 64;
  return { salt, nameWithSalt, entryCount, entriesStart };
}

function readEntries(buffer: Buffer, fileName: string, header: ReturnType<typeof readHeader>): Map<string, PackEntry> {
  const { nameWithSalt } = header;
  const key = Array.from({ length: 32 }, (_, index) =>
    ((index + (index % 3 + 2) * nameWithSalt.charCodeAt(nameWithSalt.length - 1 - index % nameWithSalt.length)) & 0xff) ^ KEY_OBSCURE[index]);
  const stream = new EntryStream(buffer, key, header.entriesStart);
  const entries = new Map<string, PackEntry>();
  const pending: PackEntry[] = [];
  for (let index = 0; index < header.entryCount; index++) {
    const nameLength = stream.readInt32();
    const name = stream.read(nameLength * 2).toString('utf16le');
    stream.readInt32();
    stream.readInt32();
    const startBlock = stream.readInt32();
    const size = stream.readInt32();
    stream.readInt32();
    stream.readInt32();
    stream.readInt32();
    const entryKey = Buffer.from(stream.read(16));
    stream.readInt32();
    stream.readInt32();
    pending.push({ name, start: startBlock, size, key: entryKey });
  }
  let dataStart = stream.position;
  if (dataStart & 0x3ff) dataStart = dataStart - (dataStart & 0x3ff) + 0x400;
  for (const entry of pending) entries.set(entry.name, { ...entry, start: dataStart + entry.start * 1024 });
  if (entries.size === 0) throw new Error(`${fileName} has no entries.`);
  return entries;
}

class EntryStream {
  position: number;
  private block = Buffer.alloc(0);
  private offset = BLOCK;
  private counter = 0;

  constructor(private readonly buffer: Buffer, private readonly key: number[], start: number) {
    this.position = start;
  }

  read(length: number): Buffer {
    const out = Buffer.alloc(length);
    let written = 0;
    while (written < length) {
      if (this.offset >= BLOCK) this.nextBlock();
      const count = Math.min(length - written, BLOCK - this.offset);
      this.block.copy(out, written, this.offset, this.offset + count);
      written += count;
      this.offset += count;
    }
    if (this.offset >= BLOCK) this.counter = 0;
    return out;
  }

  readInt32(): number {
    return this.read(4).readInt32LE(0);
  }

  private nextBlock(): void {
    this.block = chacha20(this.key, Buffer.alloc(12), this.counter++, this.buffer.subarray(this.position, this.position + BLOCK));
    this.position += BLOCK;
    this.offset = 0;
  }
}

function decryptEntry(pack: MsPack, entry: PackEntry): Buffer {
  let keyHash = 0x811c9dc5;
  for (const character of pack.salt) keyHash = Math.imul((keyHash ^ character.charCodeAt(0)) >>> 0, 0x1000193) >>> 0;
  const secondHash = keyHash >>> 1;
  const thirdHash = (secondHash ^ 0x6c) >>> 0;
  const digits = [...String(keyHash)].map(Number);
  const { name, key: entryKey } = entry;
  const key = Array.from({ length: 32 }, (_, index) => ((index + name.charCodeAt(index % name.length) * (
    digits[index % digits.length] % 2
    + entryKey[(digits[(index + 2) % digits.length] + index) % entryKey.length]
    + (digits[(index + 1) % digits.length] + index) % 5)) & 0xff) ^ KEY_OBSCURE[index]);
  const hashData = Buffer.alloc(12);
  hashData.writeUInt32LE(keyHash, 0);
  hashData.writeUInt32LE(secondHash, 4);
  hashData.writeUInt32LE(thirdHash, 8);
  for (let index = 0, a = 0, b = 0, c = 90, d = 0; index < 12; ++index) {
    hashData[index] ^= (d + 11 * Math.floor(index / 11) + (c ^ (index >> 2)) + (a ^ b)) & 0xff;
    --d;
    a += 8;
    b += 17;
    c += 43;
  }
  const nonce = Buffer.alloc(12);
  hashData.copy(nonce, 4, 0, 8);
  const raw = Buffer.from(pack.buffer.subarray(entry.start, entry.start + entry.size));
  const headLength = Math.min(entry.size, ENCRYPTED_HEAD);
  chacha20(key, nonce, hashData.readUInt32LE(8), raw.subarray(0, headLength)).copy(raw, 0);
  return raw;
}
