import type { Character } from '../character/types';
import { jobLine, type GameData } from '../data/gameData';
import type { MapDetail, Monster, Skill, SpawnPoint } from '../data/types';
import { hitChance } from './accuracy';
import { averageDamagePerTarget, characterAttacks, type Attack } from './attacks';
import { buffTotals, learnedLevel, usableWithWeapon, type BuffTotals } from './buffs';
import { averagePhysicalHit } from './damage';
import { expPerMember } from './party';
import { capacityScale, spawnsPerHour } from './spawns';
import { campedGroups, groupSpawns, secondsBetweenGroups, type SpawnGroup } from './travel';

const BASE_SPEED = 100;
const SIDE_MONSTER_WEIGHT = 0.5;

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
  const regular = detail.spawns.filter((spawn) => spawn.respawnSeconds <= 0);
  const reach = attacks.reduce((total, attack) => total + attack.reach * attack.share, 0);
  const allGroups = groupSpawns(regular.length ? regular : detail.spawns, reach);
  const present = [...new Set(detail.spawns.map((spawn) => spawn.mobId))]
    .map((id) => data.monsters.get(id))
    .filter((monster): monster is Monster => monster !== undefined);
  const hitChances = new Map(present.map((monster) => [monster.id, hitChance(accuracy, character.level, monster.level, monster.avoid)]));
  const bonusPerTarget = finalAttackBonus(character, skills, buffs);
  const timesToKill = (alivePerGroup: number) => {
    const seconds = new Map<number, number>();
    for (const monster of present) {
      const time = killSeconds(attacks, character, monster, buffs, bonusPerTarget, hitChances.get(monster.id) ?? 0, alivePerGroup);
      if (Number.isFinite(time)) seconds.set(monster.id, time);
    }
    return seconds;
  };
  const campOn = (mainTarget: number | null): MapSimulation => {
    const groups = mainTarget === null ? allGroups : campedGroups(allGroups, mainTarget);
    const alivePerGroup = alivePer(groups, players);
    const secondsPerKill = timesToKill(alivePerGroup);
    const campedSpawns = groups.flatMap((group) => group.spawns).filter((spawn) => secondsPerKill.has(spawn.mobId));
    const weightOf = (mobId: number) => (mainTarget === null || mobId === mainTarget ? 1 : SIDE_MONSTER_WEIGHT);
    const shares = spawnShares(campedSpawns, weightOf);
    const travelPerKill = secondsBetweenGroups(groups, BASE_SPEED + buffs.movementBonus) / alivePerGroup;
    const averageSeconds = [...shares].reduce((total, [id, share]) => total + share * (secondsPerKill.get(id) ?? 0), 0) + travelPerKill;
    const capacity = averageSeconds > 0 ? players * 3600 / averageSeconds : 0;
    const targetSpawns = campedSpawns.filter((spawn) => weightOf(spawn.mobId) === 1);
    const sideSpawns = campedSpawns.filter((spawn) => weightOf(spawn.mobId) !== 1);
    const supply = spawnsPerHour(targetSpawns, players) + SIDE_MONSTER_WEIGHT * spawnsPerHour(sideSpawns, players);
    const killsPerHour = Math.min(capacity, supply);
    const killsByMonster = new Map([...shares].map(([id, share]) => [id, killsPerHour * share]));
    return {
      mapId: detail.id,
      players,
      killsPerHour,
      killsByMonster,
      expPerHour: sumOverMonsters(killsByMonster, (id) => expPerMember(data.monsters.get(id)?.exp ?? 0, players)),
      mesosPerHour: sumOverMonsters(killsByMonster, (id) => averageMesos(data, id)) / players,
      limitedBy: capacity > supply ? 'respawns' : 'killing',
      hitChances,
      mainTarget,
    };
  };
  const candidates = [...timesToKill(alivePer(allGroups, players)).keys()];
  if (!candidates.length) return campOn(null);
  const best = candidates.map(campOn).reduce((chosen, option) => (option.expPerHour > chosen.expPerHour ? option : chosen));
  return { ...best, mainTarget: mostDefeated(best.killsByMonster) };
}

function mostDefeated(killsByMonster: Map<number, number>): number | null {
  const [top] = [...killsByMonster].sort((a, b) => b[1] - a[1]);
  return top?.[0] ?? null;
}

function killSeconds(attacks: Attack[], character: Character, monster: Monster, buffs: BuffTotals, bonusPerTarget: number, chance: number, alivePerGroup: number): number {
  let millisecondsPerCast = 0;
  let killsPerCast = 0;
  for (const attack of attacks) {
    const damage = (averageDamagePerTarget(attack, character, monster, buffs) + (attack.magic ? 0 : bonusPerTarget)) * chance;
    if (damage <= 0) continue;
    const castsToKill = Math.max(1, Math.ceil(monster.hp / damage));
    millisecondsPerCast += attack.share * attack.milliseconds;
    killsPerCast += attack.share * Math.min(attack.targets, alivePerGroup) / castsToKill;
  }
  return killsPerCast > 0 ? millisecondsPerCast / killsPerCast / 1000 : Infinity;
}

function finalAttackBonus(character: Character, skills: Skill[], buffs: BuffTotals): number {
  const finalAttack = skills.find((skill) => /^Final Attack/.test(skill.name) && learnedLevel(character, skill) && usableWithWeapon(skill, character.weaponType));
  const level = finalAttack ? learnedLevel(character, finalAttack) : null;
  if (!level?.damage) return 0;
  const boost = buffs.attackBoost > 0 && character.weaponAttack > 0 ? (character.weaponAttack + buffs.attackBoost) / character.weaponAttack : 1;
  return (level.chance ?? 0) / 100 * averagePhysicalHit(character.attackMin, character.attackMax, level.damage, boost);
}

function alivePer(groups: SpawnGroup[], players: number): number {
  const points = groups.reduce((total, group) => total + group.points, 0);
  return Math.max(1, points / Math.max(1, groups.length) * capacityScale(players));
}

function spawnShares(spawns: SpawnPoint[], weightOf: (mobId: number) => number): Map<number, number> {
  const counts = new Map<number, number>();
  for (const spawn of spawns) counts.set(spawn.mobId, (counts.get(spawn.mobId) ?? 0) + weightOf(spawn.mobId));
  const total = [...counts.values()].reduce((sum, count) => sum + count, 0);
  return new Map([...counts].map(([id, count]) => [id, count / Math.max(1, total)]));
}

function averageMesos(data: GameData, monsterId: number): number {
  const range = data.mesos[monsterId];
  return range ? range.chance * (range.min + range.max) / 2 : 0;
}

function sumOverMonsters(kills: Map<number, number>, valuePerKill: (monsterId: number) => number): number {
  let total = 0;
  for (const [id, count] of kills) total += count * valuePerKill(id);
  return total;
}
