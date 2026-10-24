import { describe, expect, it } from 'vitest';
import { chanceOfAtLeastOne, rollCount, rollDrops, seededRandom } from './drops';

describe('rollCount', () => {
  it('lands near the average for common drops', () => {
    expect(Math.abs(rollCount(10000, 0.5, seededRandom(1)) - 5000)).toBeLessThan(250);
  });

  it('gives the same roll for the same seed', () => {
    expect(rollCount(4510, 0.0001, seededRandom(7))).toBe(rollCount(4510, 0.0001, seededRandom(7)));
  });

  it('averages correctly for rare drops over many rolls', () => {
    const random = seededRandom(3);
    let total = 0;
    for (let run = 0; run < 4000; run++) total += rollCount(4510, 0.0001, random);
    expect(total / 4000).toBeCloseTo(0.451, 1);
  });

  it('never drops anything from zero kills', () => {
    expect(rollCount(0, 0.5, seededRandom(1))).toBe(0);
  });
});

describe('chanceOfAtLeastOne', () => {
  it('gives about 36% for a 1-in-10,000 drop over 4,510 kills', () => {
    expect(chanceOfAtLeastOne(4510, 0.0001)).toBeCloseTo(0.363, 3);
  });
});

describe('rollDrops', () => {
  it('multiplies stackable drops by their average stack size', () => {
    const drops = rollDrops(new Map([[1, 1000]]), { 1: [{ itemId: 2060000, chance: 1, min: 20, max: 30 }] }, seededRandom(1));
    expect(drops[0].count).toBe(25000);
  });
});
