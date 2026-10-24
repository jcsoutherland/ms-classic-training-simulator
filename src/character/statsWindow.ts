import type { Stat } from '../data/types';
import { masteryFraction } from '../sim/damage';
import { branchOf } from './jobs';

const WINDOW_MULTIPLIER: Record<number, number> = {
  30: 1.8, 31: 1.8, 32: 1.8, 33: 1.5, 37: 1.8, 38: 1.8,
  40: 2.5, 41: 2.5, 42: 2.5, 43: 2.5, 44: 2.5, 45: 2.5, 46: 2.5, 47: 2.5,
};

export const SKILL_MULTIPLIER: Record<string, { multiplier: number; mastery?: number }> = {
  'Lucky Seven': { multiplier: 3.0, mastery: 0.5 },
  Drain: { multiplier: 2.5 },
};

export interface StatPair {
  primary: number;
  secondary: number;
}

export function statPair(weaponType: number, stats: Record<Stat, number>): StatPair {
  if (weaponType === 45 || weaponType === 46) return { primary: stats.DEX, secondary: stats.STR };
  if (weaponType === 33 || weaponType === 47) return { primary: stats.LUK, secondary: stats.STR + stats.DEX };
  return { primary: stats.STR, secondary: stats.DEX };
}

export function windowMultiplier(weaponType: number): number {
  return WINDOW_MULTIPLIER[weaponType] ?? 1.8;
}

export function statsWindowRange(weaponType: number, stats: Record<Stat, number>, totalAttack: number, masteryLevel: number): { min: number; max: number } {
  const { primary, secondary } = statPair(weaponType, stats);
  const multiplier = windowMultiplier(weaponType);
  const mastery = masteryFraction(masteryLevel);
  return {
    min: Math.floor(totalAttack * (0.8 + (primary * mastery * multiplier + secondary) / 100)),
    max: Math.floor(totalAttack * (1 + (primary * multiplier + secondary) / 100)),
  };
}

export function skillMultiplierScale(skillName: string, weaponType: number, stats: Record<Stat, number>): number {
  const special = SKILL_MULTIPLIER[skillName];
  if (!special) return 1;
  const { primary, secondary } = statPair(weaponType, stats);
  const window = 1 + (primary * windowMultiplier(weaponType) + secondary) / 100;
  return (1 + (primary * special.multiplier + secondary) / 100) / window;
}

export function accuracyFor(jobId: number, stats: Record<Stat, number>, level: number): number {
  const common = 1.2 * stats.DEX + 2 * level + 0.6 * stats.LUK;
  switch (branchOf(jobId)) {
    case 100: return Math.floor(common / 2.5 + 10);
    case 200: return Math.floor((1.2 * stats.INT + 2 * level + 0.6 * stats.LUK) / 5.1 + 20);
    case 300: return Math.floor(common / 4.8 + 20);
    case 400: return Math.floor(common / 4 + 15);
    default: return Math.floor(common / 2.5 + 5);
  }
}

export function avoidFor(stats: Record<Stat, number>): number {
  return Math.floor(stats.LUK / 3) + Math.floor(stats.DEX / 6) + 5;
}
