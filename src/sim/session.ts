import { expToReach, levelAfter, type LevelProgress } from './exp';
import type { MapSimulation } from './simulateMap';

export const MIN_HOURS = 0.5;
export const MAX_HOURS = 1000;

export type SessionLength = { kind: 'hours'; hours: number } | { kind: 'goal'; goalLevel: number };

export interface Session {
  hours: number;
  kills: number;
  killsByMonster: Map<number, number>;
  exp: number;
  mesos: number;
  reached: LevelProgress;
}

export function tidyHours(typed: number): number {
  if (!Number.isFinite(typed)) return MIN_HOURS;
  return Math.min(MAX_HOURS, Math.max(MIN_HOURS, Math.round(typed * 2) / 2));
}

export function sessionHours(length: SessionLength, simulation: MapSimulation, level: number, expPercent: number): number {
  if (length.kind === 'hours') return tidyHours(length.hours);
  if (simulation.expPerHour <= 0) return Infinity;
  return expToReach(level, expPercent, length.goalLevel) / simulation.expPerHour;
}

export function buildSession(simulation: MapSimulation, hours: number, level: number, expPercent: number): Session {
  const exp = simulation.expPerHour * hours;
  return {
    hours,
    kills: simulation.killsPerHour * hours,
    killsByMonster: new Map([...simulation.killsByMonster].map(([id, kills]) => [id, kills * hours])),
    exp,
    mesos: simulation.mesosPerHour * hours,
    reached: levelAfter(level, expPercent, exp),
  };
}
