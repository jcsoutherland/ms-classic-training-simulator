import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Item } from '../data/types';
import { itemValue } from './dropValue';

const items = JSON.parse(fs.readFileSync('public/data/items.json', 'utf8')) as Item[];
const value = (name: string) => itemValue(items.find((item) => item.name.trim() === name) as Item);

describe('itemValue', () => {
  it('values a 60% scroll above the same Chaos scroll', () => expect(value('Gloves Attack Scroll: Intermediate')).toBeGreaterThan(value('Gloves Attack Scroll: Chaos')));
  it('values a Chaos scroll above the same 10% scroll', () => expect(value('Gloves Attack Scroll: Chaos')).toBeGreaterThan(value('Gloves Attack Scroll: Greater')));
  it('values a 10% scroll above the same 100% scroll', () => expect(value('Gloves Attack Scroll: Greater')).toBeGreaterThan(value('Gloves Attack Scroll: Lesser')));
  it('values gloves attack above gloves magic attack', () => expect(value('Gloves Attack Scroll: Intermediate')).toBeGreaterThan(value('Gloves Magic Attack Scroll: Intermediate')));
  it('values a gloves scroll above the same stat on a cape', () => expect(value('Cape INT Scroll: Intermediate')).toBeLessThan(value('Gloves Attack Scroll: Intermediate')));
  it('values Ilbi stars above Mokbi stars', () => expect(value('Ilbi Throwing Stars')).toBeGreaterThan(value('Mokbi Throwing Stars')));
  it('values a 100% scroll above throwing stars', () => expect(value('Gloves Attack Scroll: Lesser')).toBeGreaterThan(value('Ilbi Throwing Stars')));
  it('values throwing stars above gear', () => expect(value('Ilbi Throwing Stars')).toBeGreaterThan(value('Green Legolier')));
  it('gives etc items no value', () => expect(value('Tablecloth')).toBe(0));

  const gear = (requiredJobs: number, bonus: Item['bonus']): Item => ({ id: 1040000, name: 'Test top', category: 'equip', requiredLevel: 40, requiredJobs, bonus });
  it('values thief gear above warrior gear of the same level', () => expect(itemValue(gear(8, {}))).toBeGreaterThan(itemValue(gear(1, {}))));
  it('values thief gear with LUK above thief gear without it', () => expect(itemValue(gear(8, { LUK: 2 }))).toBeGreaterThan(itemValue(gear(8, { DEX: 2 }))));
});
