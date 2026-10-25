import type { DefaultSources } from '../character/defaults';
import { branchOf } from '../character/jobs';
import type { Character } from '../character/types';
import type { GameData, MapDetails } from '../data/gameData';
import type { Item } from '../data/types';
import { learnedLevel, usableWithWeapon } from './buffs';
import { dropValuePerHour } from './dropValue';
import { expToNextLevel } from './exp';
import { projectCharacter } from './projectCharacter';
import { rankMaps, type RankedMap } from './rankMaps';
import { characterSkills, simulateMap, type MapSimulation } from './simulateMap';

export const SWITCH_GAIN = 1.1;
export const SWAP_EVERY_LEVELS = 3;
const DROP_HUNT_EXP_FLOOR = 0.5;
const RUNNER_UPS = 3;
const QUICK_SESSION_SECONDS = 8 * 60;
const MAPS_TRYING_ATTACKS = 3;
const AUTOMATIC = /^Final Attack/;

export type PlayStyle = 'fastest' | 'swapOften' | 'mesos' | 'rareDrops';

export interface RouteRequest {
  goalLevel: number;
  players: number;
  advanceInto: number | null;
  style: PlayStyle;
}

export interface RouteOption {
  mapId: string;
  mainTarget: number | null;
  expPerHour: number;
  mesosPerHour: number;
}

export interface RouteStop extends RouteOption {
  jobId: number;
  fromLevel: number;
  toLevel: number;
  hours: number;
  runnerUps: RouteOption[];
}

export interface RoutePlan {
  stops: RouteStop[];
  stuckAt: number | null;
}

interface Choice {
  mapId: string;
  simulation: MapSimulation;
  dropValue: number;
  score: number;
}

export function planRoute(character: Character, data: GameData, details: MapDetails, sources: DefaultSources, request: RouteRequest, onLevel: (level: number) => void = () => undefined): RoutePlan {
  const items = new Map(sources.items.map((item) => [item.id, item]));
  const stops: RouteStop[] = [];
  let current: string | null = null;
  for (let level = character.level; level < request.goalLevel; level++) {
    onLevel(level);
    const jobId = jobAt(character.jobId, request.advanceInto, level);
    const projected = projectCharacter(character, level, jobId, sources);
    const choices = scoredChoices(projected, data, details, items, request);
    if (!choices.length) return { stops, stuckAt: level };
    const stay = choices.find((choice) => choice.mapId === current) ?? null;
    const lastStop: RouteStop | undefined = stops[stops.length - 1];
    const levelsHere: number = lastStop && lastStop.mapId === current ? level - lastStop.fromLevel : 0;
    const chosen: Choice = pick(choices, stay, request.style, levelsHere);
    const expPercent = level === character.level ? character.expPercent : 0;
    const hours = expToNextLevel(level) * (1 - expPercent / 100) / chosen.simulation.expPerHour;
    const runnerUps = choices.filter((choice) => choice !== chosen).slice(0, RUNNER_UPS).map(optionOf);
    addLevel(stops, { ...optionOf(chosen), jobId, fromLevel: level, toLevel: level + 1, hours, runnerUps });
    current = chosen.mapId;
  }
  return { stops, stuckAt: null };
}

export function jobAt(startJob: number, advanceInto: number | null, level: number): number {
  const target = advanceInto !== null && sameLine(startJob, advanceInto) ? advanceInto : startJob;
  if (target % 100 !== 0 && level >= 30) return target;
  if (target !== 0 && level >= 10) return branchOf(target);
  return startJob;
}

export function pick<Option extends { score: number }>(choices: Option[], stay: Option | null, style: PlayStyle, levelsHere: number): Option {
  const best = choices[0];
  if (!stay) return best;
  if (style === 'swapOften') return levelsHere > 0 && levelsHere % SWAP_EVERY_LEVELS === 0 ? best : stay;
  return stay.score * SWITCH_GAIN >= best.score ? stay : best;
}

function sameLine(startJob: number, target: number): boolean {
  if (startJob === 0) return true;
  if (startJob % 100 === 0) return branchOf(target) === startJob;
  return target === startJob;
}

function scoredChoices(character: Character, data: GameData, details: MapDetails, items: Map<number, Item>, request: RouteRequest): Choice[] {
  const ranked = rankMaps(character, data, details, request.players, character.level + 1, { measuredSeconds: QUICK_SESSION_SECONDS }).ranked;
  const simulations = [
    ...ranked.slice(0, MAPS_TRYING_ATTACKS).map((entry) => bestAttackOn(character, data, details, request.players, entry)),
    ...ranked.slice(MAPS_TRYING_ATTACKS).map((entry) => ({ mapId: entry.map.id, simulation: entry.simulation })),
  ];
  const choices = simulations.map(({ mapId, simulation }) => ({ mapId, simulation, dropValue: dropValuePerHour(simulation.killsByMonster, data.drops, items), score: 0 }));
  return scoreFor(choices, request.style).sort((a, b) => b.score - a.score);
}

function scoreFor(choices: Choice[], style: PlayStyle): Choice[] {
  if (style === 'mesos') return choices.map((choice) => ({ ...choice, score: choice.simulation.mesosPerHour }));
  if (style !== 'rareDrops') return choices.map((choice) => ({ ...choice, score: choice.simulation.expPerHour }));
  const bestExp = Math.max(...choices.map((choice) => choice.simulation.expPerHour));
  const qualifying = choices.filter((choice) => choice.simulation.expPerHour >= bestExp * DROP_HUNT_EXP_FLOOR);
  const bestDrops = Math.max(0, ...qualifying.map((choice) => choice.dropValue));
  return qualifying.map((choice) => ({ ...choice, score: 0.5 * choice.simulation.expPerHour / bestExp + 0.5 * (bestDrops > 0 ? choice.dropValue / bestDrops : 0) }));
}

function bestAttackOn(character: Character, data: GameData, details: MapDetails, players: number, entry: RankedMap): { mapId: string; simulation: MapSimulation } {
  let best = entry.simulation;
  for (const attackId of usableAttacks(character, data)) {
    const simulation = simulateMap({ ...character, attackMix: { [attackId]: 100 } }, data, details(entry.map.id), players, { measuredSeconds: QUICK_SESSION_SECONDS });
    if (simulation.expPerHour > best.expPerHour) best = simulation;
  }
  return { mapId: entry.map.id, simulation: best };
}

function usableAttacks(character: Character, data: GameData): number[] {
  return characterSkills(character, data)
    .filter((skill) => skill.kind === 'attack' && !AUTOMATIC.test(skill.name) && usableWithWeapon(skill, character.weaponType) && learnedLevel(character, skill))
    .map((skill) => skill.id);
}

function optionOf(choice: Choice): RouteOption {
  return { mapId: choice.mapId, mainTarget: choice.simulation.mainTarget, expPerHour: choice.simulation.expPerHour, mesosPerHour: choice.simulation.mesosPerHour };
}

function addLevel(stops: RouteStop[], level: RouteStop): void {
  const last = stops[stops.length - 1];
  if (!last || last.mapId !== level.mapId || last.jobId !== level.jobId) {
    stops.push(level);
    return;
  }
  const levels = level.toLevel - last.fromLevel;
  const average = (field: 'expPerHour' | 'mesosPerHour') => (last[field] * (last.toLevel - last.fromLevel) + level[field]) / levels;
  stops[stops.length - 1] = { ...last, toLevel: level.toLevel, hours: last.hours + level.hours, expPerHour: average('expPerHour'), mesosPerHour: average('mesosPerHour') };
}
