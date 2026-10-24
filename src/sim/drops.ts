import type { DropEntry } from '../data/types';

const POISSON_LIMIT = 40;

export type Random = () => number;

export function seededRandom(seed: number): Random {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function seedFromText(text: string): number {
  let hash = 2166136261;
  for (const character of text) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619) >>> 0;
  return hash;
}

export function chanceOfAtLeastOne(tries: number, chance: number): number {
  return 1 - Math.pow(1 - chance, tries);
}

export function rollCount(tries: number, chance: number, random: Random): number {
  const mean = tries * chance;
  if (mean <= 0) return 0;
  if (mean < POISSON_LIMIT) return poisson(mean, random);
  const deviation = Math.sqrt(mean * (1 - chance));
  return Math.max(0, Math.round(mean + deviation * gaussian(random)));
}

export interface RolledDrop {
  itemId: number;
  count: number;
  expected: number;
  chanceOfOne: number;
}

export function rollDrops(killsByMonster: Map<number, number>, tables: Record<number, DropEntry[]>, random: Random): RolledDrop[] {
  const byItem = new Map<number, RolledDrop>();
  for (const [monsterId, kills] of killsByMonster) {
    for (const entry of tables[monsterId] ?? []) {
      const stack = entry.min !== undefined && entry.max !== undefined ? (entry.min + entry.max) / 2 : 1;
      const drops = rollCount(kills, entry.chance, random);
      const existing = byItem.get(entry.itemId) ?? { itemId: entry.itemId, count: 0, expected: 0, chanceOfOne: 0 };
      existing.count += Math.round(drops * stack);
      existing.expected += kills * entry.chance * stack;
      existing.chanceOfOne = 1 - (1 - existing.chanceOfOne) * (1 - chanceOfAtLeastOne(kills, entry.chance));
      byItem.set(entry.itemId, existing);
    }
  }
  return [...byItem.values()].sort((a, b) => b.count - a.count || b.expected - a.expected);
}

function poisson(mean: number, random: Random): number {
  const limit = Math.exp(-mean);
  let count = 0;
  let product = random();
  while (product > limit) {
    count++;
    product *= random();
  }
  return count;
}

function gaussian(random: Random): number {
  return Math.sqrt(-2 * Math.log(1 - random())) * Math.cos(2 * Math.PI * random());
}
