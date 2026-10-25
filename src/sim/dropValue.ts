import type { DropTables, Item } from '../data/types';
import { LOOT_SHARE } from './roaming';

const SCROLL_TIERS: Record<string, number> = { Intermediate: 1000, Chaos: 600, Greater: 300, Lesser: 100 };
const SCROLL_STATS: [pattern: RegExp, weight: number][] = [
  [/ Magic Attack Scroll/, 0.9], [/ Attack Scroll/, 1], [/ Crit\. /, 0.8], [/ LUK Scroll/, 0.7], [/ INT Scroll/, 0.6], [/ DEX Scroll/, 0.5], [/ STR Scroll/, 0.4],
];
const OTHER_STAT = 0.15;
const SCROLL_SLOTS: [pattern: RegExp, weight: number][] = [
  [/^Gloves /, 1], [/^(One-Handed|Two-handed|Dagger|Wand|Staff|Spear|Polearm|Bow|Crossbow|Claw) /, 0.9], [/^Earring /, 0.8], [/^Overall /, 0.7],
];
const OTHER_SLOT = 0.5;
const STAR_VALUE_PER_ATTACK = 50 / 27;
const GEAR_BASE = 30;
const GEAR_TOP_LEVEL = 70;
const MAIN_STAT_BONUS = 1.5;
const CLASS_DEMAND: [jobBit: number, demand: number, mainStat: 'LUK' | 'INT' | 'DEX' | 'STR'][] = [[8, 1, 'LUK'], [2, 0.85, 'INT'], [4, 0.7, 'DEX'], [1, 0.55, 'STR']];
const ANY_CLASS_DEMAND = 0.6;

export function itemValue(item: Item): number {
  if (item.quest) return 0;
  const scroll = item.name.match(/ Scroll: (Lesser|Intermediate|Greater|Chaos)\s*$/);
  if (scroll) return SCROLL_TIERS[scroll[1]] * weightFor(item.name, SCROLL_STATS, OTHER_STAT) * weightFor(item.name, SCROLL_SLOTS, OTHER_SLOT);
  if (Math.floor(item.id / 10000) === 207) return (item.bonus?.attack ?? 0) * STAR_VALUE_PER_ATTACK;
  if (item.category === 'equip') return gearValue(item);
  return 0;
}

export function dropValuePerHour(killsByMonster: Map<number, number>, drops: DropTables, items: Map<number, Item>): number {
  let total = 0;
  for (const [monsterId, kills] of killsByMonster) {
    for (const drop of drops[monsterId] ?? []) {
      const item = items.get(drop.itemId);
      if (item) total += kills * LOOT_SHARE * drop.chance * itemValue(item);
    }
  }
  return total;
}

function gearValue(item: Item): number {
  const level = Math.min(1, (item.requiredLevel ?? 0) / GEAR_TOP_LEVEL);
  const demand = CLASS_DEMAND.find(([bit]) => ((item.requiredJobs ?? 0) & bit) !== 0);
  const isEarring = Math.floor(item.id / 10000) === 103;
  const hasMainStat = isEarring ? (item.bonus?.critDamage ?? 0) > 0 : demand ? (item.bonus?.[demand[2]] ?? 0) > 0 : false;
  return GEAR_BASE * level * (demand?.[1] ?? ANY_CLASS_DEMAND) * (hasMainStat ? MAIN_STAT_BONUS : 1);
}

function weightFor(name: string, table: [RegExp, number][], fallback: number): number {
  return table.find(([pattern]) => pattern.test(name))?.[1] ?? fallback;
}
