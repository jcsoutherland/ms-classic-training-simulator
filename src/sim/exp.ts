export const MAX_LEVEL = 100;

const table = buildTable();

function buildTable(): number[] {
  const values: number[] = [0];
  for (let level = 1; level < MAX_LEVEL; level++) {
    if (level <= 5) values.push((Math.floor(level * level / 2) + 15) * level);
    else if (level <= 50) {
      const q = Math.floor(level * level / 3);
      values.push((q + 19) * q);
    } else values.push(Math.trunc(values[level - 1] * (level >= 90 ? 2.1 : 1.0548)));
  }
  return values;
}

export function expToNextLevel(level: number): number {
  if (level < 1 || level >= MAX_LEVEL) return 0;
  return table[level];
}

export function expToReach(level: number, expPercent: number, goalLevel: number): number {
  if (goalLevel <= level) return 0;
  let total = expToNextLevel(level) * (1 - expPercent / 100);
  for (let current = level + 1; current < goalLevel; current++) total += expToNextLevel(current);
  return total;
}

export interface LevelProgress {
  level: number;
  percent: number;
}

export function levelAfter(level: number, expPercent: number, gainedExp: number): LevelProgress {
  let current = level;
  let carried = expToNextLevel(level) * expPercent / 100 + gainedExp;
  while (current < MAX_LEVEL && carried >= expToNextLevel(current)) {
    carried -= expToNextLevel(current);
    current++;
  }
  const needed = expToNextLevel(current);
  return { level: current, percent: needed > 0 ? carried / needed * 100 : 0 };
}
