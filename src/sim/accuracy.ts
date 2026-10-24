export const VIABLE_HIT_CHANCE = 0.75;

export function hitChance(accuracy: number, playerLevel: number, monsterLevel: number, monsterAvoid: number): number {
  const levelGap = Math.max(0, monsterLevel - playerLevel);
  const effective = accuracy * 100 / (10 * levelGap + 255);
  const difference = effective - monsterAvoid;
  if (difference >= 25 + levelGap * (0.5 * playerLevel + 15)) return 1;
  if (effective <= 0) return 0;
  const spread = 0.15 + 0.2 / (1 + Math.exp(difference / 12));
  const ratio = monsterAvoid / effective;
  if (ratio <= 1 - spread) return 1;
  if (ratio >= 1 + spread) return 0;
  return (1 + spread - ratio) / (2 * spread);
}

export function accuracyForHitChance(target: number, playerLevel: number, monsterLevel: number, monsterAvoid: number): number {
  for (let accuracy = 1; accuracy <= 999; accuracy++) {
    if (hitChance(accuracy, playerLevel, monsterLevel, monsterAvoid) >= target) return accuracy;
  }
  return Infinity;
}
