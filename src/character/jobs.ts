export const JOB_NAMES: Record<number, string> = {
  0: 'Beginner',
  100: 'Warrior', 110: 'Fighter', 120: 'Page', 130: 'Spearman',
  200: 'Magician', 210: 'Fire/Poison Wizard', 220: 'Ice/Lightning Wizard', 230: 'Cleric',
  300: 'Bowman', 310: 'Hunter', 320: 'Crossbowman',
  400: 'Thief', 410: 'Assassin', 420: 'Bandit',
};

export const JOB_IDS = Object.keys(JOB_NAMES).map(Number);

export const STARTING_TOWN: Record<number, 'henesys' | 'ellinia' | 'perion' | 'kerning'> = {
  0: 'henesys', 100: 'perion', 200: 'ellinia', 300: 'henesys', 400: 'kerning',
};

export function jobName(jobId: number): string {
  return JOB_NAMES[jobId] ?? 'Adventurer';
}

export function jobNamePlural(jobId: number): string {
  const name = jobName(jobId);
  return name.endsWith('f') ? `${name.slice(0, -1)}ves` : `${name}s`;
}

export function branchOf(jobId: number): number {
  return Math.floor(jobId / 100) * 100;
}

export function minimumLevel(jobId: number): number {
  if (jobId === 0) return 1;
  return jobId % 100 === 0 ? 10 : 30;
}

export function startingTown(jobId: number): 'henesys' | 'ellinia' | 'perion' | 'kerning' {
  return STARTING_TOWN[branchOf(jobId)] ?? 'henesys';
}
