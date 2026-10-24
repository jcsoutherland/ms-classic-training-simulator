import type { Character } from '../character/types';
import type { Stat } from '../data/types';

export interface StatReading {
  kind: 'stats';
  name?: string;
  jobId?: number;
  level?: number;
  expPercent?: number;
  stats: Partial<Record<Stat, number>>;
}

export interface DetailReading {
  kind: 'detail';
  attackMin?: number;
  attackMax?: number;
  magic?: number;
  accuracy?: number;
  avoid?: number;
}

export interface SkillReading {
  kind: 'skills';
  levels: Record<number, number>;
}

export interface EquipmentReading {
  kind: 'equipment';
  itemIds: number[];
  emptySlots: string[];
}

export type Reading = StatReading | DetailReading | SkillReading | EquipmentReading;

export function applyReadings(character: Character, readings: Reading[], weaponIds: Set<number>): Character {
  let next = { ...character, stats: { ...character.stats }, skills: { ...character.skills } };
  for (const reading of readings) next = applyReading(next, reading, weaponIds);
  return next;
}

function applyReading(character: Character, reading: Reading, weaponIds: Set<number>): Character {
  switch (reading.kind) {
    case 'stats':
      return {
        ...character,
        name: reading.name || character.name,
        jobId: reading.jobId ?? character.jobId,
        level: reading.level ?? character.level,
        expPercent: reading.expPercent ?? character.expPercent,
        stats: { ...character.stats, ...withoutMissing(reading.stats) },
      };
    case 'detail':
      return {
        ...character,
        attackMin: reading.attackMin ?? character.attackMin,
        attackMax: reading.attackMax ?? character.attackMax,
        accuracy: reading.accuracy ?? character.accuracy,
        avoid: reading.avoid ?? character.avoid,
      };
    case 'skills':
      return { ...character, skills: { ...character.skills, ...reading.levels } };
    case 'equipment': {
      const weapon = reading.itemIds.find((id) => weaponIds.has(id));
      return {
        ...character,
        equipment: reading.itemIds,
        weaponId: weapon ?? character.weaponId,
        weaponType: weapon !== undefined ? Math.floor(weapon / 10000) % 100 : character.weaponType,
      };
    }
  }
}

function withoutMissing(stats: Partial<Record<Stat, number>>): Partial<Record<Stat, number>> {
  return Object.fromEntries(Object.entries(stats).filter(([, value]) => value !== undefined && value > 0)) as Partial<Record<Stat, number>>;
}
