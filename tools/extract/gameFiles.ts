import fs from 'node:fs';
import path from 'node:path';
import { decodeCanvas, type Bitmap } from './image/canvas';
import { openPack, readPackImage, packImageNames, type MsPack } from './ms/pack';
import type { CanvasInfo, WzNode } from './wz/image';
import { imageNames, openPackage, readPackageImage, type WzPackage } from './wz/package';

export const DEFAULT_GAME_DATA = 'C:/Program Files (x86)/Steam/steamapps/common/MapleStory/MSCW/Data';

export interface LoadedImage {
  buffer: Buffer;
  root: WzNode;
}

export interface Sprite {
  bitmap: Bitmap;
  originX: number;
  originY: number;
  delay: number;
  z: number;
}

export class GameFiles {
  private readonly packages = new Map<string, WzPackage>();
  private readonly packs = new Map<string, MsPack>();
  private readonly images = new Map<string, LoadedImage>();
  private bitmaps = new Map<Buffer, Map<number, Bitmap>>();

  clearBitmaps(): void {
    this.bitmaps = new Map();
  }

  constructor(readonly dataRoot = DEFAULT_GAME_DATA) {
    if (!fs.existsSync(path.join(dataRoot, 'String'))) {
      throw new Error(`Couldn't find the Classic World game data at ${dataRoot}. Pass the MSCW/Data folder as the first argument.`);
    }
  }

  packageImageNames(file: string): string[] {
    return imageNames(this.package(file));
  }

  hasImage(file: string, name: string): boolean {
    return this.package(file).images.has(name);
  }

  packImageNames(packFile: string): string[] {
    return packImageNames(this.pack(packFile));
  }

  image(file: string, name: string): LoadedImage {
    const key = `${file}|${name}`;
    const cached = this.images.get(key);
    if (cached) return cached;
    const loaded = file.endsWith('.ms') ? readPackImage(this.pack(file), name) : this.readWzImage(file, name);
    this.images.set(key, loaded);
    return loaded;
  }

  sprite(source: LoadedImage, node: unknown): Sprite | null {
    const target = this.followLinks(source, node);
    if (!target || !target.node.__canvas || target.node.__canvas.width < 2) return null;
    const canvasNode = node as WzNode;
    return {
      bitmap: this.bitmap(target.buffer, target.node.__canvas),
      originX: vector(canvasNode.origin)?.[0] ?? 0,
      originY: vector(canvasNode.origin)?.[1] ?? 0,
      delay: typeof canvasNode.delay === 'number' ? canvasNode.delay : 100,
      z: typeof canvasNode.z === 'number' ? canvasNode.z : 0,
    };
  }

  private bitmap(buffer: Buffer, canvas: CanvasInfo): Bitmap {
    let cache = this.bitmaps.get(buffer);
    if (!cache) {
      cache = new Map();
      this.bitmaps.set(buffer, cache);
    }
    let bitmap = cache.get(canvas.dataOffset);
    if (!bitmap) {
      bitmap = decodeCanvas(buffer, canvas);
      cache.set(canvas.dataOffset, bitmap);
    }
    return bitmap;
  }

  private followLinks(source: LoadedImage, value: unknown): { buffer: Buffer; node: WzNode } | null {
    if (!isNode(value)) return null;
    const node = value;
    if (typeof node._inlink === 'string') {
      const target = walk(source.root, node._inlink.split('/'));
      return target ? { buffer: source.buffer, node: target } : null;
    }
    if (typeof node._outlink === 'string') {
      const parts = node._outlink.split('/');
      const imageIndex = parts.findIndex((part) => part.endsWith('.img'));
      const canvasFile = `${parts.slice(0, imageIndex).join('/')}/_Canvas_000.wz`;
      const linked = this.image(canvasFile, parts[imageIndex]);
      const target = walk(linked.root, parts.slice(imageIndex + 1));
      return target ? { buffer: linked.buffer, node: target } : null;
    }
    return { buffer: source.buffer, node };
  }

  private readWzImage(file: string, name: string): LoadedImage {
    const wzPackage = this.package(file);
    return { buffer: wzPackage.buffer, root: readPackageImage(wzPackage, name) };
  }

  private package(file: string): WzPackage {
    let wzPackage = this.packages.get(file);
    if (!wzPackage) {
      wzPackage = openPackage(path.join(this.dataRoot, file));
      this.packages.set(file, wzPackage);
    }
    return wzPackage;
  }

  private pack(file: string): MsPack {
    let pack = this.packs.get(file);
    if (!pack) {
      pack = openPack(path.join(this.dataRoot, file));
      this.packs.set(file, pack);
    }
    return pack;
  }
}

export function isNode(value: unknown): value is WzNode {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function walk(root: unknown, parts: string[]): WzNode | null {
  let current: unknown = root;
  for (const part of parts) {
    if (!isNode(current)) return null;
    current = current[part];
  }
  return isNode(current) ? current : null;
}

export function vector(value: unknown): [number, number] | null {
  return isNode(value) && value.__vector ? value.__vector : null;
}

export function numberOf(value: unknown): number | undefined {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) return Number(value);
  return undefined;
}

export function childNodes(node: unknown): [string, WzNode][] {
  if (!isNode(node)) return [];
  return Object.entries(node).filter((entry): entry is [string, WzNode] => isNode(entry[1]) && !entry[0].startsWith('__'));
}
