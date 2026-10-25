import { useEffect, useRef, useState } from 'react';
import type { Character } from '../../character/types';
import { DATA_URL, type SiteData } from '../../data/loadGameData';
import type { RoutePlan, RouteRequest } from '../../sim/planRoute';
import type { RouteWorkerReply, RouteWorkerRequest } from '../../sim/route.worker';

export interface RoutePlanState {
  plan: RoutePlan | null;
  planningLevel: number | null;
  problem: string | null;
}

export function useRoutePlan(site: SiteData, character: Character, route: RouteRequest): RoutePlanState {
  const worker = useRef<Worker | null>(null);
  const latestRequest = useRef(0);
  const [state, setState] = useState<RoutePlanState>({ plan: null, planningLevel: null, problem: null });

  useEffect(() => {
    const created = new Worker(new URL('../../sim/route.worker.ts', import.meta.url), { type: 'module' });
    worker.current = created;
    created.onmessage = (event: MessageEvent<RouteWorkerReply>) => {
      const reply = event.data;
      if (reply.requestId !== latestRequest.current) return;
      if (reply.kind === 'progress') setState((current) => ({ ...current, planningLevel: reply.level }));
      else if (reply.kind === 'done') setState({ plan: reply.plan, planningLevel: null, problem: null });
      else setState({ plan: null, planningLevel: null, problem: reply.problem });
    };
    created.onerror = (event) => setState({ plan: null, planningLevel: null, problem: `Route planning stopped working: ${event.message}` });
    return () => created.terminate();
  }, []);

  const { goalLevel, players, advanceInto } = route;
  useEffect(() => {
    const requestId = latestRequest.current + 1;
    latestRequest.current = requestId;
    setState((current) => ({ ...current, planningLevel: character.level }));
    const request: RouteWorkerRequest = {
      requestId,
      dataUrl: new URL(DATA_URL, window.location.href).href,
      sources: { data: site.game, guides: site.guides, items: site.itemList },
      character,
      route: { goalLevel, players, advanceInto },
    };
    worker.current?.postMessage(request);
  }, [site, character, goalLevel, players, advanceInto]);

  return state;
}
