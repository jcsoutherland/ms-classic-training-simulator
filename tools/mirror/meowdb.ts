import type { MesoRange, Monster } from '../../src/data/types';
import { decodeHtml, normalizeName, type ClassicNames } from './names';
import { politeJson, politeText } from './politeFetch';

export const MEOWDB = 'https://meowdb.com/msclassic';

interface MesoReports {
  summary?: { trustedCount?: number; medianMin?: number; medianMax?: number; medianDropChancePct?: number };
}

export function estimatedMesos(level: number): MesoRange {
  const base = Math.floor(2.1 * level) + 3;
  return { min: Math.floor(base * 0.9), max: Math.floor(base * 1.1), chance: 1, reported: false };
}

export async function readMesos(monsters: Monster[], onProgress: (done: number) => void): Promise<Record<number, MesoRange>> {
  const mesos: Record<number, MesoRange> = {};
  for (const [index, monster] of monsters.entries()) {
    const reports = await politeJson<MesoReports>(`${MEOWDB}/api/mesos-reports?monsterId=${monster.id}`);
    const summary = reports.summary;
    mesos[monster.id] = summary && summary.trustedCount && summary.medianMin !== undefined && summary.medianMax !== undefined
      ? { min: summary.medianMin, max: summary.medianMax, chance: (summary.medianDropChancePct ?? 100) / 100, reported: true }
      : estimatedMesos(monster.level);
    onProgress(index + 1);
  }
  return mesos;
}

export async function readItemLinks(names: ClassicNames): Promise<Record<number, number>> {
  const html = await politeText(`${MEOWDB}/item-db/all`);
  const links: Record<number, number> = {};
  for (const match of html.matchAll(/href="\/msclassic\/item-db\/(\d+)">([^<]+)</g)) {
    const classicId = names.itemIdsByName.get(normalizeName(decodeHtml(match[2])));
    if (classicId !== undefined && !(classicId in links)) links[classicId] = Number(match[1]);
  }
  if (Object.keys(links).length < names.items.length / 4) {
    throw new Error(`Only ${Object.keys(links).length} meowdb item links were found; the page layout may have changed.`);
  }
  return links;
}
