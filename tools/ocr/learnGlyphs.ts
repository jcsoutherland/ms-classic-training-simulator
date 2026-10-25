import fs from 'node:fs';
import path from 'node:path';
import { DETAIL_VALUES, SKILL_SHOTS, STAT_SHOT, STAT_VALUES } from '../../src/ocr/fixtures/expected';
import { glyphsIn, type GlyphBook } from '../../src/ocr/glyphs';
import type { RawImage } from '../../src/ocr/rawImage';
import { detailCells, locateWindow, skillEntries, statCells } from '../../src/ocr/readWindows';
import { fileKit, loadPng } from './fixtureKit';

const FIXTURES = path.resolve('src/ocr/fixtures');

async function main(): Promise<void> {
  const kit = await fileKit({});
  const book: GlyphBook = {};
  const learn = (image: RawImage, label: string, where: string) => {
    const glyphs = glyphsIn(image);
    const characters = label.replace(/ /g, '');
    if (glyphs.length !== characters.length) throw new Error(`${where}: found ${glyphs.length} characters but "${label}" has ${characters.length}.`);
    glyphs.forEach((glyph, index) => {
      const known = book[glyph.key];
      if (known && known !== characters[index]) throw new Error(`${where}: the same shape was read as "${known}" and "${characters[index]}".`);
      book[glyph.key] = characters[index];
    });
  };
  const stat = await loadPng(path.join(FIXTURES, STAT_SHOT));
  const statAt = locateWindow(stat, kit, 'stat');
  const detailAt = locateWindow(stat, kit, 'stat-detail');
  if (!statAt || !detailAt) throw new Error('The Stats window or its Detail panel was not found in the sample.');
  for (const cell of statCells(stat, statAt, kit.layout)) if (STAT_VALUES[cell.field] !== undefined) learn(cell.image, STAT_VALUES[cell.field], `stats ${cell.field}`);
  for (const cell of detailCells(stat, detailAt, kit.layout)) if (DETAIL_VALUES[cell.field] !== undefined) learn(cell.image, DETAIL_VALUES[cell.field], `detail ${cell.field}`);
  for (const [file, levels] of Object.entries(SKILL_SHOTS)) {
    const screen = await loadPng(path.join(FIXTURES, file));
    const at = locateWindow(screen, kit, 'skill');
    if (!at) throw new Error(`${file}: the Skill window was not found.`);
    skillEntries(screen, at).slice(0, levels.length).forEach((entry, index) => learn(entry.level, String(levels[index]), `${file} entry ${index + 1}`));
  }
  fs.writeFileSync(path.resolve('public/data/glyphs.json'), JSON.stringify(book));
  console.log(`Learned ${Object.keys(book).length} glyph shapes: ${[...new Set(Object.values(book))].sort().join(' ')}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
