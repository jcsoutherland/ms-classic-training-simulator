import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { realGameData } from '../sim/testData';
import type { Item, Job, MapDetail, MapSummary, Monster } from './types';

const DATA = fileURLToPath(new URL('../../public/data', import.meta.url));

function load<T>(relativePath: string): T {
  return JSON.parse(fs.readFileSync(path.join(DATA, relativePath), 'utf8')) as T;
}

const monsters = load<Monster[]>('mobs.json');
const jobs = load<Job[]>('jobs.json');
const maps = load<MapSummary[]>('maps-index.json');
const items = load<Item[]>('items.json');

describe('extracted monsters', () => {
  it('has Classic Ligator stats', () => {
    expect(monsters.find((monster) => monster.name === 'Ligator')).toMatchObject({ level: 31, hp: 853, exp: 58, avoid: 21 });
  });

  it('has Classic Wraith HP', () => {
    expect(monsters.find((monster) => monster.name === 'Wraith')?.hp).toBe(2350);
  });
});

describe('extracted skills', () => {
  it('covers Beginner and every 1st and 2nd job', () => {
    expect(jobs.map((job) => job.id)).toEqual([0, 100, 110, 120, 130, 200, 210, 220, 230, 300, 310, 320, 400, 410, 420]);
  });

  it('gives Lucky Seven 140% damage with two stars at level 20', () => {
    const luckySeven = jobs.flatMap((job) => job.skills).find((skill) => skill.name === 'Lucky Seven');
    expect(luckySeven?.levels[19]).toMatchObject({ damage: 140, bulletCount: 2 });
  });
});

describe('extracted maps', () => {
  it('counts 63 spawn points on The Swamp of Despair I', () => {
    const swamp = maps.find((map) => map.id === '010003090');
    expect(swamp?.spawnCounts.reduce((total, [, count]) => total + count, 0)).toBe(63);
  });

  it('marks the 2nd job test maps as one-off, but not the open map beside them', () => {
    const instanced = (id: string) => maps.find((map) => map.id === id)?.instanced;
    expect(['080001000', '080001100', '080001200', '080001300'].map(instanced)).toEqual([true, true, true, true]);
    expect(instanced('010004054')).toBe(false);
  });

  it('has a detail file for every map in the index', () => {
    expect(maps.filter((map) => !fs.existsSync(path.join(DATA, 'maps', `${map.id}.json`)))).toEqual([]);
  });

  it('has a scene for every map that says it has one', () => {
    expect(maps.filter((map) => map.hasScene && !fs.existsSync(path.join(DATA, 'scenes', `${map.id}.webp`)))).toEqual([]);
  });

  it('places the swamp stage on the ground', () => {
    expect(load<MapDetail>('maps/010003090.json').stage?.characterY).toBe(128);
  });

  it('has a picture of every monster on a map, flying ones included', () => {
    const shown = new Set(maps.flatMap((map) => map.spawnCounts.map(([id]) => id)));
    expect([...shown].filter((id) => !fs.existsSync(path.join(DATA, 'img', 'mobs', String(id), 'icon.png')))).toEqual([]);
  });
});

describe('extracted items', () => {
  it('marks quest items such as the Alligator Skin Pouch', () => {
    expect(items.find((item) => item.name === 'Alligator Skin Pouch')?.quest).toBe(true);
  });

  it('leaves quest items out of the Ligator drop table', () => {
    const ligatorDrops = realGameData().drops[29].map((entry) => entry.itemId);
    expect(ligatorDrops).not.toContain(items.find((item) => item.name === 'Alligator Skin Pouch')?.id);
  });
});
