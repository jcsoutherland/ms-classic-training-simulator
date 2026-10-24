import type { Character } from '../character/types';
import type { GameData, MapDetails } from '../data/gameData';
import type { MapSummary } from '../data/types';
import { hitChance } from './accuracy';
import { expToReach } from './exp';
import { effectiveAccuracy, simulateMap, type MapSimulation } from './simulateMap';
import { assessMap, type Viability } from './viability';

export interface RankedMap {
  map: MapSummary;
  simulation: MapSimulation;
  hoursToGoal: number;
}

export interface LeftOutMap {
  map: MapSummary;
  viability: Exclude<Viability, { viable: true }>;
}

export interface Rankings {
  ranked: RankedMap[];
  leftOut: LeftOutMap[];
}

export function rankMaps(character: Character, data: GameData, details: MapDetails, players: number, goalLevel: number): Rankings {
  const accuracy = effectiveAccuracy(character, data);
  const expNeeded = expToReach(character.level, character.expPercent, goalLevel);
  const ranked: RankedMap[] = [];
  const leftOut: LeftOutMap[] = [];
  for (const map of data.maps.filter((candidate) => !candidate.instanced)) {
    const viability = assessMap(map, data.monsters, character.level, (monster) => hitChance(accuracy, character.level, monster.level, monster.avoid));
    if (!viability.viable) {
      leftOut.push({ map, viability });
      continue;
    }
    const simulation = simulateMap(character, data, details(map.id), players);
    if (simulation.killsPerHour <= 0) continue;
    ranked.push({ map, simulation, hoursToGoal: simulation.expPerHour > 0 ? expNeeded / simulation.expPerHour : Infinity });
  }
  ranked.sort((a, b) => b.simulation.expPerHour - a.simulation.expPerHour);
  return { ranked, leftOut };
}
