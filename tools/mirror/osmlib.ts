import type { DropEntry, DropTables } from '../../src/data/types';
import { normalizeName, type ClassicNames } from './names';
import { politeJson, politeText } from './politeFetch';

const SITE = 'https://osmlib.com/';

interface TranslatedName {
  name: string;
}

export interface OsmlibResult {
  drops: DropTables;
  matchedMonsters: number;
  unmatchedItems: string[];
}

export async function readOsmlibDrops(names: ClassicNames): Promise<OsmlibResult> {
  const bundle = await findDropBundle();
  const monsterNames = await politeJson<Record<string, TranslatedName>>(`${SITE}translations/en/mobs.json`);
  const itemNames = await politeJson<Record<string, TranslatedName>>(`${SITE}translations/en/items.json`);
  const osmlibTables = parseRewardTables(bundle);
  const tablesByName = new Map<string, DropEntry[]>();
  const unmatchedItems = new Set<string>();
  for (const [osmlibMobId, rewards] of osmlibTables) {
    const mobName = monsterNames[osmlibMobId]?.name;
    if (!mobName || tablesByName.has(normalizeName(mobName))) continue;
    const entries: DropEntry[] = [];
    for (const reward of rewards) {
      const itemName = itemNames[String(reward.itemId)]?.name;
      const classicId = itemName ? names.itemIdsByName.get(normalizeName(itemName)) : undefined;
      if (classicId === undefined) {
        unmatchedItems.add(itemName ?? `osmlib item ${reward.itemId}`);
        continue;
      }
      entries.push({ ...reward, itemId: classicId });
    }
    tablesByName.set(normalizeName(mobName), entries);
  }
  const drops: DropTables = {};
  for (const monster of names.monsters) {
    const table = tablesByName.get(normalizeName(monster.name));
    if (table) drops[monster.id] = table;
  }
  return { drops, matchedMonsters: Object.keys(drops).length, unmatchedItems: [...unmatchedItems].sort() };
}

export function parseRewardTables(bundle: string): Map<string, DropEntry[]> {
  const tables = new Map<string, DropEntry[]>();
  for (const match of bundle.matchAll(/(\d+):\{mobID:\1,rewards:\[([^\]]*)\]/g)) {
    const rewards: DropEntry[] = [];
    for (const reward of match[2].matchAll(/\{prob:([\d.e-]+),itemID:([\d.e]+)(?:,min:(\d+),max:(\d+))?\}/g)) {
      const entry: DropEntry = { itemId: Math.round(Number(reward[2])), chance: Number(reward[1]) };
      if (reward[3] !== undefined) {
        entry.min = Number(reward[3]);
        entry.max = Number(reward[4]);
      }
      rewards.push(entry);
    }
    tables.set(match[1], rewards);
  }
  return tables;
}

async function findDropBundle(): Promise<string> {
  const page = await politeText(SITE);
  const scripts = [...page.matchAll(/src="\/([^"]+\.js)"/g)].map((match) => match[1]);
  const runtime = scripts.find((script) => script.startsWith('runtime'));
  const chunkNames = runtime ? chunkFiles(await politeText(SITE + runtime)) : [];
  for (const script of [...chunkNames, ...scripts]) {
    const text = await politeText(SITE + script);
    if (text.includes('mobID:') && text.includes('rewards:[')) return text;
  }
  throw new Error("Couldn't find osmlib's drop tables; its site layout may have changed.");
}

function chunkFiles(runtime: string): string[] {
  const hashes = runtime.match(/\{(\d+:"[0-9a-f]+",?)+\}/)?.[0];
  if (!hashes) return [];
  return [...hashes.matchAll(/(\d+):"([0-9a-f]+)"/g)].map((match) => `${match[1]}.${match[2]}.chunk.js`);
}
