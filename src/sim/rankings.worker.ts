import type { Character } from '../character/types';
import type { GameData } from '../data/gameData';
import { rankMaps, type Rankings } from './rankMaps';
import { loadMapDetails } from './workerMaps';

export interface RankingsRequest {
  requestId: number;
  dataUrl: string;
  game: GameData;
  character: Character;
  players: number;
  goalLevel: number;
}

export type RankingsReply = { requestId: number; rankings: Rankings } | { requestId: number; problem: string };

self.onmessage = async (event: MessageEvent<RankingsRequest>) => {
  const { requestId, dataUrl, game, character, players, goalLevel } = event.data;
  try {
    const details = await loadMapDetails(dataUrl, game.maps.map((map) => map.id));
    const rankings = rankMaps(character, game, details, players, goalLevel);
    self.postMessage({ requestId, rankings } satisfies RankingsReply);
  } catch (error) {
    self.postMessage({ requestId, problem: error instanceof Error ? error.message : String(error) } satisfies RankingsReply);
  }
};
