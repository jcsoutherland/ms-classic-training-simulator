import { describe, expect, it } from 'vitest';
import { parseRoute, routeHref } from './routes';

describe('parseRoute', () => {
  it('opens the character page when there is no hash', () => {
    expect(parseRoute('')).toEqual({ page: 'character', mapId: null });
  });

  it('reads the map id from a train link', () => {
    expect(parseRoute('#/train/010003090')).toEqual({ page: 'train', mapId: '010003090' });
  });

  it('falls back to the character page for unknown pages', () => {
    expect(parseRoute('#/somewhere')).toEqual({ page: 'character', mapId: null });
  });
});

describe('routeHref', () => {
  it('round-trips a train route with a map', () => {
    expect(parseRoute(routeHref({ page: 'train', mapId: '010002020' }))).toEqual({ page: 'train', mapId: '010002020' });
  });
});
