import type { Character } from '../character/types';
import { isTrainingMap, type GameData, type MapDetails } from '../data/gameData';
import type { MapSummary } from '../data/types';
import { hitChance } from './accuracy';
import { expToReach } from './exp';
import { effectiveAccuracy, simulateMap, type MapSimulation, type SimulationOptions } from './simulateMap';
import { assessMap, type Viability } from './viability';

export const MIN_RANKED_MAPS = 5;

export interface RankedMap {
  map: MapSummary;
  simulation: MapSimulation;
  hoursToGoal: number;
  lowerLevel?: true;
}

export interface LeftOutMap {
  map: MapSummary;
  viability: Exclude<Viability, { viable: true }>;
}

export interface Rankings {
  ranked: RankedMap[];
  leftOut: LeftOutMap[];
  widened: boolean;
}

export function rankMaps(character: Character, data: GameData, details: MapDetails, players: number, goalLevel: number, options: SimulationOptions = {}): Rankings {
  const accuracy = effectiveAccuracy(character, data);
  const expNeeded = expToReach(character.level, character.expPercent, goalLevel);
  const ranked: RankedMap[] = [];
  const leftOut: LeftOutMap[] = [];
  for (const map of data.maps.filter(isTrainingMap)) {
    const viability = assessMap(map, data.monsters, character.level, (monster) => hitChance(accuracy, character.level, monster.level, monster.avoid));
    if (!viability.viable) {
      leftOut.push({ map, viability });
      continue;
    }
    const entry = rankedEntry(map, simulateMap(character, data, details(map.id), players, options), expNeeded);
    if (entry) ranked.push(entry);
  }
  const extra = ranked.length < MIN_RANKED_MAPS ? bestLowerLevelMaps(leftOut, MIN_RANKED_MAPS - ranked.length, (map) => rankedEntry(map, simulateMap(character, data, details(map.id), players, options), expNeeded)) : [];
  const extraIds = new Set(extra.map((entry) => entry.map.id));
  const all = [...ranked, ...extra].sort((a, b) => b.simulation.expPerHour - a.simulation.expPerHour);
  return { ranked: all, leftOut: leftOut.filter((entry) => !extraIds.has(entry.map.id)), widened: extra.length > 0 };
}

function rankedEntry(map: MapSummary, simulation: MapSimulation, expNeeded: number): RankedMap | null {
  if (simulation.killsPerHour <= 0) return null;
  return { map, simulation, hoursToGoal: simulation.expPerHour > 0 ? expNeeded / simulation.expPerHour : Infinity };
}

function bestLowerLevelMaps(leftOut: LeftOutMap[], count: number, rank: (map: MapSummary) => RankedMap | null): RankedMap[] {
  return leftOut
    .filter((entry) => entry.viability.reason === 'too-easy')
    .map((entry) => rank(entry.map))
    .filter((entry): entry is RankedMap => entry !== null)
    .sort((a, b) => b.simulation.expPerHour - a.simulation.expPerHour)
    .slice(0, count)
    .map((entry) => ({ ...entry, lowerLevel: true }));
}
