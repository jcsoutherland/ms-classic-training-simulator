import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { Guide, Item } from '../data/types';
import { realGameData } from '../sim/testData';
import { defaultCharacter, withUsableAttackMix } from './defaults';
import { statsAtLevel } from './guideBuild';
import { jobsAtLevel, minimumLevel, startingTown } from './jobs';
import { accuracyFor, avoidFor, skillMultiplierScale, statsWindowRange } from './statsWindow';
import { removeCharacter, upsertCharacter } from './storage';
import { stepDown, stepUp } from './attackMix';
import { equipmentBySlot, isFemaleOnly, weaponFitsJob } from './gear';

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

describe('removeCharacter', () => {
  it('keeps every other saved character', () => {
    const assassin = { ...defaultCharacter(410, 34, { data, guides, items }), id: 'assassin' };
    const hunter = { ...defaultCharacter(310, 34, { data, guides, items }), id: 'hunter' };
    expect(removeCharacter([assassin, hunter], 'assassin').map((character) => character.id)).toEqual(['hunter']);
  });
});

describe('guide builds', () => {
  it('gives a Bandit an attack its dagger can use', () => {
    const bandit = defaultCharacter(420, 40, { data, guides, items });
    const [main] = Object.keys(bandit.attackMix).map(Number);
    expect(data.skills.get(main)?.name).toBe('Double Stab');
  });
});

describe('jobsAtLevel', () => {
  it('offers only 2nd jobs and Beginner at level 40', () => {
    expect(jobsAtLevel(40)).toEqual([0, 110, 120, 130, 210, 220, 230, 310, 320, 410, 420]);
  });

  it('offers only 1st jobs and Beginner at level 20', () => {
    expect(jobsAtLevel(20)).toEqual([0, 100, 200, 300, 400]);
  });
});

describe('attack use steps', () => {
  it('goes up to the next ten first', () => expect(stepUp(46)).toBe(50));
  it('goes up a full ten from a round number', () => expect(stepUp(50)).toBe(60));
  it('goes down to the ten below first', () => expect(stepDown(46)).toBe(40));
  it('never goes below zero', () => expect(stepDown(0)).toBe(0));
  it('never goes above 100', () => expect(stepUp(100)).toBe(100));
});

describe('gear', () => {
  it('knows a female top is female only', () => expect(isFemaleOnly(1041004)).toBe(true));
  it('knows a male top is not female only', () => expect(isFemaleOnly(1040042)).toBe(false));
  it('orders equipment by slot with the weapon last', () => {
    expect(equipmentBySlot([1452006, 1002090, 1060034]).map((entry) => entry.slot)).toEqual(['Hat', 'Bottom', 'Weapon']);
  });
  it('does not let a Warrior use a claw', () => expect(weaponFitsJob(47, 110)).toBe(false));
});

describe('withUsableAttackMix', () => {
  it('switches to an attack the character can use after a job change', () => {
    const hunter = { ...defaultCharacter(310, 40, { data, guides, items }), attackMix: { 4001003: 100 } };
    const skills = data.jobs.filter((job) => [0, 300, 310].includes(job.id)).flatMap((job) => job.skills);
    expect(Object.keys(withUsableAttackMix(hunter, skills).attackMix)).not.toContain('4001003');
  });
});
