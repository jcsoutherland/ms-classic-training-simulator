import fs from 'node:fs';
import path from 'node:path';
import type { Item, Monster } from '../../src/data/types';

export function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, ' ').trim();
}

export function decodeHtml(text: string): string {
  return text.replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

export interface ClassicNames {
  monsters: Monster[];
  items: Item[];
  itemIdsByName: Map<string, number>;
}

export function loadClassicNames(dataRoot: string): ClassicNames {
  const monsters = JSON.parse(fs.readFileSync(path.join(dataRoot, 'mobs.json'), 'utf8')) as Monster[];
  const items = JSON.parse(fs.readFileSync(path.join(dataRoot, 'items.json'), 'utf8')) as Item[];
  const itemIdsByName = new Map<string, number>();
  for (const item of items) {
    const key = normalizeName(item.name);
    if (!itemIdsByName.has(key)) itemIdsByName.set(key, item.id);
  }
  return { monsters, items, itemIdsByName };
}
