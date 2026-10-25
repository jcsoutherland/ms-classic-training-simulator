import type { SpawnPoint } from '../data/types';

export const SAME_FLOOR_HEIGHT = 40;
const FALL_PIXELS_PER_SECOND = 670;
const DROP_DOWN_SECONDS = 0.25;

type Rope = [x: number, top: number, bottom: number];

interface Spot {
  x: number;
  y: number;
}

export interface RouteTable {
  seconds: (from: number, to: number) => number;
}

export function routeTable(points: SpawnPoint[], ropes: Rope[], walkSpeed: number, climbSpeed: number): RouteTable {
  const spots: Spot[] = [...points.map(({ x, y }) => ({ x, y })), ...ropes.flatMap(([x, top, bottom]) => [{ x, y: top }, { x, y: bottom }])];
  const edges = buildEdges(spots, ropes, points.length, walkSpeed, climbSpeed);
  const rows = points.map((_, source) => shortestFrom(source, edges).slice(0, points.length));
  return { seconds: (from, to) => rows[from][to] };
}

export function sameFloor(a: Spot, b: Spot): boolean {
  return Math.abs(a.y - b.y) < SAME_FLOOR_HEIGHT;
}

function buildEdges(spots: Spot[], ropes: Rope[], ropeStart: number, walkSpeed: number, climbSpeed: number): [number, number][][] {
  const edges: [number, number][][] = spots.map(() => []);
  for (const [from, a] of spots.entries()) {
    for (const [to, b] of spots.entries()) {
      if (from === to) continue;
      if (sameFloor(a, b)) edges[from].push([to, Math.abs(a.x - b.x) / walkSpeed]);
      else if (b.y > a.y) edges[from].push([to, DROP_DOWN_SECONDS + (b.y - a.y) / FALL_PIXELS_PER_SECOND + Math.abs(a.x - b.x) / walkSpeed]);
    }
  }
  ropes.forEach(([, top, bottom], index) => {
    const topSpot = ropeStart + index * 2;
    edges[topSpot + 1].push([topSpot, (bottom - top) / climbSpeed]);
  });
  return edges;
}

function shortestFrom(source: number, edges: [number, number][][]): number[] {
  const seconds = new Array<number>(edges.length).fill(Infinity);
  const settled = new Array<boolean>(edges.length).fill(false);
  seconds[source] = 0;
  for (;;) {
    let next = -1;
    for (let spot = 0; spot < edges.length; spot++) {
      if (!settled[spot] && seconds[spot] < Infinity && (next < 0 || seconds[spot] < seconds[next])) next = spot;
    }
    if (next < 0) return seconds;
    settled[next] = true;
    for (const [to, cost] of edges[next]) if (seconds[next] + cost < seconds[to]) seconds[to] = seconds[next] + cost;
  }
}
