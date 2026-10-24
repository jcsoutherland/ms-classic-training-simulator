import { describe, expect, it } from 'vitest';
import { ByteReader } from './byteReader';
import { versionHash } from './package';

const ZERO_KEY = Buffer.alloc(64);

function narrowString(text: string): Buffer {
  const bytes = [256 - text.length];
  let mask = 0xaa;
  for (const character of text) {
    bytes.push(character.charCodeAt(0) ^ mask);
    mask = (mask + 1) & 0xff;
  }
  return Buffer.from(bytes);
}

describe('versionHash', () => {
  it('matches the known hash for version 83', () => {
    expect(versionHash(83)).toBe(1876);
  });
});

describe('ByteReader', () => {
  it('reads a small compressed int from one byte', () => {
    expect(new ByteReader(Buffer.from([0x05]), ZERO_KEY).readCompressedInt()).toBe(5);
  });

  it('reads a large compressed int after the -128 marker', () => {
    const buffer = Buffer.from([0x80, 0x10, 0x27, 0x00, 0x00]);
    expect(new ByteReader(buffer, ZERO_KEY).readCompressedInt()).toBe(10000);
  });

  it('decodes a narrow encrypted string with the Classic (zero) key', () => {
    expect(new ByteReader(narrowString('Property'), ZERO_KEY).readEncryptedString()).toBe('Property');
  });

  it('returns an empty string for a zero length', () => {
    expect(new ByteReader(Buffer.from([0]), ZERO_KEY).readEncryptedString()).toBe('');
  });
});
