import { skillMultiplierScale } from '../character/statsWindow';
import { REGULAR_ATTACK, type Character } from '../character/types';
import type { Monster, Skill } from '../data/types';
import { averageActionMilliseconds, MAGIC_SPEED_TIER, speedTier, weaponActions } from './attackTime';
import { buffTotals, learnedLevel, usableWithWeapon, type BuffTotals } from './buffs';
import { averageMagicHit, averagePhysicalHit, cappedHit, criticalScale, defenseScale, elementScale, levelGapScale } from './damage';

const MELEE_REACH = 110;
const RANGED_REACH = 350;
const RANGED_WEAPONS = [45, 46, 47];

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
  milliseconds: number;
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

export function averageDamagePerTarget(attack: Attack, character: Character, monster: Monster, buffs: BuffTotals): number {
  const base = attack.magic
    ? averageMagicHit(character.stats.INT, character.magicAttack + buffs.magicBoost, attack.percent, attack.mastery)
    : averagePhysicalHit(character.attackMin, character.attackMax, attack.percent, attackBoostScale(character, buffs)) * attack.multiplierScale;
  const defense = defenseScale(attack.magic ? monster.magicDefense : monster.weaponDefense);
  const scaled = base * defense * levelGapScale(character.level, monster.level) * elementScale(monster.elements, attack.element);
  const critical = attack.magic ? 1 : criticalScale(buffs.criticalChance, buffs.criticalDamage);
  return cappedHit(scaled * critical) * attack.hitsPerTarget;
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
    reach: reachOf(character.weaponType, level.range, level.hitBox),
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
    milliseconds: averageActionMilliseconds(weaponActions(character.weaponType), actions, speedTier(character.weaponSpeed, buffs.speedTierChange)),
  };
}

function reachOf(weaponType: number, range: number | undefined, hitBox: [number, number, number, number] | undefined): number {
  if (hitBox) return Math.max(Math.abs(hitBox[0]), Math.abs(hitBox[2]));
  if (range) return range;
  return RANGED_WEAPONS.includes(weaponType) ? RANGED_REACH : MELEE_REACH;
}
