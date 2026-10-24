import type { Stat } from '../data/types';
import { locateTemplate, type Found } from './locate';
import { matchIconAt, type PrintBook } from './matchIcon';
import { matchJob, parseExpPercent, parseFirstNumber, parseRange, parseWholeNumber } from './parse';
import { crop, type RawImage } from './rawImage';
import type { DetailReading, EquipmentReading, Reading, SkillReading, StatReading } from './readings';
import type { TextReader } from './textReader';

export interface WindowLayout {
  stat: { values: Record<string, [number, number]>; ranges: Record<string, [number, number, number, number]> };
  detail: Record<string, [number, number]>;
  skill: { listTop: [number, number]; listBottom: [number, number]; entryHeight: number; margin: number; icon: [number, number]; level: [number, number] };
  equipment: { child: [number, number]; slots: Record<string, [number, number]> };
}

export interface WindowKit {
  layout: WindowLayout;
  templates: Record<'stat' | 'stat-detail' | 'skill' | 'equipment', RawImage>;
  skillPrints: PrintBook;
  equipPrints: () => Promise<PrintBook>;
}

const VALUE_HEIGHT = 16;
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

export async function readScreenshot(screen: RawImage, kit: WindowKit, reader: TextReader): Promise<Reading[]> {
  const readings: Reading[] = [];
  const stat = locateTemplate(screen, kit.templates.stat);
  if (stat) readings.push(await readStatWindow(screen, stat, kit.layout, reader));
  const detail = locateTemplate(screen, kit.templates['stat-detail']);
  if (detail) readings.push(await readDetailWindow(screen, detail, kit.layout, reader));
  const skill = locateTemplate(screen, kit.templates.skill);
  if (skill) readings.push(await readSkillWindow(screen, skill, kit, reader));
  const equipment = locateTemplate(screen, kit.templates.equipment);
  if (equipment) readings.push(readEquipmentWindow(screen, equipment, kit.layout, await kit.equipPrints()));
  return readings;
}

async function readStatWindow(screen: RawImage, at: Found, layout: WindowLayout, reader: TextReader): Promise<StatReading> {
  const value = (key: string, width = 120) => {
    const [x, y] = layout.stat.values[key];
    return crop(screen, at.x + x, at.y + y - 2, width, VALUE_HEIGHT);
  };
  const stats: Partial<Record<Stat, number>> = {};
  for (const [key, stat] of [['str', 'STR'], ['dex', 'DEX'], ['int', 'INT'], ['luk', 'LUK']] as const) {
    const [left, top, right, bottom] = layout.stat.ranges[key];
    stats[stat] = parseFirstNumber(await reader.readNumber(crop(screen, at.x + left, at.y + top, right - left, bottom - top))) ?? undefined;
  }
  return {
    kind: 'stats',
    name: (await reader.readText(value('name'))).replace(/[^A-Za-z0-9]/g, '') || undefined,
    jobId: matchJob(await reader.readText(value('job'))) ?? undefined,
    level: parseWholeNumber(await reader.readNumber(value('level', 60))) ?? undefined,
    expPercent: parseExpPercent(await reader.readNumber(value('exp'))) ?? undefined,
    stats,
  };
}

async function readDetailWindow(screen: RawImage, at: Found, layout: WindowLayout, reader: TextReader): Promise<DetailReading> {
  const value = async (key: string) => {
    const [x, y] = layout.detail[key];
    return reader.readNumber(crop(screen, at.x + x, at.y + y - 2, 100, VALUE_HEIGHT));
  };
  const attack = parseRange(await value('attack'));
  return {
    kind: 'detail',
    attackMin: attack?.[0],
    attackMax: attack?.[1],
    magic: parseFirstNumber(await value('mad')) ?? undefined,
    accuracy: parseFirstNumber(await value('acc')) ?? undefined,
    avoid: parseFirstNumber(await value('eva')) ?? undefined,
  };
}

async function readSkillWindow(screen: RawImage, at: Found, kit: WindowKit, reader: TextReader): Promise<SkillReading> {
  const { listTop, listBottom, entryHeight, margin, icon, level } = kit.layout.skill;
  const levels: Record<number, number> = {};
  for (let top = listTop[1]; top + entryHeight <= listBottom[1]; top += entryHeight + margin) {
    const match = matchIconAt(screen, at.x + listTop[0] + icon[0], at.y + top + icon[1], kit.skillPrints);
    if (!match) continue;
    const text = await reader.readNumber(crop(screen, at.x + listTop[0] + level[0], at.y + top + level[1] - 1, 70, 14));
    const value = parseFirstNumber(text);
    if (value !== null) levels[match.id] = value;
  }
  return { kind: 'skills', levels };
}

function readEquipmentWindow(screen: RawImage, at: Found, layout: WindowLayout, prints: PrintBook): EquipmentReading {
  const itemIds: number[] = [];
  const emptySlots: string[] = [];
  for (const [slot, [x, y]] of Object.entries(layout.equipment.slots)) {
    const fits = SLOT_PREFIXES[slot] ?? (() => false);
    const candidates = prints.filter(([id]) => fits(Math.floor(id / 10000)));
    const match = matchIconAt(screen, at.x + layout.equipment.child[0] + x, at.y + layout.equipment.child[1] + y, candidates);
    if (match) itemIds.push(match.id);
    else emptySlots.push(slot);
  }
  return { kind: 'equipment', itemIds, emptySlots };
}
