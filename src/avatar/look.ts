import type { Character } from '../character/types';
import { branchOf } from '../character/jobs';
import type { Item } from '../data/types';
import { FACE, GEAR, HAIR, WEAPONS, type LadderRow, type WeaponRow } from './catalog';

const API = 'https://maplestory.io/api';
const BRANCHES: Record<number, string> = { 0: 'beginner', 100: 'warrior', 200: 'magician', 300: 'bowman', 400: 'thief' };
const WEAPON_TYPE_NAMES: Record<number, string> = {
  30: 'One-Handed Sword', 31: 'One-Handed Axe', 32: 'One-Handed Blunt Weapon', 33: 'Dagger', 37: 'Wand', 38: 'Staff',
  40: 'Two-Handed Sword', 41: 'Two-Handed Axe', 42: 'Two-Handed Blunt', 43: 'Spear', 44: 'Pole Arm',
  45: 'Bow', 46: 'Crossbow', 47: 'Claw',
};
const SLOTS = ['Hat', 'Top', 'Bottom', 'Overall', 'Shoes', 'Glove', 'Cape', 'Earrings'];

export interface Look {
  skin: number;
  hair: number;
  face: number;
  items: number[];
}

export function buildLook(character: Character, items: Map<number, Item>): Look {
  const gender = character.gender === 'female' ? 'f' : 'm';
  const table = GEAR[BRANCHES[branchOf(character.jobId)] ?? 'beginner']?.[gender] ?? {};
  const worn = new Set(character.equipment.map((id) => items.get(id)?.name.toLowerCase()).filter(Boolean));
  const chosen: number[] = [];
  for (const slot of SLOTS) {
    const ladder = table[slot] ?? [];
    const named = ladder.find((row) => worn.has(row[1].toLowerCase()));
    const row = named ?? (slot === 'Overall' ? null : bestRow(ladder, character.level));
    if (row) chosen.push(row[0]);
  }
  const weapon = weaponRow(character, items);
  if (weapon) chosen.push(weapon[0]);
  return { skin: 0, hair: HAIR[gender][1], face: FACE[gender][1], items: chosen };
}

export function frameUrl(look: Look, action: string, frame: number): string {
  const ids = [2000 + look.skin, 12000 + look.skin, look.hair, look.face, ...look.items];
  const parts = ids.map((id) => JSON.stringify({ ItemId: id, Version: '83', Region: 'GMS' })).join(',');
  return `${API}/character/${encodeURIComponent(parts)}/${action}/${frame}?resize=1&renderMode=FeetCenter&bgColor=0,0,0,0`;
}

export function lookKey(look: Look): string {
  return [look.skin, look.hair, look.face, ...look.items].join('.');
}

function weaponRow(character: Character, items: Map<number, Item>): WeaponRow | null {
  const ladder = WEAPONS[WEAPON_TYPE_NAMES[character.weaponType] ?? 'One-Handed Sword'] ?? [];
  const name = character.weaponId !== null ? items.get(character.weaponId)?.name.toLowerCase() : undefined;
  return ladder.find((row) => row[1].toLowerCase() === name) ?? bestRow(ladder, character.level) ?? ladder[0] ?? null;
}

function bestRow<Row extends LadderRow | WeaponRow>(ladder: Row[], level: number): Row | null {
  return [...ladder].reverse().find((row) => row[2] <= level) ?? null;
}
