import { skillMultiplierScale } from '../character/statsWindow';
import { REGULAR_ATTACK, type Character } from '../character/types';
import type { Monster, Skill } from '../data/types';
import { averageActionMilliseconds, MAGIC_SPEED_TIER, speedTier, weaponActions } from './attackTime';
import { buffTotals, learnedLevel, usableWithWeapon, type BuffTotals } from './buffs';
import { averageMagicHit, averagePhysicalHit, cappedHit, criticalScale, defenseScale, elementScale, levelGapScale, masteryFraction } from './damage';

const MELEE_REACH = 110;
const RANGED_REACH = 350;
const RANGED_WEAPONS = [45, 46, 47];
export const HEAL_TARGETS = 3;

export interface Attack {
  skillId: number;
  name: string;
  share: number;
  magic: boolean;
  percent: number;
  multiplierScale: number;
  mastery: number;
  element: string | null;
  targets: number;
  hitsPerTarget: number;
  reach: number;
  hitWidth: number;
  milliseconds: number;
  healRate?: number;
}

export function characterAttacks(character: Character, skills: Skill[], actions: Record<string, number[]>): Attack[] {
  const buffs = buffTotals(character, skills);
  const known = new Map(skills.map((skill) => [skill.id, skill]));
  const entries = Object.entries(character.attackMix).filter(([, percent]) => percent > 0);
  const total = entries.reduce((sum, [, percent]) => sum + percent, 0);
  const attacks = entries
    .map(([id, percent]) => buildAttack(Number(id), percent / (total || 1), character, known, actions, buffs))
    .filter((attack): attack is Attack => attack !== null);
  return attacks.length ? attacks : [regularAttack(character, actions, buffs, 1)];
}

export interface DamageRange {
  lowest: number;
  highest: number;
}

export function averageDamagePerTarget(attack: Attack, character: Character, monster: Monster, buffs: BuffTotals): number {
  const range = damagePerTarget(attack, character, monster, buffs);
  return (range.lowest + range.highest) / 2;
}

export function damagePerTarget(attack: Attack, character: Character, monster: Monster, buffs: BuffTotals): DamageRange {
  if (attack.healRate !== undefined) return healDamage(attack.healRate, character, monster, buffs);
  const base = attack.magic
    ? averageMagicHit(character.stats.INT, character.magicAttack + buffs.magicBoost, attack.percent, attack.mastery)
    : averagePhysicalHit(character.attackMin, character.attackMax, attack.percent, attackBoostScale(character, buffs)) * attack.multiplierScale;
  const defense = defenseScale(attack.magic ? monster.magicDefense : monster.weaponDefense);
  const scaled = base * defense * levelGapScale(character.level, monster.level) * elementScale(monster.elements, attack.element);
  const critical = attack.magic ? 1 : criticalMultiplier(character, buffs);
  const average = cappedHit(scaled * critical) * attack.hitsPerTarget;
  const spread = attack.magic ? magicSpread(character, attack) : physicalSpread(character);
  return { lowest: average * (1 - spread), highest: average * (1 + spread) };
}

export function healAttack(character: Character, skills: Skill[], actions: Record<string, number[]>): Attack | null {
  const heal = skills.find((skill) => skill.name === 'Heal');
  const level = heal ? learnedLevel(character, heal) : null;
  if (!heal || !level?.x || !level.hitBox) return null;
  const width = (level.hitBox[2] - level.hitBox[0]) / 2;
  return {
    skillId: heal.id,
    name: heal.name,
    share: 1,
    magic: true,
    percent: 0,
    multiplierScale: 1,
    mastery: 0,
    element: null,
    targets: Math.max(1, level.mobCount ?? 1),
    hitsPerTarget: 1,
    reach: width,
    hitWidth: width,
    milliseconds: averageActionMilliseconds(heal.actions, actions, MAGIC_SPEED_TIER),
    healRate: level.x / 100,
  };
}

function healDamage(rate: number, character: Character, monster: Monster, buffs: BuffTotals): DamageRange {
  if (!monster.undead) return { lowest: 0, highest: 0 };
  const magicTotal = Math.floor(character.stats.INT / 2) + character.magicAttack + buffs.magicBoost;
  const pool = ((character.stats.INT * rate + character.stats.LUK) / 1000 + 2.5) * magicTotal * rate;
  const perMonster = cappedHit(pool * (1 + 0.5 * (HEAL_TARGETS - 1)) / HEAL_TARGETS / 1.5);
  return { lowest: perMonster, highest: perMonster };
}

function criticalMultiplier(character: Character, buffs: BuffTotals): number {
  if (character.criticalRate === undefined || character.criticalDamage === undefined) return criticalScale(buffs.criticalChance, buffs.criticalDamage);
  return 1 + Math.min(1, character.criticalRate / 100) * Math.max(0, character.criticalDamage / 100 - 1);
}

function physicalSpread(character: Character): number {
  const middle = (character.attackMin + character.attackMax) / 2;
  return middle > 0 ? (character.attackMax - character.attackMin) / 2 / middle : 0;
}

function magicSpread(character: Character, attack: Attack): number {
  const lowest = 1 + character.stats.INT * masteryFraction(attack.mastery) / 125;
  const highest = 1 + character.stats.INT / 125;
  return (highest - lowest) / (highest + lowest);
}

function attackBoostScale(character: Character, buffs: BuffTotals): number {
  if (buffs.attackBoost <= 0 || character.weaponAttack <= 0) return 1;
  return (character.weaponAttack + buffs.attackBoost) / character.weaponAttack;
}

function buildAttack(id: number, share: number, character: Character, known: Map<number, Skill>, actions: Record<string, number[]>, buffs: BuffTotals): Attack | null {
  if (id === REGULAR_ATTACK) return regularAttack(character, actions, buffs, share);
  const skill = known.get(id);
  if (!skill || skill.kind !== 'attack' || !usableWithWeapon(skill, character.weaponType)) return null;
  const level = learnedLevel(character, skill);
  if (!level) return null;
  const magic = level.magic !== undefined;
  const targets = Math.max(1, level.mobCount ?? 1);
  const bullets = Math.max(1, level.bulletCount ?? 1);
  const tier = magic ? MAGIC_SPEED_TIER : speedTier(character.weaponSpeed, buffs.speedTierChange);
  const skillActions = skill.actions.length ? skill.actions : weaponActions(character.weaponType);
  return {
    skillId: id,
    name: skill.name,
    share,
    magic,
    percent: magic ? level.magic ?? 100 : level.damage ?? level.fixedDamage ?? 100,
    multiplierScale: magic ? 1 : skillMultiplierScale(skill.name, character.weaponType, character.stats),
    mastery: level.mastery ?? 0,
    element: skill.element,
    targets,
    hitsPerTarget: Math.max(1, level.attackCount ?? 1) * Math.max(1, Math.floor(bullets / targets)),
    reach: magic && !level.hitBox && !level.range ? RANGED_REACH : reachOf(character.weaponType, level.range, level.hitBox),
    hitWidth: level.hitBox ? (level.hitBox[2] - level.hitBox[0]) / 2 : magic && !level.range ? RANGED_REACH : reachOf(character.weaponType, level.range, undefined),
    milliseconds: averageActionMilliseconds(skillActions, actions, tier),
  };
}

function regularAttack(character: Character, actions: Record<string, number[]>, buffs: BuffTotals, share: number): Attack {
  return {
    skillId: REGULAR_ATTACK,
    name: 'Regular attack',
    share,
    magic: false,
    percent: 100,
    multiplierScale: 1,
    mastery: 0,
    element: null,
    targets: 1,
    hitsPerTarget: 1,
    reach: reachOf(character.weaponType, undefined, undefined),
    hitWidth: 0,
    milliseconds: averageActionMilliseconds(weaponActions(character.weaponType), actions, speedTier(character.weaponSpeed, buffs.speedTierChange)),
  };
}

function reachOf(weaponType: number, range: number | undefined, hitBox: [number, number, number, number] | undefined): number {
  if (hitBox) return Math.max(Math.abs(hitBox[0]), Math.abs(hitBox[2]));
  if (range) return range;
  return RANGED_WEAPONS.includes(weaponType) ? RANGED_REACH : MELEE_REACH;
}
