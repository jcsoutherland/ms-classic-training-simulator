import type { Bitmap } from '../image/canvas';
import { Composer } from '../image/compose';
import { childNodes, numberOf, walk, type GameFiles } from '../gameFiles';
import type { WzNode } from '../wz/image';
import { groundBelow, MAP_FILE, readMap, STAGE_SIZE } from './maps';
import type { Strings } from './strings';

const HORIZONTAL_TILING = [1, 3, 4, 6, 7];
const VERTICAL_TILING = [2, 3, 5, 6, 7];
const TOWN_FEET_Y = 128;

export const TOWNS: { key: string; mapId: string; shift: number }[] = [
  { key: 'henesys', mapId: '010001000', shift: 90 },
  { key: 'ellinia', mapId: '010002000', shift: 60 },
  { key: 'perion', mapId: '010004000', shift: 0 },
  { key: 'kerning', mapId: '010003000', shift: -40 },
  { key: 'sleepywood', mapId: '010005000', shift: 110 },
];

export function renderScene(files: GameFiles, mapId: string, cameraX: number, cameraY: number): Bitmap {
  const root = files.image(MAP_FILE, `${mapId}.img`).root;
  const composer = new Composer(STAGE_SIZE.width, STAGE_SIZE.height);
  const backs = childNodes(root.back as WzNode | undefined).sort((a, b) => Number(a[0]) - Number(b[0])).map(([, back]) => back);
  for (const back of backs.filter((back) => !back.front)) drawBack(files, composer, back, cameraX, cameraY);
  for (let layer = 0; layer <= 7; layer++) drawLayer(files, composer, root[String(layer)] as WzNode | undefined, cameraX, cameraY);
  for (const back of backs.filter((back) => back.front)) drawBack(files, composer, back, cameraX, cameraY);
  return composer.toBitmap();
}

export function townCamera(files: GameFiles, strings: Strings, mapId: string, shift: number): { x: number; y: number } {
  const root = files.image(MAP_FILE, `${mapId}.img`).root;
  const spawnPortal = childNodes(root.portal as WzNode | undefined).map(([, portal]) => portal).find((portal) => numberOf(portal.pt) === 0);
  const x = (numberOf(spawnPortal?.x) ?? 0) + shift;
  const portalY = numberOf(spawnPortal?.y) ?? 0;
  const { detail } = readMap(files, strings, mapId);
  const feetY = Math.round(groundBelow(detail.footholds, x, portalY - 40) ?? portalY);
  return { x, y: feetY - (TOWN_FEET_Y - STAGE_SIZE.height / 2) };
}

function drawLayer(files: GameFiles, composer: Composer, layer: WzNode | undefined, cameraX: number, cameraY: number): void {
  if (!layer) return;
  const objects = childNodes(layer.obj as WzNode | undefined).map(([, object]) => object)
    .sort((a, b) => ((numberOf(a.z) ?? 0) - (numberOf(b.z) ?? 0)) || ((numberOf(a.zM) ?? 0) - (numberOf(b.zM) ?? 0)));
  for (const object of objects) drawObject(files, composer, object, cameraX, cameraY);
  const tileSet = (layer.info as WzNode | undefined)?.tS;
  if (typeof tileSet !== 'string') return;
  const source = files.image('Map/Tile/Tile_000.wz', `${tileSet}.img`);
  const tiles = childNodes(layer.tile as WzNode | undefined).map(([, tile]) => ({ tile, sprite: files.sprite(source, walk(source.root, [String(tile.u), String(tile.no)])) }))
    .filter((entry) => entry.sprite !== null)
    .sort((a, b) => ((a.sprite?.z ?? 0) - (b.sprite?.z ?? 0)) || ((numberOf(a.tile.zM) ?? 0) - (numberOf(b.tile.zM) ?? 0)));
  for (const { tile, sprite } of tiles) {
    if (!sprite) continue;
    const left = STAGE_SIZE.width / 2 + (numberOf(tile.x) ?? 0) - cameraX - sprite.originX;
    const top = STAGE_SIZE.height / 2 + (numberOf(tile.y) ?? 0) - cameraY - sprite.originY;
    composer.draw(sprite.bitmap, left, top);
  }
}

function drawObject(files: GameFiles, composer: Composer, object: WzNode, cameraX: number, cameraY: number): void {
  const imageName = `${object.oS}.img`;
  if (!files.hasImage('Map/Obj/Obj_000.wz', imageName)) return;
  const source = files.image('Map/Obj/Obj_000.wz', imageName);
  const sprite = files.sprite(source, walk(source.root, [String(object.l0), String(object.l1), String(object.l2), '0']));
  if (!sprite) return;
  const flip = numberOf(object.f) === 1;
  const left = STAGE_SIZE.width / 2 + (numberOf(object.x) ?? 0) - cameraX - (flip ? sprite.bitmap.width - sprite.originX : sprite.originX);
  const top = STAGE_SIZE.height / 2 + (numberOf(object.y) ?? 0) - cameraY - sprite.originY;
  composer.draw(sprite.bitmap, left, top, flip);
}

function drawBack(files: GameFiles, composer: Composer, back: WzNode, cameraX: number, cameraY: number): void {
  const imageName = `${back.bS}.img`;
  if (!files.hasImage('Map/Back/Back_000.wz', imageName)) return;
  const source = files.image('Map/Back/Back_000.wz', imageName);
  const path = numberOf(back.ani) === 1 ? ['ani', String(back.no), '0'] : ['back', String(back.no)];
  const sprite = files.sprite(source, walk(source.root, path));
  if (!sprite) return;
  const { width, height } = sprite.bitmap;
  const flip = numberOf(back.f) === 1;
  const type = numberOf(back.type) ?? 0;
  const baseX = STAGE_SIZE.width / 2 + (numberOf(back.x) ?? 0) - cameraX * (1 + (numberOf(back.rx) ?? 0) / 100) - (flip ? width - sprite.originX : sprite.originX);
  const baseY = STAGE_SIZE.height / 2 + (numberOf(back.y) ?? 0) - cameraY * (1 + (numberOf(back.ry) ?? 0) / 100) - sprite.originY;
  const stepX = numberOf(back.cx) || width;
  const stepY = numberOf(back.cy) || height;
  const lefts = HORIZONTAL_TILING.includes(type) ? tilePositions(baseX, stepX, STAGE_SIZE.width) : [baseX];
  const tops = VERTICAL_TILING.includes(type) ? tilePositions(baseY, stepY, STAGE_SIZE.height) : [baseY];
  const opacity = (numberOf(back.a) ?? 255) / 255;
  for (const left of lefts) for (const top of tops) composer.draw(sprite.bitmap, left, top, flip, opacity);
}

function tilePositions(base: number, step: number, size: number): number[] {
  const positions: number[] = [];
  for (let position = ((base % step) + step) % step - step; position < size; position += step) positions.push(position);
  return positions;
}
