import type { SpawnPoint } from '../data/types';

export const RESPAWN_TICK_SECONDS = 7.56;
export const POINT_COOLDOWN_SECONDS = 5;
const AVERAGE_WAIT_SECONDS = POINT_COOLDOWN_SECONDS + RESPAWN_TICK_SECONDS / 2;

export function capacityScale(players: number): number {
  return Math.min(1, 0.75 + 0.05 * (Math.max(1, players) - 1));
}

export function aliveAtOnce(spawnPoints: number, players: number): number {
  return Math.floor(spawnPoints * capacityScale(players));
}

export function spawnsPerHour(spawns: SpawnPoint[], players: number): number {
  const regular = spawns.filter((spawn) => spawn.respawnSeconds <= 0).length;
  const timed = spawns.filter((spawn) => spawn.respawnSeconds > 0);
  const regularSupply = aliveAtOnce(regular, players) * 3600 / AVERAGE_WAIT_SECONDS;
  const timedSupply = timed.reduce((total, spawn) => total + 3600 / Math.max(spawn.respawnSeconds + RESPAWN_TICK_SECONDS / 2, RESPAWN_TICK_SECONDS), 0);
  return regularSupply + timedSupply;
}
