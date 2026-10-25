import { describe, expect, it } from 'vitest';
import { parseBaseStats, parseLevels, parseStatAdds } from './guides';
import { estimatedMesos } from './meowdb';
import { classicScrollName, normalizeName } from './names';
import { parseRewardTables } from './osmlib';

describe('parseRewardTables', () => {
  const bundle = '3110100:{mobID:3110100,rewards:[{prob:.5,itemID:4000032},{prob:.008,itemID:206e4,min:20,max:30}],mesos:[]}';

  it('reads a drop chance', () => {
    expect(parseRewardTables(bundle).get('3110100')?.[0]).toEqual({ itemId: 4000032, chance: 0.5 });
  });

  it('expands item ids written in exponent form', () => {
    expect(parseRewardTables(bundle).get('3110100')?.[1].itemId).toBe(2060000);
  });

  it('keeps stack sizes for arrows and stars', () => {
    expect(parseRewardTables(bundle).get('3110100')?.[1]).toMatchObject({ min: 20, max: 30 });
  });
});

describe('guide parsing', () => {
  it('reads a level range', () => {
    expect(parseLevels('31-34')).toEqual([31, 34]);
  });

  it('reads a single level', () => {
    expect(parseLevels('35')).toEqual([35, 35]);
  });

  it('adds up stat points written several ways', () => {
    expect(parseStatAdds('STR +2, DEX +3')).toEqual({ STR: 2, DEX: 3 });
  });

  it('reads labelled base stats', () => {
    expect(parseBaseStats('12 STR / 5 DEX / 4 INT / 4 LUK', 'Base stats after spending')).toEqual({ STR: 12, DEX: 5, INT: 4, LUK: 4 });
  });

  it('reads base stats in the order the header names them', () => {
    expect(parseBaseStats('30 / 132', 'Base DEX / LUK at the end')).toEqual({ DEX: 30, LUK: 132 });
  });
});

describe('estimatedMesos', () => {
  it('uses meowdb\'s estimate around floor(2.1 x level) + 3', () => {
    expect(estimatedMesos(31)).toEqual({ min: 61, max: 74, chance: 1, reported: false });
  });
});

describe('normalizeName', () => {
  it('ignores case and curly apostrophes', () => {
    expect(normalizeName('Amazon’s Judgement')).toBe(normalizeName("amazon's judgement"));
  });

  it('matches names that differ only by hyphens, spaces or stray punctuation', () => {
    expect(['Mokbi Throwing-Stars', 'Red Magicshoes', 'Green Apple.'].map(normalizeName)).toEqual(['Mokbi Throwing Stars', 'Red Magic Shoes', 'Green Apple'].map(normalizeName));
  });
});

describe('classicScrollName', () => {
  it('turns a 10% GMS scroll into the Greater Classic scroll', () => {
    expect(classicScrollName('Scroll for Cape for INT 10%')).toBe('Cape INT Scroll: Greater');
  });

  it('renames slots and stats the Classic way', () => {
    expect(classicScrollName('Scroll for Two-handed BW for ATT 60%')).toBe('Two-handed Blunt Weapon Attack Scroll: Intermediate');
  });

  it('leaves out Dark scroll rates Classic has no tier for', () => {
    expect(classicScrollName('Scroll for Cape for HP 70%')).toBeNull();
  });
});
