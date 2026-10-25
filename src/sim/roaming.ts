import type { SpawnPoint } from '../data/types';
import { seededRandom, type Random } from './drops';
import { sameFloor, type RouteTable } from './routes';
import { capacityScale, POINT_COOLDOWN_SECONDS, RESPAWN_TICK_SECONDS } from './spawns';

export const LOOT_SHARE = 0.85;
export const PICKUP_SECONDS = 0.3;
const WARM_UP_SECONDS = 60;
const MEASURED_SECONDS = 15 * 60;

export interface RoamingPlan {
  points: SpawnPoint[];
  routes: RouteTable;
  players: number;
  walkSpeed: number;
  attemptsToKill: Map<number, number>;
  castSeconds: number;
  targetsPerCast: number;
  hitWidth: number;
  reach: number;
  mainTarget: number | null;
  wanderingMonsters: Set<number>;
  seed: number;
  measuredSeconds?: number;
}

export interface RoamingResult {
  killsPerHour: Map<number, number>;
  idleShare: number;
}

interface Player {
  freeAt: number;
  at: number;
  x: number;
  pending: number[];
  idle: number;
}

interface Choice {
  target: number;
  travel: number;
  standX: number;
}

export function simulateRoaming(plan: RoamingPlan): RoamingResult {
  const random = seededRandom(plan.seed);
  const capacity = Math.floor(plan.points.length * capacityScale(plan.players));
  const alive = new Set<number>();
  const claimed = new Set<number>();
  const readyAt = new Array<number>(plan.points.length).fill(0);
  const kills = new Map<number, number>();
  const positions = plan.points.map((spawn) => spawn.x);
  const players: Player[] = Array.from({ length: plan.players }, (_, index) => {
    const at = Math.floor(index * plan.points.length / plan.players);
    return { freeAt: 0, at, x: plan.points[at]?.x ?? 0, pending: [], idle: 0 };
  });
  refill(plan, alive, readyAt, capacity, 0, random);
  wander(plan, alive, claimed, positions, random);
  const measured = plan.measuredSeconds ?? MEASURED_SECONDS;
  const end = WARM_UP_SECONDS + measured;
  let nextTick = RESPAWN_TICK_SECONDS;
  for (;;) {
    const player = players.reduce((soonest, candidate) => (candidate.freeAt < soonest.freeAt ? candidate : soonest));
    const now = Math.min(player.freeAt, nextTick);
    if (now >= end) break;
    if (nextTick <= player.freeAt) {
      refill(plan, alive, readyAt, capacity, nextTick, random);
      wander(plan, alive, claimed, positions, random);
      nextTick += RESPAWN_TICK_SECONDS;
      continue;
    }
    finishKills(plan, player, now, alive, claimed, readyAt, kills, now >= WARM_UP_SECONDS);
    const choice = chooseTarget(plan, player, alive, claimed, positions);
    if (!choice) {
      if (now >= WARM_UP_SECONDS) player.idle += nextTick - now;
      player.freeAt = nextTick;
      continue;
    }
    startKills(plan, player, now, choice, alive, claimed, positions);
  }
  const perHour = 3600 / measured;
  const idle = players.reduce((total, candidate) => total + candidate.idle, 0) / (measured * plan.players);
  return { killsPerHour: new Map([...kills].map(([id, count]) => [id, count * perHour])), idleShare: idle };
}

function refill(plan: RoamingPlan, alive: Set<number>, readyAt: number[], capacity: number, now: number, random: Random): void {
  const free = plan.points.map((_, index) => index).filter((index) => !alive.has(index) && readyAt[index] <= now);
  while (alive.size < capacity && free.length > 0) alive.add(free.splice(Math.floor(random() * free.length), 1)[0]);
}

function wander(plan: RoamingPlan, alive: Set<number>, claimed: Set<number>, positions: number[], random: Random): void {
  for (const index of alive) {
    const spawn = plan.points[index];
    if (claimed.has(index) || !plan.wanderingMonsters.has(spawn.mobId)) continue;
    positions[index] = spawn.wanderLeft + random() * Math.max(0, spawn.wanderRight - spawn.wanderLeft);
  }
}

function finishKills(plan: RoamingPlan, player: Player, now: number, alive: Set<number>, claimed: Set<number>, readyAt: number[], kills: Map<number, number>, counted: boolean): void {
  for (const index of player.pending) {
    alive.delete(index);
    claimed.delete(index);
    readyAt[index] = now + POINT_COOLDOWN_SECONDS;
    if (counted) kills.set(plan.points[index].mobId, (kills.get(plan.points[index].mobId) ?? 0) + 1);
  }
  player.pending = [];
}

function chooseTarget(plan: RoamingPlan, player: Player, alive: Set<number>, claimed: Set<number>, positions: number[]): Choice | null {
  let main: Choice | null = null;
  let inTheWay: Choice | null = null;
  const here = { x: player.x, y: plan.points[player.at].y };
  for (const index of alive) {
    if (claimed.has(index)) continue;
    const spawn = plan.points[index];
    if (!plan.attemptsToKill.has(spawn.mobId)) continue;
    const x = positions[index];
    const choice = sameFloor(here, spawn) ? walkWithinReach(plan, player.x, index, x) : { target: index, travel: plan.routes.seconds(player.at, index) + Math.abs(x - spawn.x) / plan.walkSpeed, standX: x };
    const isMain = plan.mainTarget === null || spawn.mobId === plan.mainTarget;
    if (isMain && (!main || choice.travel < main.travel)) main = choice;
    if (!isMain && choice.travel === 0 && !inTheWay) inTheWay = choice;
  }
  if (main && main.travel === 0) return main;
  return inTheWay ?? main;
}

function walkWithinReach(plan: RoamingPlan, fromX: number, target: number, targetX: number): Choice {
  const gap = targetX - fromX;
  const walk = Math.max(0, Math.abs(gap) - plan.reach);
  return { target, travel: walk / plan.walkSpeed, standX: fromX + Math.sign(gap) * walk };
}

function startKills(plan: RoamingPlan, player: Player, now: number, choice: Choice, alive: Set<number>, claimed: Set<number>, positions: number[]): void {
  const target = plan.points[choice.target];
  const targetX = positions[choice.target];
  const caught = [choice.target];
  for (const index of alive) {
    if (caught.length >= plan.targetsPerCast) break;
    if (claimed.has(index) || index === choice.target) continue;
    const other = plan.points[index];
    if (!plan.attemptsToKill.has(other.mobId)) continue;
    if (sameFloor(target, other) && Math.abs(positions[index] - targetX) <= plan.hitWidth) caught.push(index);
  }
  for (const index of caught) claimed.add(index);
  const attempts = Math.max(...caught.map((index) => plan.attemptsToKill.get(plan.points[index].mobId) ?? 1));
  const loot = LOOT_SHARE * (Math.abs(targetX - choice.standX) / plan.walkSpeed + PICKUP_SECONDS * caught.length);
  player.pending = caught;
  player.at = choice.target;
  player.x = targetX;
  player.freeAt = now + choice.travel + attempts * plan.castSeconds + loot;
}
