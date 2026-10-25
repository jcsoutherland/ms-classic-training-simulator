export type Page = 'character' | 'train' | 'rankings' | 'route';

export interface Route {
  page: Page;
  mapId: string | null;
}

const DEFAULT_ROUTE: Route = { page: 'character', mapId: null };

export function parseRoute(hash: string): Route {
  const [page, mapId] = hash.replace(/^#\/?/, '').split('/');
  if (page === 'train') return { page: 'train', mapId: mapId || null };
  if (page === 'rankings') return { page: 'rankings', mapId: null };
  if (page === 'route') return { page: 'route', mapId: null };
  if (page === 'character') return { page: 'character', mapId: null };
  return DEFAULT_ROUTE;
}

export function routeHref(route: Route): string {
  if (route.page === 'train' && route.mapId) return `#/train/${route.mapId}`;
  return `#/${route.page}`;
}
