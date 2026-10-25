import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { defaultCharacter } from '../character/defaults';
import { jobAt, pick, planRoute } from './planRoute';
import { projectCharacter, skillsTowardGuide } from './projectCharacter';
import { flynny, realGameData, realMapDetails, sampleAssassin } from './testData';

const data = realGameData();
const sources = { data, guides: JSON.parse(fs.readFileSync('public/data/guides.json', 'utf8')), items: JSON.parse(fs.readFileSync('public/data/items.json', 'utf8')) };

describe('projectCharacter', () => {
  it('grows DEX at the guide\'s pace', () => {
    const growth = defaultCharacter(310, 50, sources).stats.DEX - defaultCharacter(310, 40, sources).stats.DEX;
    expect(projectCharacter(flynny(), 50, 310, sources).stats.DEX).toBe(flynny().stats.DEX + growth);
  });

  it('keeps a character that is ahead of the guide ahead', () => {
    const guideAttack = defaultCharacter(310, 50, sources).attackMax;
    expect(projectCharacter(flynny(), 50, 310, sources).attackMax).toBeGreaterThan(guideAttack);
  });
});

describe('skillsTowardGuide', () => {
  it('spends only the skill points earned since now', () => {
    const next = skillsTowardGuide({ 1: 5 }, { 1: 5, 2: 0 }, { 1: 5, 2: 3 });
    expect(next).toEqual({ 1: 5, 2: 3 });
  });

  it('moves an off-guide build toward the guide without going over the points earned', () => {
    const next = skillsTowardGuide({ 1: 10 }, { 1: 5, 2: 5 }, { 1: 5, 2: 8 });
    expect(Object.values(next).reduce((total, level) => total + level, 0)).toBe(13);
  });
});

describe('jobAt', () => {
  it('advances a level 29 Thief into Assassin at 30', () => expect([jobAt(400, 410, 29), jobAt(400, 410, 30)]).toEqual([400, 410]));
  it('makes a Beginner a Thief at 10 on the way to Assassin', () => expect(jobAt(0, 410, 10)).toBe(400));
});

describe('planRoute for Flynny from 40 to 50', () => {
  const plan = planRoute(flynny(), data, realMapDetails, sources, { goalLevel: 50, players: 1, advanceInto: null, style: 'fastest' });

  it('covers every level from 40 to 50 with no gaps', () => {
    const levels = plan.stops.flatMap((stop) => Array.from({ length: stop.toLevel - stop.fromLevel }, (_, index) => stop.fromLevel + index));
    expect(levels).toEqual([40, 41, 42, 43, 44, 45, 46, 47, 48, 49]);
  });

  it('never sends you to a boss map', () => {
    expect(plan.stops.filter((stop) => data.maps.find((map) => map.id === stop.mapId)?.bossOnly)).toEqual([]);
  });

  it('gives every stop a positive number of hours', () => {
    expect(plan.stops.every((stop) => stop.hours > 0)).toBe(true);
  });
});

describe('planRoute for a level 25 Thief heading to Assassin', () => {
  it('trains as an Assassin from level 30', () => {
    const plan = planRoute(sampleAssassin({ jobId: 400, level: 25 }), data, realMapDetails, sources, { goalLevel: 32, players: 1, advanceInto: 410, style: 'fastest' });
    expect(plan.stops.find((stop) => stop.fromLevel <= 30 && stop.toLevel > 30)?.jobId).toBe(410);
  });
});

describe('pick', () => {
  const here = { name: 'here', score: 100 };
  it('stays when the best map is under 10% better', () => expect(pick([{ name: 'other', score: 109 }, here], here, 'fastest', 1)).toBe(here));
  it('switches when the best map is at least 10% better', () => expect(pick([{ name: 'other', score: 111 }, here], here, 'fastest', 1).name).toBe('other'));
  it('swaps to the best map every 3 levels when swapping often', () => expect(pick([{ name: 'other', score: 101 }, here], here, 'swapOften', 3).name).toBe('other'));
  it('stays between swaps when swapping often', () => expect(pick([{ name: 'other', score: 150 }, here], here, 'swapOften', 2)).toBe(here));
});

describe('planRoute runner-ups and styles', () => {
  const fastest = planRoute(flynny(), data, realMapDetails, sources, { goalLevel: 45, players: 1, advanceInto: null, style: 'fastest' });

  it('offers at most 3 other maps for each stop', () => {
    expect(fastest.stops.every((stop) => stop.runnerUps.length <= 3)).toBe(true);
  });

  it('never lists the chosen map as its own runner-up', () => {
    expect(fastest.stops.some((stop) => stop.runnerUps.some((option) => option.mapId === stop.mapId))).toBe(false);
  });

  it('plans a route for every play style', () => {
    const styles = ['swapOften', 'mesos', 'rareDrops'] as const;
    expect(styles.map((style) => planRoute(flynny(), data, realMapDetails, sources, { goalLevel: 43, players: 1, advanceInto: null, style }).stops.length > 0)).toEqual([true, true, true]);
  });
});
