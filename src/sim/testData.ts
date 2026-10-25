import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Character } from '../character/types';
import { indexGameData, type GameData, type MapDetails } from '../data/gameData';
import type { MapDetail } from '../data/types';

const DATA = fileURLToPath(new URL('../../public/data', import.meta.url));

function load<T>(file: string): T {
  return JSON.parse(fs.readFileSync(path.join(DATA, file), 'utf8')) as T;
}

export function realGameData(): GameData {
  return indexGameData({
    monsters: load('mobs.json'),
    jobs: load('jobs.json'),
    actions: load('actions.json'),
    weapons: load('weapons.json'),
    maps: load('maps-index.json'),
    mesos: load('mesos.json'),
    drops: load('drops.json'),
    items: load('items.json'),
  });
}

export const realMapDetails: MapDetails = (mapId) => load<MapDetail>(`maps/${mapId}.json`);

export function sampleAssassin(changes: Partial<Character> = {}): Character {
  return {
    id: 'sample',
    name: 'Mossbeard',
    jobId: 410,
    level: 34,
    expPercent: 0,
    gender: 'male',
    stats: { STR: 4, DEX: 70, INT: 4, LUK: 124 },
    attackMin: 318,
    attackMax: 612,
    weaponAttack: 23,
    magicAttack: 0,
    accuracy: 92,
    avoid: 61,
    weaponId: 1472009,
    weaponType: 47,
    weaponSpeed: 4,
    skills: { 4001003: 20, 4000000: 15, 4000001: 8, 4100000: 9, 4100001: 2, 4101000: 1, 4101001: 1 },
    attackMix: { 4001003: 100 },
    equipment: [],
    ...changes,
  };
}

export function flynny(changes: Partial<Character> = {}): Character {
  return {
    id: 'flynny',
    name: 'Flynny',
    jobId: 310,
    level: 40,
    expPercent: 25,
    gender: 'male',
    stats: { STR: 40, DEX: 196, INT: 4, LUK: 4 },
    attackMin: 283,
    attackMax: 359,
    weaponAttack: 60,
    magicAttack: 0,
    accuracy: 88,
    avoid: 41,
    criticalRate: 37,
    criticalDamage: 137,
    weaponId: 1452006,
    weaponType: 45,
    weaponSpeed: 6,
    skills: { 3000000: 15, 3000001: 15, 3001000: 10, 3001003: 1, 3001001: 20, 3100000: 20, 3100001: 1, 3101000: 1, 3101001: 5, 3101003: 2, 3101004: 2 },
    attackMix: { 3001001: 100 },
    equipment: [],
    ...changes,
  };
}
