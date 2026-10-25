import { describe, expect, it } from 'vitest';
import { damagePerTarget, healAttack } from './attacks';
import { buffTotals } from './buffs';
import { characterSkills } from './simulateMap';
import { realGameData, sampleAssassin } from './testData';

const data = realGameData();
const cleric = sampleAssassin({ jobId: 230, stats: { STR: 4, DEX: 25, INT: 200, LUK: 4 }, magicAttack: 70, skills: { 2301001: 30 }, attackMix: {} });
const skills = characterSkills(cleric, data);
const heal = healAttack(cleric, skills, data.actions);

describe('Heal', () => {
  it('damages undead monsters such as the Jr. Wraith', () => {
    expect(damagePerTarget(heal!, cleric, data.monsters.get(32)!, buffTotals(cleric, skills)).lowest).toBeGreaterThan(0);
  });

  it('does nothing to living monsters such as the Ligator', () => {
    expect(damagePerTarget(heal!, cleric, data.monsters.get(29)!, buffTotals(cleric, skills)).lowest).toBe(0);
  });
});
