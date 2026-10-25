import type { ItemCategory } from '../../../src/data/types';
import { childNodes, type GameFiles } from '../gameFiles';
import type { WzNode } from '../wz/image';

const STRING_FILE = 'String/String_000.wz';

export interface MapName {
  name: string;
  street: string;
}

export interface SkillStrings {
  name: string;
  description: string;
  levelText: string[];
}

export interface Strings {
  maps: Map<string, MapName>;
  mobs: Map<number, string>;
  skills: Map<number, SkillStrings>;
  jobs: Map<number, string>;
  items: Map<number, { name: string; category: ItemCategory }>;
}

const ITEM_FILES: [string, ItemCategory][] = [
  ['Eqp.img', 'equip'], ['Consume.img', 'use'], ['Etc.img', 'etc'], ['Ins.img', 'setup'], ['Cash.img', 'cash'],
];

export function readStrings(files: GameFiles): Strings {
  return {
    maps: readMapNames(files),
    mobs: readMobNames(files),
    ...readSkillNames(files),
    items: readItemNames(files),
  };
}

function readMapNames(files: GameFiles): Map<string, MapName> {
  const names = new Map<string, MapName>();
  for (const [, region] of childNodes(files.image(STRING_FILE, 'Map.img').root)) {
    for (const [id, entry] of childNodes(region)) {
      names.set(id.padStart(9, '0'), { name: String(entry.mapName ?? '').trim(), street: String(entry.streetName ?? '').trim() });
    }
  }
  return names;
}

function readMobNames(files: GameFiles): Map<number, string> {
  const names = new Map<number, string>();
  for (const [id, entry] of childNodes(files.image(STRING_FILE, 'Mob.img').root)) {
    if (typeof entry.name === 'string') names.set(Number(id), entry.name);
  }
  return names;
}

function readSkillNames(files: GameFiles) {
  const skills = new Map<number, SkillStrings>();
  const jobs = new Map<number, string>();
  for (const [id, entry] of childNodes(files.image(STRING_FILE, 'Skill.img').root)) {
    if (typeof entry.bookName === 'string') jobs.set(Number(id), entry.bookName);
    else if (typeof entry.name === 'string') skills.set(Number(id), { name: entry.name, description: String(entry.desc ?? ''), levelText: levelTextOf(entry) });
  }
  return { skills, jobs };
}

function levelTextOf(entry: Record<string, unknown>): string[] {
  const text: string[] = [];
  for (let level = 1; typeof entry[`h${level}`] === 'string'; level++) text.push(String(entry[`h${level}`]));
  return text;
}

function readItemNames(files: GameFiles): Map<number, { name: string; category: ItemCategory }> {
  const items = new Map<number, { name: string; category: ItemCategory }>();
  for (const [file, category] of ITEM_FILES) collectNamed(files.image(STRING_FILE, file).root, category, items);
  return items;
}

function collectNamed(node: WzNode, category: ItemCategory, into: Map<number, { name: string; category: ItemCategory }>): void {
  for (const [key, child] of childNodes(node)) {
    if (/^\d+$/.test(key) && typeof child.name === 'string') into.set(Number(key), { name: child.name, category });
    else collectNamed(child, category, into);
  }
}
