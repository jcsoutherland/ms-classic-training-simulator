import type { Character } from '../character/types';
import { jobLine, type GameData } from '../data/gameData';
import type { MapDetail, Monster, Skill } from '../data/types';
import { hitChance } from './accuracy';
import { averageDamagePerTarget, characterAttacks, type Attack } from './attacks';
import { buffTotals, learnedLevel, usableWithWeapon, type BuffTotals } from './buffs';
import { averagePhysicalHit } from './damage';
import { expPerMember } from './party';
import { capacityScale, spawnsPerHour } from './spawns';
import { groupSpawns, secondsBetweenGroups } from './travel';

const BASE_SPEED = 100;

export interface MapSimulation {
  mapId: string;
  players: number;
  killsPerHour: number;
  killsByMonster: Map<number, number>;
  expPerHour: number;
  mesosPerHour: number;
  limitedBy: 'killing' | 'respawns';
  hitChances: Map<number, number>;
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
  const groups = groupSpawns(regular.length ? regular : detail.spawns, reach);
  const alivePerGroup = Math.max(1, groups.reduce((total, group) => total + group.points, 0) / Math.max(1, groups.length) * capacityScale(players));
  const hitChances = new Map<number, number>();
  const secondsPerKill = new Map<number, number>();
  for (const id of new Set(detail.spawns.map((spawn) => spawn.mobId))) {
    const monster = data.monsters.get(id);
    if (!monster) continue;
    const chance = hitChance(accuracy, character.level, monster.level, monster.avoid);
    hitChances.set(id, chance);
    const seconds = killSeconds(attacks, character, monster, buffs, finalAttackBonus(character, skills, buffs), chance, alivePerGroup);
    if (Number.isFinite(seconds)) secondsPerKill.set(id, seconds);
  }
  const shares = spawnShares(detail, secondsPerKill);
  const travelPerKill = secondsBetweenGroups(groups, BASE_SPEED + buffs.movementBonus) / alivePerGroup;
  const averageSeconds = [...shares].reduce((total, [id, share]) => total + share * (secondsPerKill.get(id) ?? 0), 0) + travelPerKill;
  const capacity = averageSeconds > 0 ? players * 3600 / averageSeconds : 0;
  const supply = spawnsPerHour(detail.spawns.filter((spawn) => shares.has(spawn.mobId)), players);
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
  };
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

function spawnShares(detail: MapDetail, killable: Map<number, number>): Map<number, number> {
  const counts = new Map<number, number>();
  for (const spawn of detail.spawns) if (killable.has(spawn.mobId)) counts.set(spawn.mobId, (counts.get(spawn.mobId) ?? 0) + 1);
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
