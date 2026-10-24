import fs from 'node:fs';
import { ByteReader } from './byteReader';
import { readImage, type WzNode } from './image';

export interface WzPackage {
  buffer: Buffer;
  dataStart: number;
  versionHash: number;
  stringKey: Buffer;
  images: Map<string, number>;
}

const CLASSIC_STRING_KEY = Buffer.alloc(0x10000);
const LIKELY_VERSIONS = [779];
const DIRECTORY_ENTRY_SKIP = 1;
const DIRECTORY_ENTRY_STRING_REFERENCE = 2;
const DIRECTORY_ENTRY_FOLDER = 3;
const DIRECTORY_ENTRY_IMAGE = 4;

export function versionHash(version: number): number {
  let hash = 0;
  for (const character of String(version)) hash = (Math.imul(hash, 32) + character.charCodeAt(0) + 1) >>> 0;
  return hash;
}

export function openPackage(path: string): WzPackage {
  const buffer = fs.readFileSync(path);
  if (buffer.toString('latin1', 0, 4) !== 'PKG1') throw new Error(`${path} is not a WZ package (missing PKG1 header).`);
  const dataStart = buffer.readUInt32LE(12);
  const candidates = [...LIKELY_VERSIONS, ...Array.from({ length: 1500 }, (_, index) => index + 1)];
  for (const version of candidates) {
    const wzPackage: WzPackage = { buffer, dataStart, versionHash: versionHash(version), stringKey: CLASSIC_STRING_KEY, images: new Map() };
    if (tryIndexImages(wzPackage)) return wzPackage;
  }
  throw new Error(`Could not find the version of ${path}; the file may use a format this reader doesn't know.`);
}

export function imageNames(wzPackage: WzPackage): string[] {
  return [...wzPackage.images.keys()];
}

export function readPackageImage(wzPackage: WzPackage, name: string): WzNode {
  const offset = wzPackage.images.get(name);
  if (offset === undefined) throw new Error(`Image ${name} is not in this package.`);
  return readImage(wzPackage.buffer, wzPackage.stringKey, offset);
}

function tryIndexImages(wzPackage: WzPackage): boolean {
  try {
    indexDirectory(wzPackage, wzPackage.dataStart + 2, '', 0);
  } catch {
    wzPackage.images.clear();
    return false;
  }
  const first = wzPackage.images.values().next();
  if (first.done) return false;
  try {
    readImage(wzPackage.buffer, wzPackage.stringKey, first.value);
    return true;
  } catch {
    wzPackage.images.clear();
    return false;
  }
}

function indexDirectory(wzPackage: WzPackage, offset: number, prefix: string, depth: number): void {
  if (depth > 8) throw new Error('Directory nesting is too deep.');
  const reader = new ByteReader(wzPackage.buffer, wzPackage.stringKey, offset);
  const count = reader.readCompressedInt();
  if (count < 0 || count > 100000) throw new Error('Directory entry count is out of range.');
  const folders: [string, number][] = [];
  for (let index = 0; index < count; index++) {
    let type = reader.readByte();
    let name: string;
    if (type === DIRECTORY_ENTRY_SKIP) {
      reader.readInt32();
      reader.readInt16();
      readOffset(reader, wzPackage);
      continue;
    }
    if (type === DIRECTORY_ENTRY_STRING_REFERENCE) {
      const stringOffset = reader.readInt32();
      const back = reader.position;
      reader.position = wzPackage.dataStart + stringOffset;
      type = reader.readByte();
      name = reader.readEncryptedString();
      reader.position = back;
    } else if (type === DIRECTORY_ENTRY_FOLDER || type === DIRECTORY_ENTRY_IMAGE) {
      name = reader.readEncryptedString();
    } else {
      throw new Error(`Unknown directory entry type ${type}.`);
    }
    if (!/^[\x20-\x7e]+$/.test(name)) throw new Error('Directory entry name is not readable text.');
    reader.readCompressedInt();
    reader.readCompressedInt();
    const entryOffset = readOffset(reader, wzPackage);
    if (entryOffset >= wzPackage.buffer.length) throw new Error('Directory entry points past the end of the file.');
    if (type === DIRECTORY_ENTRY_FOLDER) folders.push([prefix + name + '/', entryOffset]);
    else wzPackage.images.set(prefix + name, entryOffset);
  }
  for (const [folderPrefix, folderOffset] of folders) indexDirectory(wzPackage, folderOffset, folderPrefix, depth + 1);
}

function readOffset(reader: ByteReader, wzPackage: WzPackage): number {
  let offset = ((reader.position - wzPackage.dataStart) ^ 0xffffffff) >>> 0;
  offset = Math.imul(offset, wzPackage.versionHash) >>> 0;
  offset = (offset - 0x581c3f6d) >>> 0;
  const shift = offset & 0x1f;
  offset = ((offset << shift) | (offset >>> (32 - shift))) >>> 0;
  offset = (offset ^ reader.readUInt32()) >>> 0;
  return (offset + wzPackage.dataStart * 2) >>> 0;
}
