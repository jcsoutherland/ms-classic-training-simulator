import type { Monster } from '../../../src/data/types';
import { childNodes, numberOf, type GameFiles, type Sprite } from '../gameFiles';
import type { WzNode } from '../wz/image';

export const MOB_PACK = 'Packs/Mob_00000.ms';
const ANIMATIONS = ['stand', 'move', 'fly', 'hit1', 'die1'];

export interface MobImages {
  icon: Sprite | null;
  frames: Record<string, Sprite[]>;
}

export function readMobs(files: GameFiles, names: Map<number, string>): Monster[] {
  const monsters: Monster[] = [];
  for (const entryName of files.packImageNames(MOB_PACK)) {
    const id = mobIdOf(entryName);
    if (id === null) continue;
    const info = files.image(MOB_PACK, entryName).root.info as WzNode | undefined;
    if (!info) continue;
    monsters.push({
      id,
      name: names.get(id) ?? `Monster ${id}`,
      level: numberOf(info.level) ?? 1,
      exp: numberOf(info.exp) ?? 0,
      hp: numberOf(info.maxHP) ?? 1,
      weaponDefense: numberOf(info.PDDamage) ?? 0,
      magicDefense: numberOf(info.MDDamage) ?? 0,
      accuracy: numberOf(info.acc) ?? 0,
      avoid: numberOf(info.eva) ?? 0,
      speed: numberOf(info.speed) ?? 0,
      elements: typeof info.elemAttr === 'string' ? info.elemAttr : '',
      undead: numberOf(info.undead) === 1,
      boss: numberOf(info.boss) === 1,
    });
  }
  return monsters.sort((a, b) => a.id - b.id);
}

export function readMobImages(files: GameFiles, mobId: number): MobImages {
  const entryName = `Mob/${String(mobId).padStart(7, '0')}.img`;
  const source = files.image(MOB_PACK, entryName);
  const link = numberOf((source.root.info as WzNode | undefined)?.link);
  if (!source.root.stand && !source.root.move && !source.root.fly && link !== undefined && link !== mobId) return readMobImages(files, link);
  const frames: Record<string, Sprite[]> = {};
  for (const action of ANIMATIONS) {
    const node = source.root[action] as WzNode | undefined;
    if (!node) continue;
    const sprites = childNodes(node)
      .filter(([key]) => /^\d+$/.test(key))
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([, frame]) => files.sprite(source, frame))
      .filter((sprite): sprite is Sprite => sprite !== null);
    if (sprites.length) frames[action] = sprites;
  }
  const icon = frames.stand?.[0] ?? frames.move?.[0] ?? frames.fly?.[0] ?? null;
  return { icon, frames };
}

function mobIdOf(entryName: string): number | null {
  const match = entryName.match(/^Mob\/(\d+)\.img$/);
  return match ? Number(match[1]) : null;
}
