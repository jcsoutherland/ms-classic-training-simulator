import type { Character } from '../../character/types';
import { isTrainingMap, type GameData } from '../../data/gameData';
import { hitChance, VIABLE_HIT_CHANCE } from '../../sim/accuracy';
import { effectiveAccuracy } from '../../sim/simulateMap';

const FALLBACK_MAP = '010003090';

export function suggestMap(character: Character, data: GameData): string {
  const accuracy = effectiveAccuracy(character, data);
  let best: { id: string; gap: number } | null = null;
  for (const map of data.maps) {
    if (!isTrainingMap(map)) continue;
    const main = data.monsters.get(map.spawnCounts[0]?.[0]);
    if (!main || hitChance(accuracy, character.level, main.level, main.avoid) < VIABLE_HIT_CHANCE) continue;
    const gap = Math.abs(character.level - 3 - main.level);
    if (!best || gap < best.gap) best = { id: map.id, gap };
  }
  return best?.id ?? FALLBACK_MAP;
}
