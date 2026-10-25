import { describe, expect, it } from 'vitest';
import { sampleAssassin } from '../sim/testData';
import { applyReadings } from './readings';

const weapons = new Set([1472009, 1472010]);

describe('applyReadings', () => {
  it('takes stats from a Stats window', () => {
    const updated = applyReadings(sampleAssassin(), [{ kind: 'stats', level: 36, stats: { LUK: 160 } }], weapons);
    expect(updated.stats.LUK).toBe(160);
  });

  it('keeps stats the screenshot could not read', () => {
    const updated = applyReadings(sampleAssassin(), [{ kind: 'stats', stats: { LUK: undefined } }], weapons);
    expect(updated.stats.LUK).toBe(124);
  });

  it('takes the attack range from the Detail window', () => {
    const updated = applyReadings(sampleAssassin(), [{ kind: 'detail', attackMin: 120, attackMax: 230 }], weapons);
    expect([updated.attackMin, updated.attackMax]).toEqual([120, 230]);
  });

  it('merges skills from several scrolled skill screenshots', () => {
    const updated = applyReadings(sampleAssassin(), [{ kind: 'skills', levels: { 4100000: 12 } }, { kind: 'skills', levels: { 4101000: 5 } }], weapons);
    expect([updated.skills[4100000], updated.skills[4101000]]).toEqual([12, 5]);
  });

  it('equips the weapon found in the Equipment window', () => {
    const updated = applyReadings(sampleAssassin(), [{ kind: 'equipment', itemIds: [1002175, 1472010], deco: false, unidentified: 0 }], weapons);
    expect(updated.weaponId).toBe(1472010);
  });
});
