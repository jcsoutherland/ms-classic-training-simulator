import { describe, expect, it } from 'vitest';
import { groundBelow } from './maps';

describe('groundBelow', () => {
  it('finds the platform under a point', () => {
    expect(groundBelow([[0, 100, 200, 100]], 50, 60)).toBe(100);
  });

  it('follows a slope', () => {
    expect(groundBelow([[0, 100, 100, 200]], 50, 60)).toBe(150);
  });

  it('picks the nearest platform below, not a lower one', () => {
    expect(groundBelow([[0, 300, 200, 300], [0, 100, 200, 100]], 50, 60)).toBe(100);
  });

  it('returns nothing when no platform covers the point', () => {
    expect(groundBelow([[0, 100, 20, 100]], 50, 60)).toBeNull();
  });
});
