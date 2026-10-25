import type { DefaultSources } from '../character/defaults';
import { branchOf } from '../character/jobs';
import type { Character } from '../character/types';
import type { GameData, MapDetails } from '../data/gameData';
import { learnedLevel, usableWithWeapon } from './buffs';
import { expToNextLevel } from './exp';
import { projectCharacter } from './projectCharacter';
import { rankMaps, type RankedMap } from './rankMaps';
import { characterSkills, simulateMap, type MapSimulation } from './simulateMap';

export const SWITCH_GAIN = 1.1;
export const CLEAR_SWITCH_GAIN = 1.25;
const QUICK_SESSION_SECONDS = 8 * 60;
const MAPS_TRYING_ATTACKS = 3;
const AUTOMATIC = /^Final Attack/;

export interface RouteRequest {
  goalLevel: number;
  players: number;
  advanceInto: number | null;
}

export interface RouteStop {
  mapId: string;
  mainTarget: number | null;
  jobId: number;
  fromLevel: number;
  toLevel: number;
  expPerHour: number;
  hours: number;
}

export interface RoutePlan {
  stops: RouteStop[];
  stuckAt: number | null;
}

interface Choice {
  mapId: string;
  simulation: MapSimulation;
}

export function planRoute(character: Character, data: GameData, details: MapDetails, sources: DefaultSources, request: RouteRequest, onLevel: (level: number) => void = () => undefined): RoutePlan {
  const stops: RouteStop[] = [];
  let current: Choice | null = null;
  let challenger: string | null = null;
  for (let level = character.level; level < request.goalLevel; level++) {
    onLevel(level);
    const jobId = jobAt(character.jobId, request.advanceInto, level);
    const projected = projectCharacter(character, level, jobId, sources);
    const options = mapOptions(projected, data, details, request.players, current);
    if (!options) return { stops, stuckAt: level };
    const worthSwitching = !options.stay || options.stay.simulation.expPerHour * SWITCH_GAIN < options.best.simulation.expPerHour;
    const clearlyBetter = !options.stay || options.stay.simulation.expPerHour * CLEAR_SWITCH_GAIN <= options.best.simulation.expPerHour;
    const confirmed = clearlyBetter || challenger === options.best.mapId;
    challenger = worthSwitching ? options.best.mapId : null;
    const choice = worthSwitching && confirmed ? options.best : options.stay ?? options.best;
    const expPercent = level === character.level ? character.expPercent : 0;
    const hours = expToNextLevel(level) * (1 - expPercent / 100) / choice.simulation.expPerHour;
    addLevel(stops, { mapId: choice.mapId, mainTarget: choice.simulation.mainTarget, jobId, fromLevel: level, toLevel: level + 1, expPerHour: choice.simulation.expPerHour, hours });
    current = choice;
  }
  return { stops, stuckAt: null };
}

export function jobAt(startJob: number, advanceInto: number | null, level: number): number {
  const target = advanceInto !== null && sameLine(startJob, advanceInto) ? advanceInto : startJob;
  if (target % 100 !== 0 && level >= 30) return target;
  if (target !== 0 && level >= 10) return branchOf(target);
  return startJob;
}

function sameLine(startJob: number, target: number): boolean {
  if (startJob === 0) return true;
  if (startJob % 100 === 0) return branchOf(target) === startJob;
  return target === startJob;
}

function mapOptions(character: Character, data: GameData, details: MapDetails, players: number, current: Choice | null): { best: Choice; stay: Choice | null } | null {
  const options = { measuredSeconds: QUICK_SESSION_SECONDS };
  const ranked = rankMaps(character, data, details, players, character.level + 1, options).ranked;
  if (!ranked.length) return null;
  const tried = ranked.slice(0, MAPS_TRYING_ATTACKS).map((entry) => bestAttackOn(character, data, details, players, entry));
  const best = [...tried, ...ranked.slice(MAPS_TRYING_ATTACKS).map((entry) => ({ mapId: entry.map.id, simulation: entry.simulation }))]
    .reduce((chosen, option) => (option.simulation.expPerHour > chosen.simulation.expPerHour ? option : chosen));
  const stayEntry = current ? ranked.find((entry) => entry.map.id === current.mapId) : undefined;
  const stay = stayEntry ? tried.find((option) => option.mapId === stayEntry.map.id) ?? bestAttackOn(character, data, details, players, stayEntry) : null;
  return { best, stay };
}

function bestAttackOn(character: Character, data: GameData, details: MapDetails, players: number, entry: RankedMap): Choice {
  let best: Choice = { mapId: entry.map.id, simulation: entry.simulation };
  for (const attackId of usableAttacks(character, data)) {
    const simulation = simulateMap({ ...character, attackMix: { [attackId]: 100 } }, data, details(entry.map.id), players, { measuredSeconds: QUICK_SESSION_SECONDS });
    if (simulation.expPerHour > best.simulation.expPerHour) best = { mapId: entry.map.id, simulation };
  }
  return best;
}

function usableAttacks(character: Character, data: GameData): number[] {
  return characterSkills(character, data)
    .filter((skill) => skill.kind === 'attack' && !AUTOMATIC.test(skill.name) && usableWithWeapon(skill, character.weaponType) && learnedLevel(character, skill))
    .map((skill) => skill.id);
}

function addLevel(stops: RouteStop[], level: RouteStop): void {
  const last = stops[stops.length - 1];
  if (!last || last.mapId !== level.mapId || last.jobId !== level.jobId) {
    stops.push(level);
    return;
  }
  const hours = last.hours + level.hours;
  const levels = level.toLevel - last.fromLevel;
  stops[stops.length - 1] = { ...last, toLevel: level.toLevel, hours, expPerHour: (last.expPerHour * (last.toLevel - last.fromLevel) + level.expPerHour) / levels, mainTarget: last.mainTarget };
}
