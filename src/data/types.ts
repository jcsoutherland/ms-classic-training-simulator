export type Region =
  | 'Henesys' | 'Ellinia' | 'Perion' | 'KerningCity' | 'Dungeon' | 'Rith' | 'Amherst' | 'MushroomVillage'
  | 'SouthPerry' | 'ForgottenHollow' | 'Other';

export interface MapSummary {
  id: string;
  name: string;
  street: string;
  region: Region;
  mobRate: number;
  spawnCounts: [mobId: number, spawnPoints: number][];
  hasScene: boolean;
  instanced: boolean;
}

export interface SpawnPoint {
  mobId: number;
  x: number;
  y: number;
  wanderLeft: number;
  wanderRight: number;
  respawnSeconds: number;
}

export interface MapDetail {
  id: string;
  bounds: [left: number, top: number, right: number, bottom: number];
  spawns: SpawnPoint[];
  footholds: [x1: number, y1: number, x2: number, y2: number][];
  ropes: [x: number, top: number, bottom: number][];
  stage: StagePlacement | null;
}

export interface StagePlacement {
  characterX: number;
  characterY: number;
  monsterX: number;
  monsterY: number;
}

export interface Monster {
  id: number;
  name: string;
  level: number;
  exp: number;
  hp: number;
  weaponDefense: number;
  magicDefense: number;
  accuracy: number;
  avoid: number;
  speed: number;
  elements: string;
  undead: boolean;
  boss: boolean;
}

export type SkillKind = 'attack' | 'buff' | 'passive';

export interface SkillLevel {
  damage?: number;
  magic?: number;
  mobCount?: number;
  attackCount?: number;
  bulletCount?: number;
  range?: number;
  mastery?: number;
  accuracy?: number;
  mpCost?: number;
  duration?: number;
  x?: number;
  y?: number;
  speed?: number;
  attackBoost?: number;
  magicBoost?: number;
  defenseBoost?: number;
  avoid?: number;
  criticalChance?: number;
  criticalDamage?: number;
  chance?: number;
  fixedDamage?: number;
  hitBox?: [left: number, top: number, right: number, bottom: number];
}

export interface Skill {
  id: number;
  name: string;
  description: string;
  kind: SkillKind;
  maxLevel: number;
  element: string | null;
  weaponTypes: number[];
  actions: string[];
  levels: SkillLevel[];
  effects: SkillEffects;
}

export interface SkillEffects {
  effect: boolean;
  hit: boolean;
  ball: boolean;
}

export interface Job {
  id: number;
  name: string;
  skills: Skill[];
}

export type ItemCategory = 'equip' | 'use' | 'etc' | 'setup' | 'cash';

export interface Item {
  id: number;
  name: string;
  category: ItemCategory;
}

export interface Weapon {
  id: number;
  type: string;
  attackSpeed: number;
  attack: number;
  magicAttack: number;
  requiredLevel: number;
}

export interface SpriteFrame {
  width: number;
  height: number;
  originX: number;
  originY: number;
  delay: number;
}

export type Animations = Record<string, SpriteFrame[]>;

export interface DropEntry {
  itemId: number;
  chance: number;
  min?: number;
  max?: number;
}

export type DropTables = Record<number, DropEntry[]>;

export interface MesoRange {
  min: number;
  max: number;
  chance: number;
  reported: boolean;
}

export type Stat = 'STR' | 'DEX' | 'INT' | 'LUK';

export interface GuideStatStep {
  from: number;
  to: number;
  adds: Partial<Record<Stat, number>>;
  baseAtEnd: Partial<Record<Stat, number>>;
}

export interface GuideSkillStep {
  from: number;
  to: number;
  adds: Record<string, number>;
}

export interface GuideGear {
  level: number;
  item: string;
}

export interface Guide {
  jobId: number;
  url: string;
  stats: GuideStatStep[];
  skills: GuideSkillStep[];
  gear: GuideGear[];
}

export interface MirrorSource {
  url: string;
  fetchedAt: string;
}

export interface Manifest {
  extractedAt: string;
  gameVersion: number;
  counts: Record<string, number>;
}
