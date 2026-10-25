import type { DefaultSources } from '../character/defaults';
import type { Character } from '../character/types';
import { planRoute, type RoutePlan, type RouteRequest } from './planRoute';
import { loadMapDetails } from './workerMaps';

export interface RouteWorkerRequest {
  requestId: number;
  dataUrl: string;
  sources: DefaultSources;
  character: Character;
  route: RouteRequest;
}

export type RouteWorkerReply =
  | { requestId: number; kind: 'progress'; level: number }
  | { requestId: number; kind: 'done'; plan: RoutePlan }
  | { requestId: number; kind: 'problem'; problem: string };

self.onmessage = async (event: MessageEvent<RouteWorkerRequest>) => {
  const { requestId, dataUrl, sources, character, route } = event.data;
  try {
    const details = await loadMapDetails(dataUrl, sources.data.maps.map((map) => map.id));
    const plan = planRoute(character, sources.data, details, sources, route, (level) => self.postMessage({ requestId, kind: 'progress', level } satisfies RouteWorkerReply));
    self.postMessage({ requestId, kind: 'done', plan } satisfies RouteWorkerReply);
  } catch (error) {
    self.postMessage({ requestId, kind: 'problem', problem: error instanceof Error ? error.message : String(error) } satisfies RouteWorkerReply);
  }
};
