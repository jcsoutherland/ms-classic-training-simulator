import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { defaultCharacter } from '../character/defaults';
import { jobAt, planRoute } from './planRoute';
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
  const plan = planRoute(flynny(), data, realMapDetails, sources, { goalLevel: 50, players: 1, advanceInto: null });

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
    const plan = planRoute(sampleAssassin({ jobId: 400, level: 25 }), data, realMapDetails, sources, { goalLevel: 32, players: 1, advanceInto: 410 });
    expect(plan.stops.find((stop) => stop.fromLevel <= 30 && stop.toLevel > 30)?.jobId).toBe(410);
  });
});
