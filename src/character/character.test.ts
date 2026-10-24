import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { Guide, Item } from '../data/types';
import { realGameData } from '../sim/testData';
import { defaultCharacter } from './defaults';
import { statsAtLevel } from './guideBuild';
import { minimumLevel, startingTown } from './jobs';
import { accuracyFor, avoidFor, skillMultiplierScale, statsWindowRange } from './statsWindow';
import { upsertCharacter } from './storage';

const DATA = fileURLToPath(new URL('../../public/data/', import.meta.url));
const guides = JSON.parse(fs.readFileSync(DATA + 'guides.json', 'utf8')) as Guide[];
const items = JSON.parse(fs.readFileSync(DATA + 'items.json', 'utf8')) as Item[];
const data = realGameData();

describe('statsAtLevel', () => {
  it('follows the Assassin guide at level 34', () => {
    expect(statsAtLevel(410, 34, guides)).toMatchObject({ DEX: 30, LUK: 152 });
  });

  it('stops part-way through a guide range', () => {
    expect(statsAtLevel(410, 32, guides).LUK).toBe(142);
  });

  it('keeps adding points the guide way past level 70', () => {
    expect(statsAtLevel(410, 75, guides).LUK).toBeGreaterThan(statsAtLevel(410, 70, guides).LUK);
  });
});

describe('statsWindowRange', () => {
  it('uses meowdb\'s maximum for a claw', () => {
    expect(statsWindowRange(47, { STR: 4, DEX: 30, INT: 4, LUK: 152 }, 38, 0).max).toBe(195);
  });
});

describe('skillMultiplierScale', () => {
  it('makes Lucky Seven hit harder than the stats window shows', () => {
    expect(skillMultiplierScale('Lucky Seven', 47, { STR: 4, DEX: 30, INT: 4, LUK: 152 })).toBeGreaterThan(1);
  });

  it('leaves ordinary skills alone', () => {
    expect(skillMultiplierScale('Double Stab', 33, { STR: 4, DEX: 30, INT: 4, LUK: 152 })).toBe(1);
  });
});

describe('accuracy and avoid', () => {
  it('uses the Thief accuracy formula', () => {
    expect(accuracyFor(410, { STR: 4, DEX: 30, INT: 4, LUK: 152 }, 34)).toBe(63);
  });

  it('uses LUK and DEX for avoid', () => {
    expect(avoidFor({ STR: 4, DEX: 30, INT: 4, LUK: 152 })).toBe(60);
  });
});

describe('defaultCharacter', () => {
  const assassin = defaultCharacter(410, 34, { data, guides, items });

  it('picks Lucky Seven as the main attack', () => {
    expect(assassin.attackMix).toEqual({ 4001003: 100 });
  });

  it('equips a claw', () => {
    expect(assassin.weaponType).toBe(47);
  });

  it('learns the skills the guide spends points on', () => {
    expect(assassin.skills[4100000]).toBeGreaterThan(0);
  });

  it('gives magicians a wand with magic attack', () => {
    expect(defaultCharacter(220, 35, { data, guides, items }).magicAttack).toBeGreaterThan(0);
  });
});

describe('jobs', () => {
  it('starts 2nd jobs at level 30', () => expect(minimumLevel(410)).toBe(30));
  it('sends Thieves to Kerning City', () => expect(startingTown(410)).toBe('kerning'));
});

describe('upsertCharacter', () => {
  it('replaces a saved character with the same id', () => {
    const assassin = defaultCharacter(410, 34, { data, guides, items });
    expect(upsertCharacter([assassin], { ...assassin, level: 35 })[0].level).toBe(35);
  });
});
