import path from 'node:path';
import type { Animations, Item, Manifest, MapSummary } from '../../src/data/types';
import { DEFAULT_GAME_DATA, GameFiles, childNodes, walk } from './gameFiles';
import { writeWebp } from './image/encode';
import { readActionDelays, readItemIcon, readItems, readQuestItemIds, readWeapons } from './extractors/items';
import { mapIds, readMap } from './extractors/maps';
import { readMobImages, readMobs } from './extractors/mobs';
import { renderScene, TOWNS, townCamera } from './extractors/scenes';
import { readJobs, readSkillSprites } from './extractors/skills';
import { readStrings, type Strings } from './extractors/strings';
import { iconPrint, readWindowArt, readWindowLayout } from './extractors/windows';
import { logStep, Output } from './output';

const GAME_VERSION = 779;
const BULLET_IMAGES = ['0206.img', '0207.img'];

async function main(): Promise<void> {
  const dataRoot = process.argv[2] ?? DEFAULT_GAME_DATA;
  const only = process.argv.find((argument) => argument.startsWith('--only='))?.slice(7).split(',');
  const wants = (part: string) => !only || only.includes(part);
  const files = new GameFiles(dataRoot);
  const output = new Output(path.resolve('public/data'));
  logStep('Reading names');
  const strings = readStrings(files);
  const counts: Record<string, number> = {};
  if (wants('maps')) counts.maps = await extractMaps(files, strings, output);
  if (wants('mobs')) counts.mobs = extractMobs(files, strings, output);
  if (wants('skills')) counts.skills = extractSkills(files, strings, output);
  if (wants('items')) counts.items = extractItems(files, strings, output);
  if (wants('towns')) counts.towns = await extractTowns(files, strings, output);
  if (wants('windows')) counts.windows = extractWindows(files, output);
  const previous = output.readJson<Manifest>('manifest.json');
  const manifest: Manifest = { extractedAt: new Date().toISOString(), gameVersion: GAME_VERSION, counts: { ...previous?.counts, ...counts } };
  output.json('manifest.json', manifest);
  logStep(`Done: ${JSON.stringify(counts)}`);
}

async function extractMaps(files: GameFiles, strings: Strings, output: Output): Promise<number> {
  const summaries: MapSummary[] = [];
  const ids = mapIds(files);
  for (const [index, id] of ids.entries()) {
    const { summary, detail, camera } = readMap(files, strings, id);
    if (summary.spawnCounts.length === 0) continue;
    summaries.push(summary);
    output.json(`maps/${id}.json`, detail);
    if (camera) await writeWebp(output.path(`scenes/${id}.webp`), renderScene(files, id, camera.x, camera.y));
    files.clearBitmaps();
    if (index % 25 === 0) logStep(`Maps ${index + 1} of ${ids.length}`);
  }
  output.json('maps-index.json', summaries);
  return summaries.length;
}

function extractMobs(files: GameFiles, strings: Strings, output: Output): number {
  logStep('Monsters');
  const monsters = readMobs(files, strings.mobs);
  const animations: Record<number, Animations> = {};
  for (const monster of monsters) {
    const images = readMobImages(files, monster.id);
    if (images.frames.move || images.frames.fly) monster.moves = true;
    const frames: Animations = {};
    for (const [action, sprites] of Object.entries(images.frames)) frames[action] = output.frames(`img/mobs/${monster.id}`, action, sprites);
    if (images.icon) output.sprite(`img/mobs/${monster.id}/icon.png`, images.icon);
    animations[monster.id] = frames;
  }
  output.json('mobs.json', monsters);
  output.json('mob-animations.json', animations);
  return monsters.length;
}

function extractSkills(files: GameFiles, strings: Strings, output: Output): number {
  logStep('Skills');
  const jobs = readJobs(files, strings);
  const animations: Record<number, Animations> = {};
  for (const job of jobs) {
    for (const skill of job.skills) {
      const folder = `img/skills/${skill.id}`;
      const [icon] = readSkillSprites(files, job.id, skill.id, 'icon');
      if (icon) output.sprite(`${folder}/icon.png`, icon);
      const frames: Animations = {};
      for (const part of ['effect', 'hit', 'ball'] as const) {
        const sprites = readSkillSprites(files, job.id, skill.id, part);
        if (sprites.length) frames[part] = output.frames(folder, part, sprites);
      }
      animations[skill.id] = frames;
    }
  }
  output.json('jobs.json', jobs);
  output.json('skill-animations.json', animations);
  return jobs.reduce((total, job) => total + job.skills.length, 0);
}

function extractItems(files: GameFiles, strings: Strings, output: Output): number {
  logStep('Items, weapons and animation timings');
  const items: Item[] = readItems(strings, readQuestItemIds(files));
  let icons = 0;
  for (const item of items) {
    const icon = readItemIcon(files, item.id);
    if (!icon) continue;
    output.sprite(`img/items/${item.id}.png`, icon);
    icons++;
  }
  output.json('items.json', items);
  output.json('weapons.json', readWeapons(files));
  output.json('actions.json', readActionDelays(files));
  output.json('bullets.json', extractBullets(files, output));
  logStep(`${icons} item icons`);
  return items.length;
}

function extractBullets(files: GameFiles, output: Output): Record<number, Animations[string]> {
  const bullets: Record<number, Animations[string]> = {};
  for (const imageName of BULLET_IMAGES) {
    const source = files.image('Item/Consume/Consume_000.wz', imageName);
    for (const [id, item] of childNodes(source.root)) {
      const frames = childNodes(walk(item, ['bullet']))
        .filter(([key]) => /^\d+$/.test(key))
        .map(([, frame]) => files.sprite(source, frame))
        .filter((sprite) => sprite !== null);
      if (frames.length) bullets[Number(id)] = output.frames(`img/bullets/${Number(id)}`, 'bullet', frames);
    }
  }
  return bullets;
}

async function extractTowns(files: GameFiles, strings: Strings, output: Output): Promise<number> {
  logStep('Town scenes');
  for (const town of TOWNS) {
    const camera = townCamera(files, strings, town.mapId, town.shift);
    await writeWebp(output.path(`scenes/town-${town.key}.webp`), renderScene(files, town.mapId, camera.x, camera.y));
    files.clearBitmaps();
  }
  return TOWNS.length;
}

function extractWindows(files: GameFiles, output: Output): number {
  logStep('Game windows and icon fingerprints');
  const art = readWindowArt(files);
  for (const window of art) output.sprite(`img/ui/${window.name}.png`, window.sprite);
  output.json('ui-layout.json', readWindowLayout(files));
  const equipPrints: Record<number, string> = {};
  const items = output.readJson<Item[]>('items.json') ?? [];
  for (const item of items.filter((candidate) => candidate.category === 'equip')) {
    const icon = readItemIcon(files, item.id);
    if (icon) equipPrints[item.id] = iconPrint(icon);
  }
  output.json('equip-prints.json', equipPrints);
  const skillPrints: Record<number, string> = {};
  for (const job of readJobs(files, readStrings(files))) {
    for (const skill of job.skills) {
      const [icon] = readSkillSprites(files, job.id, skill.id, 'icon');
      if (icon) skillPrints[skill.id] = iconPrint({ ...icon, originX: 0, originY: 32 });
    }
  }
  output.json('skill-prints.json', skillPrints);
  return art.length;
}

main().catch((error: unknown) => {
  process.stderr.write(`Extraction failed: ${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
