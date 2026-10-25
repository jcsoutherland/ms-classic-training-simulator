import type { Character } from '../character/types';
import { jobLine, type GameData } from '../data/gameData';
import type { MapDetail, Monster, Skill } from '../data/types';
import { hitChance } from './accuracy';
import { averageDamagePerTarget, characterAttacks, damagePerTarget, healAttack, type Attack } from './attacks';
import { buffTotals, learnedLevel, usableWithWeapon, type BuffTotals } from './buffs';
import { climbPixelsPerSecond, walkPixelsPerSecond } from './attackTime';
import { averagePhysicalHit, expectedHitsToKill } from './damage';
import { seedFromText } from './drops';
import { expPerMember } from './party';
import { LOOT_SHARE, simulateRoaming } from './roaming';
import { routeTable, type RouteTable } from './routes';

const BASE_SPEED = 100;
export const MESO_DROP_CHANCE = 0.67;

export interface MapSimulation {
  mapId: string;
  players: number;
  killsPerHour: number;
  killsByMonster: Map<number, number>;
  expPerHour: number;
  mesosPerHour: number;
  limitedBy: 'killing' | 'respawns';
  hitChances: Map<number, number>;
  mainTarget: number | null;
}

const routeCache = new WeakMap<MapDetail, Map<number, RouteTable>>();

export function characterSkills(character: Character, data: GameData): Skill[] {
  const line = jobLine(character.jobId);
  return data.jobs.filter((job) => line.includes(job.id)).flatMap((job) => job.skills);
}

export function effectiveAccuracy(character: Character, data: GameData): number {
  return character.accuracy + buffTotals(character, characterSkills(character, data)).accuracyBonus;
}

export function attacksToDefeat(character: Character, data: GameData, monster: Monster): number {
  const skills = characterSkills(character, data);
  const buffs = buffTotals(character, skills);
  const [main] = characterAttacks(character, skills, data.actions).sort((a, b) => b.share - a.share);
  const damage = main ? averageDamagePerTarget(main, character, monster, buffs) : 0;
  return damage > 0 ? Math.max(1, Math.ceil(monster.hp / damage)) : Infinity;
}

export function simulateMap(character: Character, data: GameData, detail: MapDetail, players: number): MapSimulation {
  const skills = characterSkills(character, data);
  const buffs = buffTotals(character, skills);
  const attacks = characterAttacks(character, skills, data.actions);
  const accuracy = character.accuracy + buffs.accuracyBonus;
  const present = [...new Set(detail.spawns.map((spawn) => spawn.mobId))]
    .map((id) => data.monsters.get(id))
    .filter((monster): monster is Monster => monster !== undefined);
  const hitChances = new Map(present.map((monster) => [monster.id, hitChance(accuracy, character.level, monster.level, monster.avoid)]));
  const bonusPerTarget = finalAttackBonus(character, skills, buffs);
  const styleOf = (chosen: Attack[]): FightingStyle => {
    const attemptsToKill = new Map<number, number>();
    for (const monster of present) {
      const attempts = attemptsFor(chosen, character, monster, buffs, bonusPerTarget, hitChances.get(monster.id) ?? 0);
      if (Number.isFinite(attempts)) attemptsToKill.set(monster.id, attempts);
    }
    const main = [...chosen].sort((a, b) => b.share - a.share)[0];
    const castSeconds = chosen.reduce((total, attack) => total + attack.share * attack.milliseconds, 0) / 1000;
    return { attemptsToKill, castSeconds, targetsPerCast: main.targets, hitWidth: main.hitWidth, reach: main.reach };
  };
  const heal = healAttack(character, skills, data.actions);
  const styles = heal ? [styleOf(attacks), styleOf([heal])] : [styleOf(attacks)];
  const points = detail.spawns.filter((spawn) => spawn.respawnSeconds <= 0);
  const speed = BASE_SPEED + buffs.movementBonus;
  const wanderingMonsters = new Set(present.filter((monster) => monster.moves).map((monster) => monster.id));
  const common = { points, routes: routesFor(detail, points, speed), players, walkSpeed: walkPixelsPerSecond(speed), wanderingMonsters, seed: seedFromText(detail.id) };
  const outcome = (style: FightingStyle, mainTarget: number | null): MapSimulation => {
    const roaming = simulateRoaming({ ...common, ...style, mainTarget });
    const killsByMonster = roaming.killsPerHour;
    return {
      mapId: detail.id,
      players,
      killsPerHour: [...killsByMonster.values()].reduce((total, kills) => total + kills, 0),
      killsByMonster,
      expPerHour: sumOverMonsters(killsByMonster, (id) => expPerMember(data.monsters.get(id)?.exp ?? 0, players)),
      mesosPerHour: sumOverMonsters(killsByMonster, (id) => averageMesos(data, id)) / players,
      limitedBy: roaming.idleShare > 0.2 ? 'respawns' : 'killing',
      hitChances,
      mainTarget,
    };
  };
  const nothing: MapSimulation = { mapId: detail.id, players, killsPerHour: 0, killsByMonster: new Map(), expPerHour: 0, mesosPerHour: 0, limitedBy: 'respawns', hitChances, mainTarget: null };
  if (!points.length) return nothing;
  const options = styles.flatMap((style) => [...style.attemptsToKill.keys()].map((target) => outcome(style, target)));
  if (!options.length) return nothing;
  const best = options.reduce((chosen, option) => (option.expPerHour > chosen.expPerHour ? option : chosen));
  return { ...best, mainTarget: mostDefeated(best.killsByMonster) };
}

interface FightingStyle {
  attemptsToKill: Map<number, number>;
  castSeconds: number;
  targetsPerCast: number;
  hitWidth: number;
  reach: number;
}

function routesFor(detail: MapDetail, points: MapDetail['spawns'], speed: number): RouteTable {
  const bySpeed = routeCache.get(detail) ?? new Map<number, RouteTable>();
  routeCache.set(detail, bySpeed);
  const cached = bySpeed.get(speed);
  if (cached) return cached;
  const table = routeTable(points, detail.ropes, walkPixelsPerSecond(speed), climbPixelsPerSecond(speed));
  bySpeed.set(speed, table);
  return table;
}

function attemptsFor(attacks: Attack[], character: Character, monster: Monster, buffs: BuffTotals, bonusPerTarget: number, chance: number): number {
  if (chance <= 0) return Infinity;
  let attempts = 0;
  for (const attack of attacks) {
    const range = damagePerTarget(attack, character, monster, buffs);
    const bonus = attack.magic ? 0 : bonusPerTarget;
    const hits = expectedHitsToKill(monster.hp, range.lowest + bonus, range.highest + bonus);
    if (!Number.isFinite(hits)) return Infinity;
    attempts += attack.share * hits;
  }
  return attempts / chance;
}

function mostDefeated(killsByMonster: Map<number, number>): number | null {
  const [top] = [...killsByMonster].sort((a, b) => b[1] - a[1]);
  return top?.[0] ?? null;
}

function finalAttackBonus(character: Character, skills: Skill[], buffs: BuffTotals): number {
  const finalAttack = skills.find((skill) => /^Final Attack/.test(skill.name) && learnedLevel(character, skill) && usableWithWeapon(skill, character.weaponType));
  const level = finalAttack ? learnedLevel(character, finalAttack) : null;
  if (!level?.damage) return 0;
  const boost = buffs.attackBoost > 0 && character.weaponAttack > 0 ? (character.weaponAttack + buffs.attackBoost) / character.weaponAttack : 1;
  return (level.chance ?? 0) / 100 * averagePhysicalHit(character.attackMin, character.attackMax, level.damage, boost);
}

function averageMesos(data: GameData, monsterId: number): number {
  const range = data.mesos[monsterId];
  return range ? LOOT_SHARE * MESO_DROP_CHANCE * (range.min + range.max) / 2 : 0;
}

function sumOverMonsters(kills: Map<number, number>, valuePerKill: (monsterId: number) => number): number {
  let total = 0;
  for (const [id, count] of kills) total += count * valuePerKill(id);
  return total;
}
