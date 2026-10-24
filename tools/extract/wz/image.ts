import { ByteReader } from './byteReader';

export interface CanvasInfo {
  width: number;
  height: number;
  format: number;
  scale: number;
  dataOffset: number;
  dataLength: number;
}

export type WzValue = number | string | null | WzNode;

export interface WzNode {
  [key: string]: WzValue | CanvasInfo | [number, number] | undefined;
  __canvas?: CanvasInfo;
  __vector?: [number, number];
  __uol?: string;
}

export function readImage(buffer: Buffer, stringKey: Buffer, offset: number): WzNode {
  const parser = new ImageParser(new ByteReader(buffer, stringKey, offset), offset);
  return parser.readRoot();
}

class ImageParser {
  constructor(private readonly reader: ByteReader, private readonly imageStart: number) {}

  readRoot(): WzNode {
    const kind = this.readStringBlock();
    if (kind !== 'Property') throw new Error(`An image must start with "Property", found "${kind}".`);
    this.reader.readUInt16();
    return this.readPropertyList();
  }

  private readStringBlock(): string {
    const type = this.reader.readByte();
    if (type === 0x00 || type === 0x73) return this.reader.readEncryptedString();
    if (type === 0x01 || type === 0x1b) {
      const relative = this.reader.readInt32();
      const back = this.reader.position;
      this.reader.position = this.imageStart + relative;
      const text = this.reader.readEncryptedString();
      this.reader.position = back;
      return text;
    }
    throw new Error(`Unknown string block type ${type}.`);
  }

  private readPropertyList(): WzNode {
    const count = this.reader.readCompressedInt();
    const node: WzNode = {};
    for (let index = 0; index < count; index++) {
      const name = this.readStringBlock();
      node[name] = this.readPropertyValue();
    }
    return node;
  }

  private readPropertyValue(): WzValue {
    const type = this.reader.readByte();
    switch (type) {
      case 0: return null;
      case 2: case 11: return this.reader.readInt16();
      case 3: case 19: return this.reader.readCompressedInt();
      case 20: return this.reader.readCompressedLong();
      case 4: return this.reader.readByte() === 0x80 ? this.reader.readFloat() : 0;
      case 5: return this.reader.readDouble();
      case 8: return this.readStringBlock();
      case 9: return this.readSizedExtended();
      default: throw new Error(`Unknown property type ${type}.`);
    }
  }

  private readSizedExtended(): WzNode {
    const size = this.reader.readUInt32();
    const end = this.reader.position + size;
    const value = this.readExtended();
    this.reader.position = end;
    return value;
  }

  private readExtended(): WzNode {
    const kind = this.readStringBlock();
    if (kind === 'Property') {
      this.reader.readUInt16();
      return this.readPropertyList();
    }
    if (kind === 'Canvas') return this.readCanvas();
    if (kind === 'Shape2D#Vector2D') return { __vector: [this.reader.readCompressedInt(), this.reader.readCompressedInt()] };
    if (kind === 'UOL') {
      this.reader.readByte();
      return { __uol: this.readStringBlock() };
    }
    if (kind === 'Shape2D#Convex2D') {
      const count = this.reader.readCompressedInt();
      const points: WzNode = {};
      for (let index = 0; index < count; index++) points[String(index)] = this.readExtended();
      return points;
    }
    return {};
  }

  private readCanvas(): WzNode {
    this.reader.readByte();
    const hasChildren = this.reader.readByte() === 1;
    let children: WzNode = {};
    if (hasChildren) {
      this.reader.readUInt16();
      children = this.readPropertyList();
    }
    const width = this.reader.readCompressedInt();
    const height = this.reader.readCompressedInt();
    const format = this.reader.readCompressedInt();
    const scale = this.reader.readByte();
    this.reader.position += 4;
    const dataLength = this.reader.readInt32() - 1;
    this.reader.position += 1;
    return { ...children, __canvas: { width, height, format, scale, dataOffset: this.reader.position, dataLength } };
  }
}
