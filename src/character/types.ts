import type { Stat } from '../data/types';

export const REGULAR_ATTACK = 0;

export interface Character {
  id: string;
  name: string;
  jobId: number;
  level: number;
  expPercent: number;
  gender: 'male' | 'female';
  stats: Record<Stat, number>;
  attackMin: number;
  attackMax: number;
  weaponAttack: number;
  magicAttack: number;
  accuracy: number;
  avoid: number;
  weaponId: number | null;
  weaponType: number;
  weaponSpeed: number;
  skills: Record<number, number>;
  attackMix: Record<number, number>;
  equipment: number[];
}
