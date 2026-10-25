import { useEffect, useRef, useState } from 'react';
import type { Character } from '../../character/types';
import type { GameData } from '../../data/gameData';
import { DATA_URL } from '../../data/loadGameData';
import type { Rankings } from '../../sim/rankMaps';
import type { RankingsReply, RankingsRequest } from '../../sim/rankings.worker';

export const SLOW_AFTER_MILLISECONDS = 5000;

export interface RankingsState {
  rankings: Rankings | null;
  problem: string | null;
  slow: boolean;
}

export function useRankings(game: GameData, character: Character | null, players: number, goalLevel: number): RankingsState {
  const worker = useRef<Worker | null>(null);
  const latestRequest = useRef(0);
  const [state, setState] = useState<RankingsState>({ rankings: null, problem: null, slow: false });

  useEffect(() => {
    const created = new Worker(new URL('../../sim/rankings.worker.ts', import.meta.url), { type: 'module' });
    worker.current = created;
    created.onmessage = (event: MessageEvent<RankingsReply>) => {
      if (event.data.requestId !== latestRequest.current) return;
      if ('problem' in event.data) setState({ rankings: null, problem: event.data.problem, slow: false });
      else setState({ rankings: event.data.rankings, problem: null, slow: false });
    };
    created.onerror = (event) => setState({ rankings: null, problem: `The rankings stopped working: ${event.message}`, slow: false });
    return () => created.terminate();
  }, []);

  useEffect(() => {
    const requestId = latestRequest.current + 1;
    latestRequest.current = requestId;
    if (!character) {
      setState({ rankings: null, problem: null, slow: false });
      return undefined;
    }
    const request: RankingsRequest = { requestId, dataUrl: new URL(DATA_URL, window.location.href).href, game, character, players, goalLevel };
    worker.current?.postMessage(request);
    const timer = window.setTimeout(() => {
      if (latestRequest.current === requestId) setState((current) => ({ ...current, slow: true }));
    }, SLOW_AFTER_MILLISECONDS);
    return () => window.clearTimeout(timer);
  }, [game, character, players, goalLevel]);

  return state;
}
