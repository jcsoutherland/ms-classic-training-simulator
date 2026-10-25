import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { readScreenshot } from '../../src/ocr/readWindows';
import type { Reading } from '../../src/ocr/readings';
import { fileKit, loadPng } from './fixtureKit';

const FIXTURES = path.resolve('src/ocr/fixtures');

async function read(file: string): Promise<Reading[]> {
  return readScreenshot(await loadPng(path.join(FIXTURES, file)), await fileKit());
}

describe('reading Flynny\'s Stats window', () => {
  it('reads the level, EXP and stats', async () => {
    const stats = (await read('stat.png')).find((reading) => reading.kind === 'stats');
    expect(stats).toMatchObject({ level: 40, expPercent: 25, stats: { STR: 40, DEX: 196, INT: 4, LUK: 4 } });
  });

  it('reads attack, accuracy, evasion and crits from the Detail panel', async () => {
    const detail = (await read('stat.png')).find((reading) => reading.kind === 'detail');
    expect(detail).toMatchObject({ attackMin: 283, attackMax: 359, accuracy: 88, avoid: 41, criticalRate: 37, criticalDamage: 137 });
  });
});

describe('reading Flynny\'s Skill windows', () => {
  it('reads every Beginner skill level', async () => {
    const skills = (await read('skill_1.png')).find((reading) => reading.kind === 'skills');
    expect(skills?.kind === 'skills' && Object.values(skills.levels)).toEqual([3, 3, 3]);
  });

  it('reads every Bowman skill that has points', async () => {
    const skills = (await read('skill_2.png')).find((reading) => reading.kind === 'skills');
    expect(skills?.kind === 'skills' && skills.levels).toMatchObject({ 3000000: 15, 3000001: 15, 3001000: 10, 3001003: 1, 3001001: 20 });
  });

  it('reads every Hunter skill', async () => {
    const skills = (await read('skill_3.png')).find((reading) => reading.kind === 'skills');
    expect(skills?.kind === 'skills' && skills.levels).toEqual({ 3100000: 20, 3100001: 1, 3101000: 1, 3101001: 5, 3101003: 2, 3101004: 2 });
  });
});

describe('reading Flynny\'s Equipment window', () => {
  it('knows the Equip tab is not the Deco tab', async () => {
    const equipment = (await read('equips.png')).find((reading) => reading.kind === 'equipment');
    expect(equipment?.kind === 'equipment' && equipment.deco).toBe(false);
  });

  it('knows the Deco tab is open in the Deco screenshot', async () => {
    const equipment = (await read('equips_deco.png')).find((reading) => reading.kind === 'equipment');
    expect(equipment?.kind === 'equipment' && equipment.deco).toBe(true);
  });
});

describe('identifying Flynny\'s gear', () => {
  it('finds the Red Viper bow behind the WEAPON label', async () => {
    const equipment = (await read('equips.png')).find((reading) => reading.kind === 'equipment');
    expect(equipment?.kind === 'equipment' && equipment.itemIds).toContain(1452005);
  });

  it('identifies every worn item on the Equip tab', async () => {
    const equipment = (await read('equips.png')).find((reading) => reading.kind === 'equipment');
    expect(equipment?.kind === 'equipment' && equipment.unidentified).toBe(0);
  });
});

describe('reading several windows in one screenshot', () => {
  it('reads two Skill windows placed side by side', async () => {
    const left = await loadPng(path.join(FIXTURES, 'skill_2.png'));
    const right = await loadPng(path.join(FIXTURES, 'skill_3.png'));
    const width = left.width + right.width + 20;
    const height = Math.max(left.height, right.height);
    const data = new Uint8ClampedArray(width * height * 4).fill(40);
    for (let y = 0; y < height; y++) {
      if (y < left.height) data.set(left.data.subarray(y * left.width * 4, (y + 1) * left.width * 4), y * width * 4);
      if (y < right.height) data.set(right.data.subarray(y * right.width * 4, (y + 1) * right.width * 4), (y * width + left.width + 20) * 4);
    }
    const readings = await readScreenshot({ width, height, data }, await fileKit());
    expect(readings.filter((reading) => reading.kind === 'skills').length).toBe(2);
  });
});
