import { describe, expect, it } from 'vitest';
import { rankMaps } from './rankMaps';
import { simulateMap } from './simulateMap';
import { flynny, realGameData, realMapDetails, sampleAssassin } from './testData';

const data = realGameData();
const swamp = realMapDetails('010003090');

describe('simulateMap against logged real play', () => {
  const lineTwo = simulateMap(flynny({ level: 39 }), data, realMapDetails('010003066'), 1);

  it('gives Flynny about the 67k EXP an hour logged solo on Line 2 <Area 1>', () => {
    expect(lineTwo.expPerHour).toBeGreaterThan(67375 * 0.8);
  });

  it('does not give Flynny much more than the logged rate', () => {
    expect(lineTwo.expPerHour).toBeLessThan(67375 * 1.25);
  });

  it('defeats about the 1,020 Jr. Wraiths an hour logged', () => {
    expect(lineTwo.killsByMonster.get(32) ?? 0).toBeGreaterThan(1020 * 0.8);
  });

  it('gives each member of a party of 6 less than twice the solo rate', () => {
    const party = simulateMap(flynny(), data, realMapDetails('010003063'), 6);
    const solo = simulateMap(flynny(), data, realMapDetails('010003063'), 1);
    expect(party.expPerHour).toBeLessThan(solo.expPerHour * 2);
  });
});

describe('simulateMap on The Swamp of Despair I', () => {
  const solo = simulateMap(sampleAssassin(), data, swamp, 1);

  it('defeats a believable number of monsters an hour', () => {
    expect(solo.killsPerHour).toBeGreaterThan(800);
  });

  it('cannot defeat more monsters than the map spawns', () => {
    expect(solo.killsPerHour).toBeLessThan(25000);
  });

  it('camps Ligators, the best EXP for this character', () => {
    expect(solo.mainTarget).toBe(29);
  });

  it('gives Ligators far more kills than their share of spawn points', () => {
    const ligators = solo.killsByMonster.get(29) ?? 0;
    expect(ligators / solo.killsPerHour).toBeGreaterThan(0.85);
  });

  it('earns more EXP per hour with a faster weapon', () => {
    expect(simulateMap(sampleAssassin({ weaponSpeed: 2 }), data, swamp, 1).expPerHour).toBeGreaterThan(solo.expPerHour);
  });

  it('earns more as a party in total than alone', () => {
    const party = simulateMap(sampleAssassin(), data, swamp, 3);
    expect(party.expPerHour * 3).toBeGreaterThan(solo.expPerHour);
  });

  it('gives each party member less EXP per kill than playing solo', () => {
    const party = simulateMap(sampleAssassin(), data, swamp, 3);
    expect(party.expPerHour / party.killsPerHour).toBeLessThan(solo.expPerHour / solo.killsPerHour);
  });

  it('records a hit chance for every monster on the map', () => {
    expect([...solo.hitChances.keys()].sort((a, b) => a - b)).toEqual([7, 18, 19, 29]);
  });
});

describe('simulateMap on Line 1 <Area 2>', () => {
  it('camps the many Jr. Wraiths rather than the few Stirges', () => {
    const jrWraith = [...data.monsters.values()].find((monster) => monster.name === 'Jr. Wraith')?.id;
    expect(simulateMap(sampleAssassin(), data, realMapDetails('010003063'), 1).mainTarget).toBe(jrWraith);
  });
});

describe('simulateMap on a map with one kind of monster', () => {
  it('only defeats that monster', () => {
    const wraiths = simulateMap(sampleAssassin({ level: 50, accuracy: 200 }), data, realMapDetails('010003065'), 1);
    expect([...wraiths.killsByMonster.keys()]).toEqual([43]);
  });
});

describe('rankMaps for a level 34 Assassin', () => {
  const rankings = rankMaps(sampleAssassin(), data, realMapDetails, 1, 40);

  it('ranks some maps', () => {
    expect(rankings.ranked.length).toBeGreaterThan(5);
  });

  it('leaves out Line 1 <Area 4> because Wraiths are missed too often', () => {
    const wraiths = rankings.leftOut.find((entry) => entry.map.id === '010003065');
    expect(wraiths?.viability.reason).toBe('too-hard');
  });

  it('leaves out maps full of low-level monsters', () => {
    expect(rankings.leftOut.find((entry) => entry.map.id === '000000040')?.viability.reason).toBe('too-easy');
  });

  it('sorts maps by EXP per hour, best first', () => {
    const rates = rankings.ranked.map((entry) => entry.simulation.expPerHour);
    expect(rates).toEqual([...rates].sort((a, b) => b - a));
  });
});
