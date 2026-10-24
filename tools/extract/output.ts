import fs from 'node:fs';
import path from 'node:path';
import type { Animations } from '../../src/data/types';
import type { Sprite } from './gameFiles';
import { writePng } from './image/encode';

export class Output {
  constructor(readonly root: string) {
    fs.mkdirSync(root, { recursive: true });
  }

  json(relativePath: string, value: unknown): void {
    const target = path.join(this.root, relativePath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, JSON.stringify(value));
  }

  readJson<T>(relativePath: string): T | null {
    const target = path.join(this.root, relativePath);
    if (!fs.existsSync(target)) return null;
    return JSON.parse(fs.readFileSync(target, 'utf8')) as T;
  }

  sprite(relativePath: string, sprite: Sprite): void {
    writePng(path.join(this.root, relativePath), sprite.bitmap);
  }

  frames(folder: string, prefix: string, sprites: Sprite[]): Animations[string] {
    sprites.forEach((sprite, index) => this.sprite(`${folder}/${prefix}-${index}.png`, sprite));
    return sprites.map((sprite) => ({
      width: sprite.bitmap.width, height: sprite.bitmap.height, originX: sprite.originX, originY: sprite.originY, delay: sprite.delay,
    }));
  }

  path(relativePath: string): string {
    return path.join(this.root, relativePath);
  }
}

export function logStep(message: string): void {
  process.stdout.write(`${new Date().toLocaleTimeString()}  ${message}\n`);
}
