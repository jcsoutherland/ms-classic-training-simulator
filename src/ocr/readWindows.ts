import type { Stat } from '../data/types';
import { readGlyphs, type GlyphBook } from './glyphs';
import { locateTemplate } from './locate';
import { bestMaskedMatch, closestByPrint, matchIconAt, type PrintBook } from './matchIcon';
import { parseExpPercent, parseFirstNumber, parseRange, parseWholeNumber } from './parse';
import { crop, iconFingerprint, printDistance, type RawImage } from './rawImage';
import type { DetailReading, EquipmentReading, Reading, SkillReading, StatReading } from './readings';

export interface WindowLayout {
  stat: { values: Record<string, [number, number]>; ranges: Record<string, [number, number, number, number]> };
  detail: Record<string, [number, number]>;
  equipment: { child: [number, number]; slots: Record<string, [number, number]> };
}

export type WindowKind = 'stat' | 'stat-detail' | 'skill' | 'equipment';

export interface WindowKit {
  layout: WindowLayout;
  templates: Record<WindowKind, RawImage>;
  glyphs: GlyphBook;
  skillPrints: PrintBook;
  equipPrints: () => Promise<PrintBook>;
  itemIcon: (itemId: number) => Promise<RawImage>;
}

export interface Origin {
  x: number;
  y: number;
}

export interface TextCell {
  field: string;
  image: RawImage;
}

const ANCHORS: Record<WindowKind, { left: number; top: number; height: number }> = {
  stat: { left: 6, top: 6, height: 100 },
  'stat-detail': { left: 6, top: 6, height: 210 },
  skill: { left: 6, top: 6, height: 100 },
  equipment: { left: 6, top: 4, height: 40 },
};
const VALUE_HEIGHT = 16;
const VALUE_WIDTH = 120;
const NARROW_VALUE_WIDTH = 78;
const NARROW_FIELDS = ['hp', 'mp'];
const DETAIL_WIDTH = 100;
const SKILL_HEADER_SCAN_FROM = 88;
const SKILL_FIRST_ENTRY_BELOW_HEADER = 5;
const SKILL_ENTRY_PITCH = 40;
const SKILL_LIST_BOTTOM = 334;
const SKILL_ICON: Origin = { x: 10, y: 4 };
const SKILL_LEVEL: Origin = { x: 48, y: 18 };
const SKILL_LEVEL_SIZE = { width: 60, height: 16 };
const DECO_TAB = { left: 44, top: 22, width: 36, height: 14 };
const EQUIP_TAB = { left: 8, top: 22, width: 34, height: 14 };
const EMPTY_SLOT_LIMIT = 12;
const SHORTLIST = 40;
const MAX_SKILL_WINDOWS = 4;
const FLAT_SLOT_SPREAD = 22;
const SLOT_PREFIXES: Record<string, (prefix: number) => boolean> = {
  cap: (prefix) => prefix === 100,
  earacc: (prefix) => prefix === 103,
  clothes: (prefix) => prefix === 104 || prefix === 105,
  pants: (prefix) => prefix === 106,
  shoes: (prefix) => prefix === 107,
  gloves: (prefix) => prefix === 108,
  cape: (prefix) => prefix === 110,
  shield: (prefix) => prefix === 109,
  weapon: (prefix) => prefix >= 130 && prefix < 170,
};

export async function readScreenshot(screen: RawImage, kit: WindowKit): Promise<Reading[]> {
  const readings: Reading[] = [];
  const stat = locateWindow(screen, kit, 'stat');
  if (stat) readings.push(readStatWindow(statCells(screen, stat, kit.layout), kit.glyphs));
  const detail = locateWindow(screen, kit, 'stat-detail');
  if (detail) readings.push(readDetailWindow(detailCells(screen, detail, kit.layout), kit.glyphs));
  let rest = screen;
  for (let window = 0; window < MAX_SKILL_WINDOWS; window++) {
    const skill = locateWindow(rest, kit, 'skill');
    if (!skill) break;
    readings.push(readSkillWindow(rest, skill, kit));
    rest = blankedOut(rest, skill, kit.templates.skill);
  }
  const equipment = locateWindow(screen, kit, 'equipment');
  if (equipment) readings.push(await readEquipmentWindow(screen, equipment, kit, await kit.equipPrints()));
  return readings;
}

export function locateWindow(screen: RawImage, kit: WindowKit, kind: WindowKind): Origin | null {
  const { left, top, height } = ANCHORS[kind];
  const template = kit.templates[kind];
  const anchor = crop(template, left, top, template.width - left * 2, Math.min(height, template.height - top * 2));
  const found = locateTemplate(screen, anchor);
  return found ? { x: found.x - left, y: found.y - top } : null;
}

export function statCells(screen: RawImage, at: Origin, layout: WindowLayout): TextCell[] {
  const values = Object.entries(layout.stat.values).map(([field, [x, y]]) => ({
    field,
    image: crop(screen, at.x + x, at.y + y - 2, NARROW_FIELDS.includes(field) ? NARROW_VALUE_WIDTH : VALUE_WIDTH, VALUE_HEIGHT),
  }));
  const ranges = Object.entries(layout.stat.ranges).map(([field, [left, top, right, bottom]]) => ({
    field,
    image: crop(screen, at.x + left, at.y + top, right - left, bottom - top),
  }));
  return [...values, ...ranges];
}

export function detailCells(screen: RawImage, at: Origin, layout: WindowLayout): TextCell[] {
  return Object.entries(layout.detail).map(([field, [x, y]]) => ({ field, image: crop(screen, at.x + x, at.y + y - 2, DETAIL_WIDTH, VALUE_HEIGHT) }));
}

export function skillEntries(screen: RawImage, at: Origin): { iconLeft: number; iconTop: number; level: RawImage }[] {
  const header = headerBorder(screen, at);
  if (header === null) return [];
  const entries = [];
  for (let top = header + SKILL_FIRST_ENTRY_BELOW_HEADER; top + SKILL_ENTRY_PITCH <= at.y + SKILL_LIST_BOTTOM + SKILL_ENTRY_PITCH / 2; top += SKILL_ENTRY_PITCH) {
    entries.push({
      iconLeft: at.x + SKILL_ICON.x,
      iconTop: top + SKILL_ICON.y,
      level: crop(screen, at.x + SKILL_LEVEL.x, top + SKILL_LEVEL.y, SKILL_LEVEL_SIZE.width, SKILL_LEVEL_SIZE.height),
    });
  }
  return entries;
}

function readStatWindow(cells: TextCell[], glyphs: GlyphBook): StatReading {
  const text = Object.fromEntries(cells.map((cell) => [cell.field, readGlyphs(cell.image, glyphs)]));
  const stats: Partial<Record<Stat, number>> = {};
  for (const [field, stat] of [['str', 'STR'], ['dex', 'DEX'], ['int', 'INT'], ['luk', 'LUK']] as const) stats[stat] = parseFirstNumber(text[field] ?? '') ?? undefined;
  return {
    kind: 'stats',
    level: parseWholeNumber(text.level ?? '') ?? undefined,
    expPercent: parseExpPercent(text.exp ?? '') ?? undefined,
    stats,
  };
}

function readDetailWindow(cells: TextCell[], glyphs: GlyphBook): DetailReading {
  const text = Object.fromEntries(cells.map((cell) => [cell.field, readGlyphs(cell.image, glyphs)]));
  const attack = parseRange(text.attack ?? '');
  return {
    kind: 'detail',
    attackMin: attack?.[0],
    attackMax: attack?.[1],
    magic: parseFirstNumber(text.mad ?? '') ?? undefined,
    accuracy: parseFirstNumber(text.acc ?? '') ?? undefined,
    avoid: parseFirstNumber(text.eva ?? '') ?? undefined,
    criticalRate: parseFirstNumber(text.crt ?? '') ?? undefined,
    criticalDamage: parseFirstNumber(text.crd ?? '') ?? undefined,
  };
}

function readSkillWindow(screen: RawImage, at: Origin, kit: WindowKit): SkillReading {
  const levels: Record<number, number> = {};
  const entries = skillEntries(screen, at);
  const book = bookForWindow(screen, entries, kit.skillPrints);
  for (const entry of entries) {
    const match = matchIconAt(screen, entry.iconLeft, entry.iconTop, book);
    if (!match) continue;
    const value = parseFirstNumber(readGlyphs(entry.level, kit.glyphs));
    if (value !== null) levels[match.id] = value;
  }
  return { kind: 'skills', levels };
}

async function readEquipmentWindow(screen: RawImage, at: Origin, kit: WindowKit, prints: PrintBook): Promise<EquipmentReading> {
  const deco = isDecoTab(screen, at);
  const itemIds: number[] = [];
  let unidentified = 0;
  const { child, slots } = kit.layout.equipment;
  for (const [slot, [x, y]] of Object.entries(slots)) {
    const left = at.x + child[0] + x;
    const top = at.y + child[1] + y;
    if (looksEmpty(screen, kit.templates.equipment, left - at.x, top - at.y, at) || looksFlat(screen, left, top)) continue;
    const fits = SLOT_PREFIXES[slot] ?? (() => false);
    const shortlist = closestByPrint(screen, left, top, prints.filter(([id]) => fits(Math.floor(id / 10000))), SHORTLIST);
    const icons = await Promise.all(shortlist.map(async (id): Promise<[number, RawImage]> => [id, await kit.itemIcon(id)]));
    const match = bestMaskedMatch(screen, left, top, icons);
    if (match) itemIds.push(match.id);
    else unidentified++;
  }
  return { kind: 'equipment', itemIds, deco, unidentified };
}

function bookForWindow(screen: RawImage, entries: { iconLeft: number; iconTop: number }[], prints: PrintBook): PrintBook {
  const jobs = [...new Set(prints.map(([id]) => Math.floor(id / 10000)))];
  let best: { job: number; matched: number; distance: number } | null = null;
  for (const job of jobs) {
    const book = prints.filter(([id]) => Math.floor(id / 10000) === job);
    const matches = entries.map((entry) => matchIconAt(screen, entry.iconLeft, entry.iconTop, book)).filter((match) => match !== null);
    const distance = matches.reduce((total, match) => total + match.distance, 0);
    if (!best || matches.length > best.matched || (matches.length === best.matched && distance < best.distance)) best = { job, matched: matches.length, distance };
  }
  return best ? prints.filter(([id]) => Math.floor(id / 10000) === best.job) : prints;
}

function headerBorder(screen: RawImage, at: Origin): number | null {
  const x = at.x + 100;
  for (let y = Math.max(0, at.y + SKILL_HEADER_SCAN_FROM); y < Math.min(screen.height, at.y + SKILL_HEADER_SCAN_FROM + 20); y++) {
    const index = (y * screen.width + x) * 4;
    const brightness = (screen.data[index] + screen.data[index + 1] + screen.data[index + 2]) / 3;
    if (brightness < 190 && screen.data[index + 2] > brightness) return y;
  }
  return null;
}

function isDecoTab(screen: RawImage, at: Origin): boolean {
  return redness(screen, at, DECO_TAB) > redness(screen, at, EQUIP_TAB);
}

function redness(screen: RawImage, at: Origin, box: { left: number; top: number; width: number; height: number }): number {
  let total = 0;
  for (let y = 0; y < box.height; y++) {
    for (let x = 0; x < box.width; x++) {
      const index = ((at.y + box.top + y) * screen.width + at.x + box.left + x) * 4;
      total += screen.data[index] - (screen.data[index + 1] + screen.data[index + 2]) / 2;
    }
  }
  return total / (box.width * box.height);
}

function looksEmpty(screen: RawImage, template: RawImage, offsetX: number, offsetY: number, at: Origin): boolean {
  const onScreen = iconFingerprint(crop(screen, at.x + offsetX, at.y + offsetY, 32, 32));
  const blank = iconFingerprint(crop(template, offsetX, offsetY, 32, 32));
  return printDistance(onScreen, blank) <= EMPTY_SLOT_LIMIT;
}

function looksFlat(screen: RawImage, left: number, top: number): boolean {
  const area = crop(screen, left + 2, top + 2, 28, 28);
  const values: number[] = [];
  for (let index = 0; index < area.data.length; index += 4) values.push((area.data[index] + area.data[index + 1] + area.data[index + 2]) / 3);
  const mean = values.reduce((total, value) => total + value, 0) / values.length;
  const spread = Math.sqrt(values.reduce((total, value) => total + (value - mean) ** 2, 0) / values.length);
  return spread < FLAT_SLOT_SPREAD;
}

function blankedOut(screen: RawImage, at: Origin, template: RawImage): RawImage {
  const data = new Uint8ClampedArray(screen.data);
  for (let y = Math.max(0, at.y); y < Math.min(screen.height, at.y + template.height); y++) {
    for (let x = Math.max(0, at.x); x < Math.min(screen.width, at.x + template.width); x++) data.fill(0, (y * screen.width + x) * 4, (y * screen.width + x) * 4 + 3);
  }
  return { width: screen.width, height: screen.height, data };
}
