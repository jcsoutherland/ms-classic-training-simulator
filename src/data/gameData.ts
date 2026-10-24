import type { DropTables, Job, MapDetail, MapSummary, MesoRange, Monster, Skill, Weapon } from './types';

export interface GameData {
  monsters: Map<number, Monster>;
  jobs: Job[];
  skills: Map<number, Skill>;
  actions: Record<string, number[]>;
  weapons: Map<number, Weapon>;
  maps: MapSummary[];
  mesos: Record<number, MesoRange>;
  drops: DropTables;
}

export interface RawGameData {
  monsters: Monster[];
  jobs: Job[];
  actions: Record<string, number[]>;
  weapons: Weapon[];
  maps: MapSummary[];
  mesos: Record<number, MesoRange>;
  drops: DropTables;
}

export type MapDetails = (mapId: string) => MapDetail;

export function indexGameData(raw: RawGameData): GameData {
  return {
    monsters: new Map(raw.monsters.map((monster) => [monster.id, monster])),
    jobs: raw.jobs,
    skills: new Map(raw.jobs.flatMap((job) => job.skills).map((skill) => [skill.id, skill])),
    actions: raw.actions,
    weapons: new Map(raw.weapons.map((weapon) => [weapon.id, weapon])),
    maps: raw.maps,
    mesos: raw.mesos,
    drops: raw.drops,
  };
}

export function jobLine(jobId: number): number[] {
  if (jobId === 0) return [0];
  const branch = Math.floor(jobId / 100) * 100;
  return jobId % 100 === 0 ? [0, branch] : [0, branch, jobId];
}
