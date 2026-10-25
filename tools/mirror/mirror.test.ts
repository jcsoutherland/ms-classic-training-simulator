import { describe, expect, it } from 'vitest';
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
