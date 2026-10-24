export class ByteReader {
  position: number;

  constructor(readonly buffer: Buffer, readonly stringKey: Buffer, start = 0) {
    this.position = start;
  }

  readByte(): number {
    return this.buffer[this.position++];
  }

  readSignedByte(): number {
    return this.buffer.readInt8(this.position++);
  }

  readUInt16(): number {
    const value = this.buffer.readUInt16LE(this.position);
    this.position += 2;
    return value;
  }

  readInt16(): number {
    const value = this.buffer.readInt16LE(this.position);
    this.position += 2;
    return value;
  }

  readInt32(): number {
    const value = this.buffer.readInt32LE(this.position);
    this.position += 4;
    return value;
  }

  readUInt32(): number {
    const value = this.buffer.readUInt32LE(this.position);
    this.position += 4;
    return value;
  }

  readInt64(): number {
    const value = Number(this.buffer.readBigInt64LE(this.position));
    this.position += 8;
    return value;
  }

  readFloat(): number {
    const value = this.buffer.readFloatLE(this.position);
    this.position += 4;
    return value;
  }

  readDouble(): number {
    const value = this.buffer.readDoubleLE(this.position);
    this.position += 8;
    return value;
  }

  readCompressedInt(): number {
    const small = this.readSignedByte();
    return small === -128 ? this.readInt32() : small;
  }

  readCompressedLong(): number {
    const small = this.readSignedByte();
    return small === -128 ? this.readInt64() : small;
  }

  readEncryptedString(): string {
    const lengthByte = this.readSignedByte();
    if (lengthByte === 0) return '';
    if (lengthByte > 0) return this.readWideString(lengthByte === 127 ? this.readInt32() : lengthByte);
    return this.readNarrowString(lengthByte === -128 ? this.readInt32() : -lengthByte);
  }

  private readWideString(length: number): string {
    let mask = 0xaaaa;
    let text = '';
    for (let index = 0; index < length; index++) {
      const keyPart = this.stringKey[index * 2] | (this.stringKey[index * 2 + 1] << 8);
      text += String.fromCharCode(this.readUInt16() ^ mask ^ keyPart);
      mask = (mask + 1) & 0xffff;
    }
    return text;
  }

  private readNarrowString(length: number): string {
    let mask = 0xaa;
    let text = '';
    for (let index = 0; index < length; index++) {
      text += String.fromCharCode(this.readByte() ^ mask ^ this.stringKey[index]);
      mask = (mask + 1) & 0xff;
    }
    return text;
  }
}
