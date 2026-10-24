import type { MapDetail, MapSummary, Region, SpawnPoint, StagePlacement } from '../../../src/data/types';
import { childNodes, numberOf, type GameFiles } from '../gameFiles';
import type { WzNode } from '../wz/image';
import type { Strings } from './strings';

export const MAP_FILE = 'Map/Map/Map0/Map0_000.wz';
const REGIONS: Region[] = ['Henesys', 'Ellinia', 'Perion', 'KerningCity', 'Dungeon', 'Rith', 'Amherst', 'MushroomVillage', 'SouthPerry', 'ForgottenHollow'];
const STAGE_GAP = 130;
const STAGE_CHARACTER = { x: 110, y: 128 };
export const STAGE_SIZE = { width: 348, height: 160 };

export interface ExtractedMap {
  summary: MapSummary;
  detail: MapDetail;
  camera: { x: number; y: number } | null;
}

export function mapIds(files: GameFiles): string[] {
  return files.packageImageNames(MAP_FILE).map((name) => name.replace('.img', '')).sort();
}

export function readMap(files: GameFiles, strings: Strings, id: string): ExtractedMap {
  const root = files.image(MAP_FILE, `${id}.img`).root;
  const info = (root.info ?? {}) as WzNode;
  const spawns = readSpawns(root);
  const footholds = readFootholds(root);
  const placement = findStagePlacement(spawns, footholds);
  const names = strings.maps.get(id) ?? { name: `Map ${id}`, street: '' };
  const summary: MapSummary = {
    id,
    name: names.name,
    street: names.street,
    region: regionOf(info.mapMark),
    mobRate: numberOf(info.mobRate) ?? 1,
    spawnCounts: countSpawns(spawns),
    hasScene: placement !== null,
    instanced: isInstanced(info),
  };
  const detail: MapDetail = {
    id,
    bounds: boundsOf(info, footholds),
    spawns,
    footholds,
    ropes: readRopes(root),
    stage: placement?.stage ?? null,
  };
  return { summary, detail, camera: placement?.camera ?? null };
}

export function groundBelow(footholds: MapDetail['footholds'], x: number, fromY: number): number | null {
  let best: number | null = null;
  for (const [x1, y1, x2, y2] of footholds) {
    const low = Math.min(x1, x2);
    const high = Math.max(x1, x2);
    if (x < low || x > high || x1 === x2) continue;
    const y = y1 + (y2 - y1) * (x - x1) / (x2 - x1);
    if (y >= fromY - 12 && (best === null || y < best)) best = y;
  }
  return best;
}

function readSpawns(root: WzNode): SpawnPoint[] {
  return childNodes(root.life as WzNode | undefined)
    .map(([, life]) => life)
    .filter((life) => life.type === 'm')
    .map((life) => ({
      mobId: Number(life.id),
      x: numberOf(life.x) ?? 0,
      y: numberOf(life.cy) ?? numberOf(life.y) ?? 0,
      wanderLeft: numberOf(life.rx0) ?? 0,
      wanderRight: numberOf(life.rx1) ?? 0,
      respawnSeconds: numberOf(life.mobTime) ?? 0,
    }));
}

function readFootholds(root: WzNode): MapDetail['footholds'] {
  const footholds: MapDetail['footholds'] = [];
  for (const [, layer] of childNodes(root.foothold as WzNode | undefined)) {
    for (const [, group] of childNodes(layer)) {
      for (const [, segment] of childNodes(group)) {
        const x1 = numberOf(segment.x1) ?? 0;
        const x2 = numberOf(segment.x2) ?? 0;
        if (x1 === x2) continue;
        footholds.push([x1, numberOf(segment.y1) ?? 0, x2, numberOf(segment.y2) ?? 0]);
      }
    }
  }
  return footholds;
}

function readRopes(root: WzNode): MapDetail['ropes'] {
  return childNodes(root.ladderRope as WzNode | undefined)
    .map(([, rope]) => [numberOf(rope.x) ?? 0, numberOf(rope.y1) ?? 0, numberOf(rope.y2) ?? 0] as [number, number, number]);
}

function countSpawns(spawns: SpawnPoint[]): MapSummary['spawnCounts'] {
  const counts = new Map<number, number>();
  for (const spawn of spawns) counts.set(spawn.mobId, (counts.get(spawn.mobId) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

function isInstanced(info: WzNode): boolean {
  return (numberOf(info.timeLimit) ?? 0) > 0
    || numberOf(info.genReturnMap) === 1
    || (numberOf(info.fieldType) ?? 0) > 0
    || numberOf(info.town) === 1
    || (isSentBack(info) && (numberOf(info.fieldLimit) ?? 0) > 0);
}

const NO_FORCED_RETURN = 999999999;

function isSentBack(info: WzNode): boolean {
  const target = numberOf(info.forcedReturn);
  return target !== undefined && target !== NO_FORCED_RETURN;
}

function regionOf(mark: unknown): Region {
  return REGIONS.includes(mark as Region) ? (mark as Region) : 'Other';
}

function boundsOf(info: WzNode, footholds: MapDetail['footholds']): MapDetail['bounds'] {
  const left = numberOf(info.VRLeft);
  const top = numberOf(info.VRTop);
  const right = numberOf(info.VRRight);
  const bottom = numberOf(info.VRBottom);
  if (left !== undefined && top !== undefined && right !== undefined && bottom !== undefined) return [left, top, right, bottom];
  const xs = footholds.flatMap(([x1, , x2]) => [x1, x2]);
  const ys = footholds.flatMap(([, y1, , y2]) => [y1, y2]);
  return [Math.min(...xs) - 50, Math.min(...ys) - 300, Math.max(...xs) + 50, Math.max(...ys) + 50];
}

function findStagePlacement(spawns: SpawnPoint[], footholds: MapDetail['footholds']) {
  const counts = countSpawns(spawns);
  if (counts.length === 0) return null;
  const mainMob = counts[0][0];
  for (const spawn of spawns.filter((candidate) => candidate.mobId === mainMob)) {
    const monsterY = groundBelow(footholds, spawn.x, spawn.y - 30);
    const characterX = spawn.x - STAGE_GAP;
    const characterY = groundBelow(footholds, characterX, spawn.y - 30);
    if (monsterY === null || characterY === null || Math.abs(monsterY - characterY) > 18) continue;
    const stage: StagePlacement = {
      characterX: STAGE_CHARACTER.x,
      characterY: STAGE_CHARACTER.y,
      monsterX: STAGE_CHARACTER.x + STAGE_GAP,
      monsterY: Math.round(STAGE_CHARACTER.y + monsterY - characterY),
    };
    const camera = { x: characterX + (STAGE_SIZE.width / 2 - STAGE_CHARACTER.x), y: Math.round(characterY) - (STAGE_CHARACTER.y - STAGE_SIZE.height / 2) };
    return { stage, camera };
  }
  return null;
}
