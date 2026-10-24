import type { Item, Weapon } from '../../../src/data/types';
import { childNodes, numberOf, type GameFiles, type Sprite } from '../gameFiles';
import type { WzNode } from '../wz/image';
import type { Strings } from './strings';

const EQUIP_FOLDERS: [number, number, string][] = [
  [100, 100, 'Cap'], [101, 103, 'Accessory'], [104, 104, 'Coat'], [105, 105, 'Longcoat'], [106, 106, 'Pants'],
  [107, 107, 'Shoes'], [108, 108, 'Glove'], [109, 109, 'Shield'], [110, 110, 'Cape'], [111, 111, 'Ring'], [130, 170, 'Weapon'],
];
const ITEM_FOLDERS: Record<number, string> = { 2: 'Consume', 3: 'Install', 4: 'Etc' };
const BODY_IMAGE = '00002000.img';
const BODY_FILE = 'Character/Character_000.wz';

export function readItems(strings: Strings): Item[] {
  return [...strings.items.entries()]
    .filter(([, item]) => item.category !== 'cash')
    .map(([id, item]) => ({ id, name: item.name, category: item.category }))
    .sort((a, b) => a.id - b.id);
}

export function weaponTypeOf(itemId: number): number {
  return Math.floor(itemId / 10000) % 100;
}

export function readWeapons(files: GameFiles): Weapon[] {
  const file = 'Character/Weapon/Weapon_000.wz';
  const weapons: Weapon[] = [];
  for (const name of files.packageImageNames(file)) {
    const id = Number(name.replace('.img', ''));
    const info = files.image(file, name).root.info as WzNode | undefined;
    if (!info || Number.isNaN(id)) continue;
    weapons.push({
      id,
      type: String(weaponTypeOf(id)),
      attackSpeed: numberOf(info.attackSpeed) ?? 6,
      attack: numberOf(info.incWAT) ?? 0,
      magicAttack: numberOf(info.incMAD) ?? 0,
      requiredLevel: numberOf(info.reqLevel) ?? 0,
    });
  }
  return weapons.sort((a, b) => a.id - b.id);
}

export function readItemIcon(files: GameFiles, itemId: number): Sprite | null {
  const location = iconLocation(itemId);
  if (!location) return null;
  if (!files.hasImage(location.file, location.image)) return null;
  const source = files.image(location.file, location.image);
  const node = location.child ? source.root[location.child] as WzNode | undefined : source.root;
  const info = node?.info as WzNode | undefined;
  return files.sprite(source, info?.iconRaw ?? info?.icon);
}

export function readActionDelays(files: GameFiles): Record<string, number[]> {
  const body = files.image(BODY_FILE, BODY_IMAGE).root;
  const actions: Record<string, number[]> = {};
  for (const [action, node] of childNodes(body)) {
    if (action === 'info') continue;
    const delays = childNodes(node)
      .filter(([key]) => /^\d+$/.test(key))
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([, frame]) => Math.abs(numberOf(frame.delay) ?? 0));
    if (delays.length) actions[action] = delays;
  }
  return actions;
}

function iconLocation(itemId: number): { file: string; image: string; child?: string } | null {
  const group = Math.floor(itemId / 1000000);
  if (group === 1) {
    const prefix = Math.floor(itemId / 10000);
    const folder = EQUIP_FOLDERS.find(([low, high]) => prefix >= low && prefix <= high)?.[2];
    if (!folder) return null;
    return { file: `Character/${folder}/${folder}_000.wz`, image: `${String(itemId).padStart(8, '0')}.img` };
  }
  const folder = ITEM_FOLDERS[group];
  if (!folder) return null;
  return {
    file: `Item/${folder}/${folder}_000.wz`,
    image: `${String(Math.floor(itemId / 10000)).padStart(4, '0')}.img`,
    child: String(itemId).padStart(8, '0'),
  };
}
