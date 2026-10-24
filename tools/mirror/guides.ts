import type { Guide, GuideGear, GuideSkillStep, GuideStatStep, Stat } from '../../src/data/types';
import { MEOWDB } from './meowdb';
import { decodeHtml } from './names';
import { politeText } from './politeFetch';

export const GUIDE_PAGES: [number, string][] = [
  [100, 'warrior-class-guide'], [200, 'magician-class-guide'], [300, 'bowman-class-guide'], [400, 'thief-class-guide'],
  [110, 'fighter-class-guide'], [120, 'page-class-guide'], [130, 'spearman-class-guide'],
  [210, 'fp-wizard-class-guide'], [220, 'il-wizard-class-guide'], [230, 'cleric-class-guide'],
  [310, 'hunter-class-guide'], [320, 'crossbowman-class-guide'], [410, 'assassin-class-guide'], [420, 'bandit-class-guide'],
];
const STATS: Stat[] = ['STR', 'DEX', 'INT', 'LUK'];
const GEAR_HEADER = /weapon|item|sword|axe|blunt|spear|polearm|claw|bow|dagger|wand|staff/i;

export async function readGuides(): Promise<Guide[]> {
  const guides: Guide[] = [];
  for (const [jobId, slug] of GUIDE_PAGES) {
    const url = `${MEOWDB}/guides/${slug}`;
    guides.push({ jobId, url, ...parseGuide(await politeText(url)) });
  }
  return guides;
}

export function parseGuide(html: string): Pick<Guide, 'stats' | 'skills' | 'gear'> {
  const tables = readTables(html);
  const header = (rows: string[][]) => rows[0]?.join(' | ') ?? '';
  const statTables = tables.filter((rows) => /AP each level/i.test(header(rows)) || /Spend \| Base stats/i.test(header(rows)));
  const skillTable = tables.find((rows) => /^Levels? \| Spend( SP on)? \| (Running|Result)/i.test(header(rows)));
  const gearTables = tables.filter((rows) => /^Level$/i.test(rows[0]?.[0] ?? '') && GEAR_HEADER.test(rows[0]?.[1] ?? ''));
  return {
    stats: statTables.flatMap(parseStatTable).sort((a, b) => a.from - b.from),
    skills: (skillTable?.slice(1) ?? []).map(parseSkillRow).filter((row): row is GuideSkillStep => row !== null),
    gear: gearTables.flatMap((rows) => rows.slice(1).map(parseGearRow)).filter((row): row is GuideGear => row !== null),
  };
}

export function parseLevels(text: string): [number, number] | null {
  const match = text.match(/(\d+)\s*(?:-|–|to)\s*(\d+)/) ?? text.match(/(\d+)/);
  if (!match) return null;
  return [Number(match[1]), Number(match[2] ?? match[1])];
}

export function parseStatAdds(text: string): Partial<Record<Stat, number>> {
  const adds: Partial<Record<Stat, number>> = {};
  for (const match of text.matchAll(/\b(STR|DEX|INT|LUK)\s*\+\s*(\d+)/gi)) {
    const stat = match[1].toUpperCase() as Stat;
    adds[stat] = (adds[stat] ?? 0) + Number(match[2]);
  }
  return adds;
}

export function parseBaseStats(cell: string, headerText: string): Partial<Record<Stat, number>> {
  const base: Partial<Record<Stat, number>> = {};
  const labelled = [...cell.matchAll(/(\d+)\s*(STR|DEX|INT|LUK)\b/gi)];
  if (labelled.length) {
    for (const match of labelled) base[match[2].toUpperCase() as Stat] = Number(match[1]);
    return base;
  }
  const order = STATS
    .map((stat) => ({ stat, position: headerText.indexOf(stat) }))
    .filter((entry) => entry.position >= 0)
    .sort((a, b) => a.position - b.position)
    .map((entry) => entry.stat);
  const numbers = cell.match(/\d+/g)?.map(Number) ?? [];
  order.forEach((stat, index) => {
    if (numbers[index] !== undefined) base[stat] = numbers[index];
  });
  return base;
}

function parseStatTable(rows: string[][]): GuideStatStep[] {
  const headerCells = rows[0];
  const spendColumn = headerCells.findIndex((cell) => /AP each level|Spend/i.test(cell));
  const baseColumn = headerCells.findIndex((cell) => /Base/i.test(cell));
  const steps: GuideStatStep[] = [];
  for (const cells of rows.slice(1)) {
    const levels = parseLevels(cells[0] ?? '');
    if (!levels || spendColumn < 0 || baseColumn < 0) continue;
    steps.push({
      from: levels[0],
      to: levels[1],
      adds: parseStatAdds(cells[spendColumn] ?? ''),
      baseAtEnd: parseBaseStats(cells[baseColumn] ?? '', headerCells[baseColumn]),
    });
  }
  return steps;
}

function parseSkillRow(cells: string[]): GuideSkillStep | null {
  const levels = parseLevels(cells[0] ?? '');
  if (!levels) return null;
  const adds: Record<string, number> = {};
  for (const part of (cells[1] ?? '').split(',')) {
    const match = part.trim().match(/^(.+?)\s*\+\s*(\d+)$/);
    if (match) adds[match[1].trim()] = (adds[match[1].trim()] ?? 0) + Number(match[2]);
  }
  return { from: levels[0], to: levels[1], adds };
}

function parseGearRow(cells: string[]): GuideGear | null {
  const level = Number((cells[0] ?? '').match(/\d+/)?.[0]);
  const item = (cells[1] ?? '').split(' / ')[0].replace(/\s+\d+\s*[WM]\.ATK.*$/i, '').trim();
  if (!level || !item) return null;
  return { level, item };
}

function readTables(html: string): string[][][] {
  return [...html.matchAll(/<table[\s\S]*?<\/table>/g)].map((table) =>
    [...table[0].matchAll(/<tr[\s\S]*?<\/tr>/g)].map((row) =>
      [...row[0].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/g)].map((cell) => decodeHtml(cell[1].replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim())));
}
