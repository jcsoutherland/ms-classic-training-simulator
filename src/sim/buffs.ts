import type { Character } from '../character/types';
import type { Skill, SkillLevel } from '../data/types';

export interface BuffTotals {
  speedTierChange: number;
  attackBoost: number;
  magicBoost: number;
  accuracyBonus: number;
  movementBonus: number;
  criticalChance: number;
  criticalDamage: number;
}

export function learnedLevel(character: Character, skill: Skill): SkillLevel | null {
  const level = Math.min(character.skills[skill.id] ?? 0, skill.maxLevel);
  return level > 0 ? skill.levels[level - 1] : null;
}

export function usableWithWeapon(skill: Skill, weaponType: number): boolean {
  return skill.weaponTypes.length === 0 || skill.weaponTypes.includes(weaponType);
}

export function buffTotals(character: Character, skills: Skill[]): BuffTotals {
  const totals: BuffTotals = { speedTierChange: 0, attackBoost: 0, magicBoost: 0, accuracyBonus: 0, movementBonus: 0, criticalChance: 0, criticalDamage: 0 };
  for (const skill of skills) {
    const level = learnedLevel(character, skill);
    if (!level || !usableWithWeapon(skill, character.weaponType)) continue;
    if (skill.kind === 'buff') addBuff(totals, skill, level);
    if (skill.kind === 'passive') addPassive(totals, level);
  }
  return totals;
}

function addBuff(totals: BuffTotals, skill: Skill, level: SkillLevel): void {
  if (/Booster/i.test(skill.name) && level.x !== undefined) totals.speedTierChange = Math.min(totals.speedTierChange, level.x);
  totals.attackBoost += level.attackBoost ?? 0;
  totals.magicBoost += level.magicBoost ?? 0;
  totals.accuracyBonus += level.accuracy ?? 0;
  totals.movementBonus += level.speed ?? 0;
}

function addPassive(totals: BuffTotals, level: SkillLevel): void {
  totals.criticalChance += level.criticalChance ?? 0;
  totals.criticalDamage += level.criticalDamage ?? 0;
}
