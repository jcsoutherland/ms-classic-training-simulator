import { jobLine, type GameData } from '../data/gameData';
import type { Guide, Item, Skill, Weapon } from '../data/types';
import { learnedLevel, usableWithWeapon } from '../sim/buffs';
import { skillLevelsAtLevel, statsAtLevel, guidesFor } from './guideBuild';
import { branchOf, jobName } from './jobs';
import { accuracyFor, avoidFor, statsWindowRange } from './statsWindow';
import { REGULAR_ATTACK, type Character } from './types';

const DEFAULT_WEAPON_TYPE: Record<number, number> = {
  0: 30, 100: 30, 110: 30, 120: 32, 130: 43, 200: 37, 210: 37, 220: 37, 230: 37,
  300: 45, 310: 45, 320: 46, 400: 47, 410: 47, 420: 33,
};
const STAR_ATTACK = 15;
const NOT_MAIN_ATTACKS = /^(Final Attack|Steal|Disorder|Power Knockback|Rush|Heal)/;

export interface DefaultSources {
  data: GameData;
  guides: Guide[];
  items: Item[];
}

export function defaultCharacter(jobId: number, level: number, sources: DefaultSources): Character {
  const skills = sources.data.jobs.filter((job) => jobLine(jobId).includes(job.id)).flatMap((job) => job.skills);
  const stats = statsAtLevel(jobId, level, sources.guides);
  const gear = guideGear(jobId, level, sources);
  const weapon = gear.weapon ?? fallbackWeapon(jobId, level, sources.data);
  const weaponType = weapon ? Math.floor(weapon.id / 10000) % 100 : DEFAULT_WEAPON_TYPE[jobId] ?? 30;
  const learned = movePointsToUsableAttacks(skillLevelsAtLevel(jobId, level, sources.guides, skills), skills, weaponType);
  const draft: Character = {
    id: `default-${jobId}-${level}`,
    name: `My ${jobName(jobId)}`,
    jobId,
    level,
    expPercent: 0,
    gender: 'male',
    stats,
    attackMin: 0,
    attackMax: 0,
    weaponAttack: (weapon?.attack ?? 0) + (weaponType === 47 ? STAR_ATTACK : 0),
    magicAttack: weapon?.magicAttack ?? 0,
    accuracy: 0,
    avoid: avoidFor(stats),
    weaponId: weapon?.id ?? null,
    weaponType,
    weaponSpeed: weapon?.attackSpeed ?? 6,
    skills: learned,
    attackMix: {},
    equipment: gear.itemIds,
  };
  const passiveAccuracy = passiveTotal(draft, skills, 'accuracy');
  const range = statsWindowRange(weaponType, stats, draft.weaponAttack, masteryLevel(draft, skills));
  return {
    ...draft,
    attackMin: range.min,
    attackMax: range.max,
    accuracy: accuracyFor(jobId, stats, level) + passiveAccuracy,
    avoid: draft.avoid + passiveTotal(draft, skills, 'avoid'),
    attackMix: { [mainAttack(draft, skills)]: 100 },
  };
}

export function mainAttack(character: Character, skills: Skill[]): number {
  let best = REGULAR_ATTACK;
  let bestScore = 100;
  for (const skill of skills) {
    if (skill.kind !== 'attack' || NOT_MAIN_ATTACKS.test(skill.name) || !usableWithWeapon(skill, character.weaponType)) continue;
    const level = learnedLevel(character, skill);
    if (!level) continue;
    const score = (level.damage ?? level.magic ?? 0) * Math.max(1, level.attackCount ?? 1) * Math.max(1, level.bulletCount ?? 1) * Math.min(3, level.mobCount ?? 1);
    if (score > bestScore) {
      best = skill.id;
      bestScore = score;
    }
  }
  return best;
}

export function withUsableAttackMix(character: Character, skills: Skill[]): Character {
  const usable = Object.entries(character.attackMix).some(([id, percent]) => {
    if (percent <= 0) return false;
    if (Number(id) === REGULAR_ATTACK) return true;
    const skill = skills.find((candidate) => candidate.id === Number(id));
    return !!skill && usableWithWeapon(skill, character.weaponType) && !!learnedLevel(character, skill);
  });
  return usable ? character : { ...character, attackMix: { [mainAttack(character, skills)]: 100 } };
}

function movePointsToUsableAttacks(learned: Record<number, number>, skills: Skill[], weaponType: number): Record<number, number> {
  const result = { ...learned };
  for (const skill of skills) {
    const points = result[skill.id] ?? 0;
    if (skill.kind !== 'attack' || points === 0 || usableWithWeapon(skill, weaponType)) continue;
    const replacement = skills.find((other) => other.kind === 'attack' && Math.floor(other.id / 10000) === Math.floor(skill.id / 10000)
      && other.weaponTypes.length > 0 && usableWithWeapon(other, weaponType) && !NOT_MAIN_ATTACKS.test(other.name));
    if (!replacement) continue;
    result[skill.id] = 0;
    result[replacement.id] = Math.min(replacement.maxLevel, (result[replacement.id] ?? 0) + points);
  }
  return result;
}

function guideGear(jobId: number, level: number, sources: DefaultSources): { weapon: Weapon | null; itemIds: number[] } {
  const byName = new Map(sources.items.map((item) => [item.name.toLowerCase(), item.id]));
  const ids: number[] = [];
  let weapon: Weapon | null = null;
  for (const guide of guidesFor(jobId, sources.guides)) {
    for (const row of guide.gear.filter((entry) => entry.level <= level).sort((a, b) => a.level - b.level)) {
      const id = byName.get(row.item.toLowerCase());
      if (id === undefined) continue;
      const asWeapon = sources.data.weapons.get(id);
      if (asWeapon && asWeapon.requiredLevel <= level) weapon = asWeapon;
      else if (!asWeapon) ids.push(id);
    }
  }
  return { weapon, itemIds: weapon ? [...new Set([...ids, weapon.id])] : [...new Set(ids)] };
}

function fallbackWeapon(jobId: number, level: number, data: GameData): Weapon | null {
  const type = String(DEFAULT_WEAPON_TYPE[jobId] ?? DEFAULT_WEAPON_TYPE[branchOf(jobId)] ?? 30);
  const candidates = [...data.weapons.values()].filter((weapon) => weapon.type === type && weapon.requiredLevel <= level);
  return candidates.sort((a, b) => b.requiredLevel - a.requiredLevel || b.attack - a.attack)[0] ?? null;
}

function masteryLevel(character: Character, skills: Skill[]): number {
  for (const skill of skills) {
    if (skill.kind !== 'passive' || !/Mastery/.test(skill.name) || !usableWithWeapon(skill, character.weaponType)) continue;
    const level = learnedLevel(character, skill);
    if (level?.mastery) return level.mastery;
  }
  return 0;
}

function passiveTotal(character: Character, skills: Skill[], field: 'accuracy' | 'avoid'): number {
  return skills
    .filter((skill) => skill.kind === 'passive' && usableWithWeapon(skill, character.weaponType))
    .reduce((total, skill) => total + (learnedLevel(character, skill)?.[field] ?? 0), 0);
}
