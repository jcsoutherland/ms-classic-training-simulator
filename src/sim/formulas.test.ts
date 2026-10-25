import { describe, expect, it } from 'vitest';
import { accuracyForHitChance, hitChance } from './accuracy';
import { actionMilliseconds, walkPixelsPerSecond } from './attackTime';
import { criticalScale, defenseScale, elementScale, expectedHitsToKill, levelGapScale } from './damage';
import { expToNextLevel, expToReach, levelAfter } from './exp';
import { expPerMember, partyBonus } from './party';
import { tidyHours } from './session';
import { capacityScale } from './spawns';

describe('EXP table', () => {
  it('matches meowdb at level 10', () => expect(expToNextLevel(10)).toBe(1716));
  it('matches meowdb at level 30', () => expect(expToNextLevel(30)).toBe(95700));
  it('matches meowdb at level 50', () => expect(expToNextLevel(50)).toBe(709716));
  it('matches meowdb at level 51', () => expect(expToNextLevel(51)).toBe(748608));
  it('needs one full level from 34 at 0% to reach 35', () => expect(expToReach(34, 0, 35)).toBe(155540));
  it('counts the current EXP percent toward the goal', () => expect(expToReach(34, 50, 35)).toBe(77770));
  it('carries leftover EXP into the next level', () => expect(levelAfter(34, 0, 155540 + 17421.6).level).toBe(35));
});

describe('hit chance', () => {
  it('never lets a level 34 at 92 accuracy hit a level 48 Wraith', () => expect(hitChance(92, 34, 48, 32)).toBe(0));
  it('always hits a monster far below the player', () => expect(hitChance(92, 34, 31, 21)).toBe(1));
  it('matches meowdb: 104 accuracy never misses a Wraith at equal level', () => expect(accuracyForHitChance(1, 48, 48, 32)).toBe(104));
  it('needs 144 accuracy at level 34 to hit a Wraith 75% of the time', () => expect(accuracyForHitChance(0.75, 34, 48, 32)).toBe(144));
});

describe('damage scaling', () => {
  it('reduces damage for a monster 14 levels higher', () => expect(levelGapScale(34, 48)).toBeCloseTo(1 / 1.7, 5));
  it('does not reduce damage against lower monsters', () => expect(levelGapScale(34, 20)).toBe(1));
  it('applies defense as 100 / (DEF + 100)', () => expect(defenseScale(30)).toBeCloseTo(100 / 130, 5));
  it('boosts holy damage against a holy-weak Wraith', () => expect(elementScale('H3', 'h')).toBe(1.25));
  it('reduces ice damage against an ice-resistant Ligator', () => expect(elementScale('I2F3', 'i')).toBe(0.75));
  it('ignores elements the monster has no reaction to', () => expect(elementScale('I2', 'f')).toBe(1));
  it('adds Critical Throw on top of the base critical', () => expect(criticalScale(15, 35)).toBeCloseTo(1.11, 5));
});

describe('expectedHitsToKill', () => {
  it('needs one hit when the lowest hit already defeats the monster', () => {
    expect(expectedHitsToKill(500, 600, 800)).toBe(1);
  });

  it('needs between one and two hits when hits land on both sides of the HP', () => {
    const hits = expectedHitsToKill(982, 500, 900);
    expect(hits > 1 && hits < 2.5).toBe(true);
  });

  it('rewards a little more damage even when the rounded hit count stays the same', () => {
    expect(expectedHitsToKill(982, 540, 1140)).toBeLessThan(expectedHitsToKill(982, 500, 1100));
  });
});

describe('attack time', () => {
  it('rounds an 800 ms stab up to the next 30 ms step on tier 6', () => expect(actionMilliseconds([350, 450], 6)).toBe(810));
  it('speeds the same stab to 720 ms on tier 4', () => expect(actionMilliseconds([350, 450], 4)).toBe(720));
  it('walks 150 px a second at base speed', () => expect(walkPixelsPerSecond(100)).toBe(150));
});

describe('spawns and parties', () => {
  it('keeps 75% of spawn points filled for one player', () => expect(capacityScale(1)).toBe(0.75));
  it('fills every spawn point for six players', () => expect(capacityScale(6)).toBe(1));
  it('gives a party of 4 a 30% bonus', () => expect(partyBonus(4)).toBeCloseTo(0.3, 5));
  it('gives a solo player the full monster EXP', () => expect(expPerMember(58, 1)).toBe(58));
  it('splits EXP three ways and adds the party bonus', () => expect(expPerMember(58, 3)).toBe(23));
});

describe('tidyHours', () => {
  it('rounds to the nearest half hour', () => expect(tidyHours(2.3)).toBe(2.5));
  it('raises anything below half an hour', () => expect(tidyHours(0)).toBe(0.5));
  it('caps very long sessions at 1,000 hours', () => expect(tidyHours(5000)).toBe(1000));
});
