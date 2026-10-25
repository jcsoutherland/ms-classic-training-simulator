import { defaultCharacter, type DefaultSources } from '../character/defaults';
import type { Character } from '../character/types';
import type { Stat } from '../data/types';

const STATS: Stat[] = ['STR', 'DEX', 'INT', 'LUK'];
const MIN_STAT = 4;
type Grown = 'attackMin' | 'attackMax' | 'accuracy' | 'avoid' | 'weaponAttack' | 'magicAttack';
const GROWN: Grown[] = ['attackMin', 'attackMax', 'accuracy', 'avoid', 'weaponAttack', 'magicAttack'];

export function projectCharacter(current: Character, level: number, jobId: number, sources: DefaultSources): Character {
  if (level === current.level && jobId === current.jobId) return current;
  const guideNow = defaultCharacter(current.jobId, current.level, sources);
  const guideThen = defaultCharacter(jobId, level, sources);
  const stats = Object.fromEntries(STATS.map((stat) => [stat, Math.max(MIN_STAT, current.stats[stat] + guideThen.stats[stat] - guideNow.stats[stat])])) as Record<Stat, number>;
  const grown = Object.fromEntries(GROWN.map((field) => [field, Math.max(0, current[field] + guideThen[field] - guideNow[field])])) as Pick<Character, Grown>;
  const keepsWeapon = jobId === current.jobId && current.weaponAttack >= guideThen.weaponAttack;
  const weapon = keepsWeapon
    ? { weaponId: current.weaponId, weaponType: current.weaponType, weaponSpeed: current.weaponSpeed }
    : { weaponId: guideThen.weaponId, weaponType: guideThen.weaponType, weaponSpeed: guideThen.weaponSpeed };
  return {
    ...current,
    ...grown,
    ...weapon,
    jobId,
    level,
    expPercent: 0,
    stats,
    criticalRate: undefined,
    criticalDamage: undefined,
    skills: skillsTowardGuide(current.skills, guideNow.skills, guideThen.skills),
    attackMix: guideThen.attackMix,
    equipment: guideThen.equipment,
  };
}

export function skillsTowardGuide(current: Record<number, number>, guideNow: Record<number, number>, guideThen: Record<number, number>): Record<number, number> {
  const skills = { ...current };
  let points = total(guideThen) - total(guideNow);
  const gaps = Object.entries(guideThen)
    .map(([id, level]) => ({ id: Number(id), gap: level - (skills[Number(id)] ?? 0) }))
    .filter((entry) => entry.gap > 0)
    .sort((a, b) => b.gap - a.gap);
  for (const { id, gap } of gaps) {
    if (points <= 0) break;
    const spent = Math.min(gap, points);
    skills[id] = (skills[id] ?? 0) + spent;
    points -= spent;
  }
  return skills;
}

function total(skills: Record<number, number>): number {
  return Object.values(skills).reduce((sum, level) => sum + level, 0);
}
