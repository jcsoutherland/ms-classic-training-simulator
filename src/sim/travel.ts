import type { SpawnPoint } from '../data/types';
import { climbPixelsPerSecond, walkPixelsPerSecond } from './attackTime';

const SAME_PLATFORM_HEIGHT = 60;

export interface SpawnGroup {
  x: number;
  y: number;
  points: number;
}

export function groupSpawns(spawns: SpawnPoint[], reach: number): SpawnGroup[] {
  const sorted = [...spawns].sort((a, b) => a.y - b.y || a.x - b.x);
  const groups: { xs: number[]; y: number }[] = [];
  for (const spawn of sorted) {
    const group = groups.find((candidate) => Math.abs(candidate.y - spawn.y) <= SAME_PLATFORM_HEIGHT
      && Math.abs(average(candidate.xs) - spawn.x) <= reach * 2);
    if (group) group.xs.push(spawn.x);
    else groups.push({ xs: [spawn.x], y: spawn.y });
  }
  return groups.map((group) => ({ x: average(group.xs), y: group.y, points: group.xs.length }));
}

export function secondsBetweenGroups(groups: SpawnGroup[], speedPercent: number): number {
  if (groups.length < 2) return 0;
  const walk = walkPixelsPerSecond(speedPercent);
  const climb = climbPixelsPerSecond(speedPercent);
  const nearest = groups.map((group) => Math.min(...groups
    .filter((other) => other !== group)
    .map((other) => Math.abs(other.x - group.x) / walk + Math.abs(other.y - group.y) / climb)));
  return average(nearest);
}

function average(values: number[]): number {
  return values.reduce((total, value) => total + value, 0) / values.length;
}
