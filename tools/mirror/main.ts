import fs from 'node:fs';
import path from 'node:path';
import type { MirrorSource } from '../../src/data/types';
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
  const names = loadClassicNames(DATA);
  const now = new Date().toISOString();
  log('osmlib drop tables');
  const result = await readOsmlibDrops(names);
  write('drops.json', result.drops);
  log(`Drops for ${result.matchedMonsters} monsters; ${result.unmatchedItems.length} osmlib items have no Classic match`);
  const sourcesFile = path.join(DATA, 'sources.json');
  const previous = fs.existsSync(sourcesFile) ? JSON.parse(fs.readFileSync(sourcesFile, 'utf8')) as Record<string, MirrorSource> : {};
  write('sources.json', { ...previous, drops: { url: 'https://osmlib.com/', fetchedAt: now } });
  log('Done');
}

main().catch((error: unknown) => {
  process.stderr.write(`Mirror failed: ${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
