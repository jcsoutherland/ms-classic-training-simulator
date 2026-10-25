import { describe, expect, it } from 'vitest';
import { advancementChoices } from './advancement';

describe('advancementChoices', () => {
  it('offers the Thief\'s 2nd jobs when a Thief plans past 30', () => expect(advancementChoices(400, 40)).toEqual([410, 420]));
  it('offers nothing when the route stays within the current job', () => expect(advancementChoices(310, 55)).toEqual([]));
});
