import fs from 'node:fs';
import path from 'node:path';
import type { Item, Monster } from '../../src/data/types';

export function normalizeName(name: string): string {
  return name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '');
}

const SCROLL_TIERS: Record<string, string> = { 10: 'Greater', 60: 'Intermediate', 100: 'Lesser' };
const SCROLL_SLOTS: Record<string, string> = { Helmet: 'Hat', 'One-Handed BW': 'One-Handed Blunt Weapon', 'Two-handed BW': 'Two-handed Blunt Weapon', 'Pole Arm': 'Polearm', 'Pet Equip.': 'Pet Equip' };
const SCROLL_STATS: Record<string, string> = { ATT: 'Attack', 'Magic Att.': 'Magic Attack' };

export function classicScrollName(osmlibName: string): string | null {
  const match = osmlibName.match(/^Scroll for (.+?) for (.+?) (\d+)%$/i);
  const tier = match ? SCROLL_TIERS[match[3]] : undefined;
  if (!match || !tier) return null;
  return `${SCROLL_SLOTS[match[1]] ?? match[1]} ${SCROLL_STATS[match[2]] ?? match[2]} Scroll: ${tier}`;
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
