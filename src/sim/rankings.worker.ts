import type { Character } from '../character/types';
import type { GameData } from '../data/gameData';
import type { MapDetail } from '../data/types';
import { rankMaps, type Rankings } from './rankMaps';

export interface RankingsRequest {
  requestId: number;
  dataUrl: string;
  game: GameData;
  character: Character;
  players: number;
  goalLevel: number;
}

export type RankingsReply = { requestId: number; rankings: Rankings } | { requestId: number; problem: string };

const details = new Map<string, MapDetail>();

async function loadDetails(dataUrl: string, ids: string[]): Promise<void> {
  const missing = ids.filter((id) => !details.has(id));
  await Promise.all(missing.map(async (id) => {
    const response = await fetch(`${dataUrl}maps/${id}.json`);
    if (!response.ok) throw new Error(`Couldn't load map ${id} (${response.status}).`);
    details.set(id, await response.json() as MapDetail);
  }));
}

self.onmessage = async (event: MessageEvent<RankingsRequest>) => {
  const { requestId, dataUrl, game, character, players, goalLevel } = event.data;
  try {
    await loadDetails(dataUrl, game.maps.map((map) => map.id));
    const rankings = rankMaps(character, game, (id) => {
      const detail = details.get(id);
      if (!detail) throw new Error(`Map ${id} is missing.`);
      return detail;
    }, players, goalLevel);
    self.postMessage({ requestId, rankings } satisfies RankingsReply);
  } catch (error) {
    self.postMessage({ requestId, problem: error instanceof Error ? error.message : String(error) } satisfies RankingsReply);
  }
};
