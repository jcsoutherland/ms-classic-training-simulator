export const DAMAGE_CAP = 99999;
const BASE_CRITICAL_CHANCE = 0.05;
const BASE_CRITICAL_DAMAGE = 0.2;
const ELEMENT_MULTIPLIER: Record<string, number> = { '1': 0, '2': 0.75, '3': 1.25 };

export function levelGapScale(playerLevel: number, monsterLevel: number): number {
  const gap = monsterLevel - playerLevel;
  if (gap <= 0) return 1;
  if (gap < 10) return 1 / (1 + gap * gap * 0.005);
  return 1 / (1 + gap * 0.05);
}

export function defenseScale(defense: number): number {
  return 100 / (Math.max(0, defense) + 100);
}

export function elementScale(monsterElements: string, skillElement: string | null): number {
  if (!skillElement) return 1;
  const match = monsterElements.match(new RegExp(`${skillElement.toUpperCase()}(\\d)`));
  return match ? ELEMENT_MULTIPLIER[match[1]] ?? 1 : 1;
}

export function criticalScale(extraChancePercent: number, extraDamagePercent: number): number {
  const chance = Math.min(1, BASE_CRITICAL_CHANCE + extraChancePercent / 100);
  return 1 + chance * (BASE_CRITICAL_DAMAGE + extraDamagePercent / 100);
}

export function averagePhysicalHit(attackMin: number, attackMax: number, damagePercent: number, attackBoostScale: number): number {
  return (attackMin + attackMax) / 2 * damagePercent / 100 * attackBoostScale;
}

export function masteryFraction(masteryLevel: number): number {
  return (masteryLevel / 10 + 0.1) * 0.7;
}

export function averageMagicHit(intelligence: number, magicAttack: number, spellPercent: number, masteryLevel: number): number {
  const magicTotal = Math.floor(intelligence / 2) + magicAttack;
  const scale = spellPercent / 100;
  const minimum = scale * magicTotal * (1 + intelligence * masteryFraction(masteryLevel) / 125);
  const maximum = scale * magicTotal * (1 + intelligence / 125);
  return (minimum + maximum) / 2;
}

export function cappedHit(value: number): number {
  return Math.min(DAMAGE_CAP, Math.max(1, value));
}
