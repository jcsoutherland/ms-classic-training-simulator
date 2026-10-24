import fs from 'node:fs';
import path from 'node:path';
import type { MirrorSource } from '../../src/data/types';
import { readGuides } from './guides';
import { MEOWDB, readItemLinks, readMesos } from './meowdb';
import { loadClassicNames } from './names';
import { readOsmlibDrops } from './osmlib';

const DATA = path.resolve('public/data');

function write(file: string, value: unknown): void {
  fs.writeFileSync(path.join(DATA, file), JSON.stringify(value));
}

function log(message: string): void {
  process.stdout.write(`${new Date().toLocaleTimeString()}  ${message}\n`);
}

async function main(): Promise<void> {
  const only = process.argv.find((argument) => argument.startsWith('--only='))?.slice(7).split(',');
  const wants = (part: string) => !only || only.includes(part);
  const names = loadClassicNames(DATA);
  const sources: Record<string, MirrorSource> = {};
  const now = new Date().toISOString();
  if (wants('drops')) {
    log('osmlib drop tables');
    const result = await readOsmlibDrops(names);
    write('drops.json', result.drops);
    sources.drops = { url: 'https://osmlib.com/', fetchedAt: now };
    log(`Drops for ${result.matchedMonsters} monsters; ${result.unmatchedItems.length} osmlib items have no Classic match`);
  }
  if (wants('mesos')) {
    log('meowdb meso reports');
    write('mesos.json', await readMesos(names.monsters, (done) => {
      if (done % 20 === 0) log(`  ${done} of ${names.monsters.length} monsters`);
    }));
    sources.mesos = { url: `${MEOWDB}/api/mesos-reports`, fetchedAt: now };
  }
  if (wants('links')) {
    log('meowdb item pages');
    write('item-links.json', await readItemLinks(names));
    sources.links = { url: `${MEOWDB}/item-db/all`, fetchedAt: now };
  }
  if (wants('guides')) {
    log('meowdb class guides');
    const guides = await readGuides();
    write('guides.json', guides);
    sources.guides = { url: `${MEOWDB}/guides`, fetchedAt: now };
    for (const guide of guides) log(`  job ${guide.jobId}: ${guide.stats.length} stat rows, ${guide.skills.length} skill rows, ${guide.gear.length} gear rows`);
  }
  const sourcesFile = path.join(DATA, 'sources.json');
  const previous = fs.existsSync(sourcesFile) ? JSON.parse(fs.readFileSync(sourcesFile, 'utf8')) as Record<string, MirrorSource> : {};
  write('sources.json', { ...previous, ...sources });
  log('Done');
}

main().catch((error: unknown) => {
  process.stderr.write(`Mirror failed: ${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
