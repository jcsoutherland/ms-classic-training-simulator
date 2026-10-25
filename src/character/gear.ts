import type { Character } from './types';
import { branchOf } from './jobs';

const SLOTS: [low: number, high: number, slot: string][] = [
  [100, 100, 'Hat'], [101, 101, 'Face'], [102, 102, 'Eyes'], [103, 103, 'Earrings'], [104, 104, 'Top'], [105, 105, 'Overall'],
  [106, 106, 'Bottom'], [107, 107, 'Shoes'], [108, 108, 'Gloves'], [109, 109, 'Shield'], [110, 110, 'Cape'], [111, 111, 'Ring'],
  [130, 170, 'Weapon'],
];
const SLOT_ORDER = ['Hat', 'Face', 'Eyes', 'Earrings', 'Top', 'Overall', 'Bottom', 'Gloves', 'Shoes', 'Cape', 'Shield', 'Ring', 'Weapon'];
const GENDERED_SLOTS = [104, 105, 106];
const FEMALE_DIGIT = 1;
const JOB_WEAPONS: Record<number, number[]> = {
  100: [30, 31, 32, 40, 41, 42, 43, 44],
  200: [37, 38],
  300: [45, 46],
  400: [33, 47],
};

export function slotOf(itemId: number): string | null {
  const prefix = Math.floor(itemId / 10000);
  return SLOTS.find(([low, high]) => prefix >= low && prefix <= high)?.[2] ?? null;
}

export function equipmentBySlot(itemIds: number[]): { slot: string; itemId: number }[] {
  return itemIds
    .map((itemId) => ({ slot: slotOf(itemId), itemId }))
    .filter((entry): entry is { slot: string; itemId: number } => entry.slot !== null)
    .sort((a, b) => SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot));
}

export function isFemaleOnly(itemId: number): boolean {
  return GENDERED_SLOTS.includes(Math.floor(itemId / 10000)) && Math.floor(itemId / 1000) % 10 === FEMALE_DIGIT;
}

export function withGenderFromGear(character: Character): Character {
  return character.equipment.some(isFemaleOnly) ? { ...character, gender: 'female' } : character;
}

export function weaponFitsJob(weaponType: number, jobId: number): boolean {
  const allowed = JOB_WEAPONS[branchOf(jobId)];
  if (!allowed) return true;
  if (jobId === 310) return weaponType === 45;
  if (jobId === 320) return weaponType === 46;
  if (jobId === 410) return weaponType === 47;
  if (jobId === 420) return weaponType === 33;
  return allowed.includes(weaponType);
}
