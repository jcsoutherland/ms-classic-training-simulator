import { indexGameData, type GameData } from './gameData';
import type { Animations, Guide, Item, MapDetail, Monster, Weapon } from './types';

export const DATA_URL = `${import.meta.env.BASE_URL}data/`;

export interface SiteData {
  game: GameData;
  items: Map<number, Item>;
  itemList: Item[];
  itemLinks: Record<number, number>;
  guides: Guide[];
}

export async function fetchJson<T>(file: string): Promise<T> {
  const response = await fetch(DATA_URL + file);
  if (!response.ok) throw new Error(`Couldn't load ${file} (${response.status}). Check your connection and reload the page.`);
  const type = response.headers.get('content-type') ?? '';
  if (type.includes('text/html')) throw new Error(`${file} is missing from the site's data.`);
  return response.json() as Promise<T>;
}

export async function loadSiteData(): Promise<SiteData> {
  const [monsters, jobs, actions, weapons, maps, mesos, drops, itemList, itemLinks, guides] = await Promise.all([
    fetchJson<Monster[]>('mobs.json'),
    fetchJson<GameData['jobs']>('jobs.json'),
    fetchJson<GameData['actions']>('actions.json'),
    fetchJson<Weapon[]>('weapons.json'),
    fetchJson<GameData['maps']>('maps-index.json'),
    fetchJson<GameData['mesos']>('mesos.json'),
    fetchJson<GameData['drops']>('drops.json'),
    fetchJson<Item[]>('items.json'),
    fetchJson<Record<number, number>>('item-links.json'),
    fetchJson<Guide[]>('guides.json'),
  ]);
  return {
    game: indexGameData({ monsters, jobs, actions, weapons, maps, mesos, drops }),
    items: new Map(itemList.map((item) => [item.id, item])),
    itemList,
    itemLinks,
    guides,
  };
}

const detailCache = new Map<string, Promise<MapDetail>>();

export function loadMapDetail(mapId: string): Promise<MapDetail> {
  let pending = detailCache.get(mapId);
  if (!pending) {
    pending = fetchJson<MapDetail>(`maps/${mapId}.json`);
    detailCache.set(mapId, pending);
  }
  return pending;
}

let animations: Promise<{ mobs: Record<number, Animations>; skills: Record<number, Animations>; bullets: Record<number, Animations[string]> }> | null = null;

export function loadAnimations() {
  animations ??= Promise.all([
    fetchJson<Record<number, Animations>>('mob-animations.json'),
    fetchJson<Record<number, Animations>>('skill-animations.json'),
    fetchJson<Record<number, Animations[string]>>('bullets.json'),
  ]).then(([mobs, skills, bullets]) => ({ mobs, skills, bullets }));
  return animations;
}

export function imageUrl(path: string): string {
  return DATA_URL + path;
}

export function meowdbItemUrl(itemId: number, itemLinks: Record<number, number>): string {
  const page = itemLinks[itemId];
  return page ? `https://meowdb.com/msclassic/item-db/${page}` : 'https://meowdb.com/msclassic/item-db/all';
}

export function meowdbRouteUrl(mapId: string): string {
  return `https://meowdb.com/msclassic/pathfinder?to=${mapId}&taxi=1`;
}
