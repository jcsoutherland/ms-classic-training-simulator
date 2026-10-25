import type { SpawnPoint } from '../data/types';
import { climbPixelsPerSecond, walkPixelsPerSecond } from './attackTime';

const SAME_PLATFORM_HEIGHT = 60;

export interface SpawnGroup {
  x: number;
  y: number;
  points: number;
  spawns: SpawnPoint[];
}

export function groupSpawns(spawns: SpawnPoint[], reach: number): SpawnGroup[] {
  const sorted = [...spawns].sort((a, b) => a.y - b.y || a.x - b.x);
  const groups: { members: SpawnPoint[]; y: number }[] = [];
  for (const spawn of sorted) {
    const group = groups.find((candidate) => Math.abs(candidate.y - spawn.y) <= SAME_PLATFORM_HEIGHT
      && Math.abs(average(candidate.members.map((member) => member.x)) - spawn.x) <= reach * 2);
    if (group) group.members.push(spawn);
    else groups.push({ members: [spawn], y: spawn.y });
  }
  return groups.map((group) => ({ x: average(group.members.map((member) => member.x)), y: group.y, points: group.members.length, spawns: group.members }));
}

export function campedGroups(groups: SpawnGroup[], targetId: number): SpawnGroup[] {
  const targetCount = (group: SpawnGroup) => group.spawns.filter((spawn) => spawn.mobId === targetId).length;
  const majority = groups.filter((group) => targetCount(group) * 2 > group.points);
  return majority.length ? majority : groups.filter((group) => targetCount(group) > 0);
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
