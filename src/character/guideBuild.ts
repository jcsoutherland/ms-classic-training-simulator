import type { Guide, GuideSkillStep, GuideStatStep, Skill, Stat } from '../data/types';
import { branchOf } from './jobs';

const BASE_STAT = 4;
const AP_PER_LEVEL = 5;
const MAIN_STAT: Record<number, Stat> = { 0: 'STR', 100: 'STR', 200: 'INT', 300: 'DEX', 400: 'LUK' };

export function guidesFor(jobId: number, guides: Guide[]): Guide[] {
  const branch = branchOf(jobId);
  return guides.filter((guide) => guide.jobId === branch || guide.jobId === jobId).sort((a, b) => a.jobId - b.jobId);
}

export function statsAtLevel(jobId: number, level: number, guides: Guide[]): Record<Stat, number> {
  const steps = guidesFor(jobId, guides).flatMap((guide) => guide.stats).sort((a, b) => a.from - b.from || a.to - b.to);
  let stats: Record<Stat, number> = { STR: BASE_STAT, DEX: BASE_STAT, INT: BASE_STAT, LUK: BASE_STAT };
  let lastApplied: GuideStatStep | null = null;
  for (const step of steps) {
    if (step.from > level) break;
    stats = applyStep(stats, step, Math.min(level, step.to));
    lastApplied = step;
  }
  if (!lastApplied) return addFreePoints(stats, branchOf(jobId), level - 1);
  if (level > lastApplied.to) return addFreePoints(stats, branchOf(jobId), level - lastApplied.to, { [mostAddedStat(steps) ?? MAIN_STAT[branchOf(jobId)]]: AP_PER_LEVEL });
  return stats;
}

function mostAddedStat(steps: GuideStatStep[]): Stat | null {
  const totals = new Map<Stat, number>();
  for (const step of steps) {
    const levels = step.to - step.from + 1;
    for (const [stat, amount] of Object.entries(step.adds) as [Stat, number][]) totals.set(stat, (totals.get(stat) ?? 0) + amount * levels);
  }
  return [...totals].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

function applyStep(stats: Record<Stat, number>, step: GuideStatStep, reachedLevel: number): Record<Stat, number> {
  const result = { ...stats, ...step.baseAtEnd };
  const levelsShortOfEnd = step.to - reachedLevel;
  for (const [stat, amount] of Object.entries(step.adds) as [Stat, number][]) {
    if (step.baseAtEnd[stat] !== undefined) result[stat] -= amount * levelsShortOfEnd;
    else result[stat] = stats[stat] + amount * (reachedLevel - step.from + 1);
  }
  return result;
}

export function skillLevelsAtLevel(jobId: number, level: number, guides: Guide[], skills: Skill[]): Record<number, number> {
  const learned: Record<number, number> = {};
  for (const guide of guidesFor(jobId, guides)) {
    for (const step of guide.skills) addSkillStep(learned, step, level, skills);
  }
  return learned;
}

function addFreePoints(stats: Record<Stat, number>, branch: number, levels: number, pattern: Partial<Record<Stat, number>> = {}): Record<Stat, number> {
  const result = { ...stats };
  const perLevel = Object.keys(pattern).length ? pattern : { [MAIN_STAT[branch] ?? 'STR']: AP_PER_LEVEL };
  for (const [stat, amount] of Object.entries(perLevel) as [Stat, number][]) result[stat] += amount * Math.max(0, levels);
  return result;
}

function addSkillStep(learned: Record<number, number>, step: GuideSkillStep, level: number, skills: Skill[]): void {
  if (step.from > level) return;
  const span = step.to - step.from + 1;
  const done = Math.min(level, step.to) - step.from + 1;
  for (const [name, total] of Object.entries(step.adds)) {
    const skill = findSkill(name, skills);
    if (!skill) continue;
    const points = Math.floor(total * done / span);
    learned[skill.id] = Math.min(skill.maxLevel, (learned[skill.id] ?? 0) + points);
  }
}

function findSkill(name: string, skills: Skill[]): Skill | undefined {
  const wanted = name.toLowerCase();
  return skills.find((skill) => skill.name.toLowerCase() === wanted)
    ?? skills.find((skill) => skill.name.toLowerCase().startsWith(wanted))
    ?? skills.find((skill) => wanted.startsWith(skill.name.toLowerCase()));
}
