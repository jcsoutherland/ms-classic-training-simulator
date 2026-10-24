import type { Bitmap } from '../image/canvas';
import { vector, walk, type GameFiles, type Sprite } from '../gameFiles';
import type { WzNode } from '../wz/image';

export const UI_FILE = 'UI/UI_000.wz';
export const PRINT_SIZE = 8;
const ICON_FRAME = 32;

export interface WindowArt {
  name: string;
  sprite: Sprite;
}

export interface WindowLayout {
  stat: { values: Record<string, [number, number]>; ranges: Record<string, [number, number, number, number]> };
  detail: Record<string, [number, number]>;
  skill: { listTop: [number, number]; listBottom: [number, number]; entryHeight: number; margin: number; icon: [number, number]; name: [number, number]; level: [number, number]; bookName: [number, number] };
  equipment: { child: [number, number]; slots: Record<string, [number, number]> };
}

export function readWindowArt(files: GameFiles): WindowArt[] {
  const stat = files.image(UI_FILE, 'CharacterStat.img');
  const skill = files.image(UI_FILE, 'Skill.img');
  const equipment = files.image(UI_FILE, 'Equipment.img');
  const art: [string, Sprite | null][] = [
    ['stat', files.sprite(stat, walk(stat.root, ['Main', 'backgrnd']))],
    ['stat-detail', files.sprite(stat, walk(stat.root, ['Detail', 'backgrnd']))],
    ['skill', files.sprite(skill, skill.root.backgrnd)],
    ['equipment', files.sprite(equipment, equipment.root.backgrnd)],
  ];
  return art.filter((entry): entry is [string, Sprite] => entry[1] !== null).map(([name, sprite]) => ({ name, sprite }));
}

export function readWindowLayout(files: GameFiles): WindowLayout {
  const stat = files.image(UI_FILE, 'CharacterStat.img').root;
  const skillSource = files.image(UI_FILE, 'Skill.img');
  const skill = skillSource.root;
  const equipment = files.image(UI_FILE, 'Equipment.img').root;
  const main = stat.Main as WzNode;
  const values: Record<string, [number, number]> = {};
  for (const key of ['name', 'job', 'job_sub', 'level', 'hp', 'mp', 'exp', 'fame', 'ap']) values[key] = point(main[`vector:${key}`]);
  const ranges: Record<string, [number, number, number, number]> = {};
  for (const stat of ['str', 'dex', 'int', 'luk']) ranges[stat] = [...point(main[`vector:${stat}Value_lt`]), ...point(main[`vector:${stat}Value_rb`])];
  const detail: Record<string, [number, number]> = {};
  for (const key of ['attack', 'pdd', 'mad', 'mdd', 'acc', 'eva', 'crt', 'crd', 'spd', 'jmp']) detail[key] = point((stat.Detail as WzNode)[`vector:${key}`]);
  const entry = skill.entry as WzNode;
  const entrySprite = files.sprite(skillSource, entry.skill0);
  const slots: Record<string, [number, number]> = {};
  for (const [slot, position] of Object.entries((equipment.equip as WzNode).slots as WzNode)) slots[slot] = point(position);
  return {
    stat: { values, ranges },
    detail,
    skill: {
      listTop: point(skill['vector:entryList_lt']),
      listBottom: point(skill['vector:entryList_rb']),
      entryHeight: entrySprite?.bitmap.height ?? 35,
      margin: typeof skill.entryMargin === 'number' ? skill.entryMargin : 3,
      icon: point(entry.posIcon),
      name: point(entry.posName),
      level: point(entry.posLevel),
      bookName: point(skill['vector:bookName']),
    },
    equipment: { child: point(equipment['vector:childwnd_lt']), slots },
  };
}

export function iconPrint(sprite: Sprite): string {
  const frame = Buffer.alloc(ICON_FRAME * ICON_FRAME * 4);
  const offsetX = -sprite.originX;
  const offsetY = ICON_FRAME - sprite.originY;
  copyInto(frame, sprite.bitmap, offsetX, offsetY);
  return downsample(frame).toString('base64');
}

function copyInto(frame: Buffer, bitmap: Bitmap, offsetX: number, offsetY: number): void {
  for (let y = 0; y < bitmap.height; y++) {
    for (let x = 0; x < bitmap.width; x++) {
      const targetX = x + offsetX;
      const targetY = y + offsetY;
      if (targetX < 0 || targetY < 0 || targetX >= ICON_FRAME || targetY >= ICON_FRAME) continue;
      bitmap.pixels.copy(frame, (targetY * ICON_FRAME + targetX) * 4, (y * bitmap.width + x) * 4, (y * bitmap.width + x) * 4 + 4);
    }
  }
}

function downsample(frame: Buffer): Buffer {
  const block = ICON_FRAME / PRINT_SIZE;
  const print = Buffer.alloc(PRINT_SIZE * PRINT_SIZE * 4);
  for (let cellY = 0; cellY < PRINT_SIZE; cellY++) {
    for (let cellX = 0; cellX < PRINT_SIZE; cellX++) {
      const sums = [0, 0, 0, 0];
      for (let y = 0; y < block; y++) {
        for (let x = 0; x < block; x++) {
          const source = ((cellY * block + y) * ICON_FRAME + cellX * block + x) * 4;
          const alpha = frame[source + 3] / 255;
          for (let channel = 0; channel < 3; channel++) sums[channel] += frame[source + channel] * alpha;
          sums[3] += alpha;
        }
      }
      const target = (cellY * PRINT_SIZE + cellX) * 4;
      for (let channel = 0; channel < 3; channel++) print[target + channel] = sums[3] > 0 ? Math.round(sums[channel] / sums[3]) : 0;
      print[target + 3] = Math.round(sums[3] / (block * block) * 255);
    }
  }
  return print;
}

function point(value: unknown): [number, number] {
  return vector(value) ?? [0, 0];
}
