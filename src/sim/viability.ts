import type { MapSummary, Monster } from '../data/types';
import { VIABLE_HIT_CHANCE } from './accuracy';

export const TOO_EASY_LEVEL_GAP = 20;

export type Viability =
  | { viable: true }
  | { viable: false; reason: 'too-easy'; mainLevel: number }
  | { viable: false; reason: 'too-hard'; monster: Monster; hitChance: number }
  | { viable: false; reason: 'no-data' };

export function assessMap(
  map: MapSummary,
  monsters: Map<number, Monster>,
  playerLevel: number,
  hitChanceAgainst: (monster: Monster) => number,
): Viability {
  const present = map.spawnCounts
    .map(([id, points]) => ({ monster: monsters.get(id), points }))
    .filter((entry): entry is { monster: Monster; points: number } => entry.monster !== undefined);
  if (present.length === 0) return { viable: false, reason: 'no-data' };
  for (const { monster } of present) {
    const chance = hitChanceAgainst(monster);
    if (chance < VIABLE_HIT_CHANCE) return { viable: false, reason: 'too-hard', monster, hitChance: chance };
  }
  const totalPoints = present.reduce((sum, entry) => sum + entry.points, 0);
  const easyPoints = present.filter((entry) => entry.monster.level <= playerLevel - TOO_EASY_LEVEL_GAP).reduce((sum, entry) => sum + entry.points, 0);
  if (easyPoints * 2 > totalPoints) return { viable: false, reason: 'too-easy', mainLevel: majorityLevel(present) };
  return { viable: true };
}

function majorityLevel(present: { monster: Monster; points: number }[]): number {
  return [...present].sort((a, b) => b.points - a.points)[0].monster.level;
}
