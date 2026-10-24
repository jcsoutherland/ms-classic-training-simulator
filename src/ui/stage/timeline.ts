export interface Frame<Image> {
  image: Image;
  width: number;
  height: number;
  originX: number;
  originY: number;
  delay: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface StageScript<Image> {
  feet: Point;
  monster: Point | null;
  stand: Frame<Image>[];
  attack: Frame<Image>[];
  buffs: Frame<Image>[][];
  attackEffect: Frame<Image>[];
  projectile: Frame<Image>[];
  projectiles: number;
  hitSpark: Frame<Image>[];
  monsterStand: Frame<Image>[];
  monsterHit: Frame<Image>[];
  monsterDie: Frame<Image>[];
  castsToKill: number;
}

export interface DrawCommand<Image> {
  image: Image;
  left: number;
  top: number;
  flip: boolean;
  alpha: number;
}

export const BUFF_INTERVAL = 30_000;
const REST = 400;
const FLIGHT = 180;
const PROJECTILE_GAP = 80;
const HIT_POSE = 300;
const RESPAWN_FADE = 300;

export function totalDelay<Image>(frames: Frame<Image>[]): number {
  return frames.reduce((total, frame) => total + frame.delay, 0);
}

export function frameAt<Image>(frames: Frame<Image>[], time: number, loop: boolean): Frame<Image> | null {
  if (frames.length === 0 || time < 0) return null;
  const length = totalDelay(frames);
  if (length <= 0) return frames[0];
  let remaining = loop ? time % length : time;
  if (!loop && remaining >= length) return null;
  for (const frame of frames) {
    if (remaining < frame.delay) return frame;
    remaining -= frame.delay;
  }
  return frames[frames.length - 1];
}

export function castLength<Image>(script: StageScript<Image>): number {
  return Math.max(totalDelay(script.attack), 300) + REST;
}

export function stageFrame<Image>(script: StageScript<Image>, elapsed: number, attacking: boolean): DrawCommand<Image>[] {
  const commands: DrawCommand<Image>[] = [];
  const inInterval = elapsed % BUFF_INTERVAL;
  const buffLength = script.buffs.reduce((total, frames) => total + totalDelay(frames), 0);
  if (!attacking || inInterval < buffLength) {
    drawMonster(commands, script, script.monsterStand, elapsed, 1);
    drawBody(commands, script, frameAt(script.stand, elapsed, true));
    if (attacking) drawBuff(commands, script, inInterval);
    return commands;
  }
  const sinceBuffs = inInterval - buffLength;
  const cast = Math.floor(sinceBuffs / castLength(script));
  const beat = sinceBuffs % castLength(script);
  drawAttackMonster(commands, script, cast, beat);
  const attackLength = totalDelay(script.attack);
  drawBody(commands, script, beat < attackLength ? frameAt(script.attack, beat, false) : frameAt(script.stand, beat, true));
  drawAround(commands, script, frameAt(script.attackEffect, beat, false));
  drawProjectiles(commands, script, beat);
  drawSparks(commands, script, beat);
  return commands;
}

export function impactTimes<Image>(script: StageScript<Image>): number[] {
  const attackLength = Math.max(totalDelay(script.attack), 300);
  if (!script.monster) return [];
  if (script.projectile.length === 0) return [attackLength * 0.5];
  return Array.from({ length: Math.max(1, script.projectiles) }, (_, index) => attackLength * 0.4 + index * PROJECTILE_GAP + FLIGHT);
}

function drawBody<Image>(commands: DrawCommand<Image>[], script: StageScript<Image>, frame: Frame<Image> | null): void {
  if (!frame) return;
  commands.push({ image: frame.image, left: script.feet.x - frame.width / 2, top: script.feet.y - frame.height / 2, flip: true, alpha: 1 });
}

function drawAround<Image>(commands: DrawCommand<Image>[], script: StageScript<Image>, frame: Frame<Image> | null): void {
  if (!frame) return;
  commands.push({ image: frame.image, left: script.feet.x - (frame.width - frame.originX), top: script.feet.y - frame.originY, flip: true, alpha: 1 });
}

function drawBuff<Image>(commands: DrawCommand<Image>[], script: StageScript<Image>, time: number): void {
  let start = 0;
  for (const frames of script.buffs) {
    const length = totalDelay(frames);
    if (time < start + length) {
      drawAround(commands, script, frameAt(frames, time - start, false));
      return;
    }
    start += length;
  }
}

function drawMonster<Image>(commands: DrawCommand<Image>[], script: StageScript<Image>, frames: Frame<Image>[], time: number, alpha: number): void {
  const frame = frameAt(frames, time, frames === script.monsterStand);
  if (!frame || !script.monster) return;
  commands.push({ image: frame.image, left: script.monster.x - frame.originX, top: script.monster.y - frame.originY, flip: false, alpha });
}

function drawAttackMonster<Image>(commands: DrawCommand<Image>[], script: StageScript<Image>, cast: number, beat: number): void {
  const firstImpact = impactTimes(script)[0] ?? Infinity;
  const killingBlow = cast % Math.max(1, script.castsToKill) === Math.max(1, script.castsToKill) - 1;
  const justRespawned = cast > 0 && (cast - 1) % Math.max(1, script.castsToKill) === Math.max(1, script.castsToKill) - 1;
  if (beat < firstImpact) {
    drawMonster(commands, script, script.monsterStand, beat, justRespawned ? Math.min(1, beat / RESPAWN_FADE) : 1);
    return;
  }
  if (killingBlow) {
    drawMonster(commands, script, script.monsterDie, beat - firstImpact, 1);
    return;
  }
  const hitFrames = beat - firstImpact < HIT_POSE && script.monsterHit.length ? script.monsterHit : script.monsterStand;
  drawMonster(commands, script, hitFrames, hitFrames === script.monsterHit ? 0 : beat, 1);
}

function drawProjectiles<Image>(commands: DrawCommand<Image>[], script: StageScript<Image>, beat: number): void {
  if (!script.monster || script.projectile.length === 0) return;
  const start = { x: script.feet.x + 28, y: script.feet.y - 38 };
  const target = { x: script.monster.x, y: script.monster.y - 18 };
  for (const impact of impactTimes(script)) {
    const progress = (beat - (impact - FLIGHT)) / FLIGHT;
    if (progress < 0 || progress >= 1) continue;
    const frame = frameAt(script.projectile, beat, true);
    if (!frame) continue;
    const x = start.x + (target.x - start.x) * progress;
    const y = start.y + (target.y - start.y) * progress;
    commands.push({ image: frame.image, left: x - (frame.width - frame.originX), top: y - frame.originY, flip: true, alpha: 1 });
  }
}

function drawSparks<Image>(commands: DrawCommand<Image>[], script: StageScript<Image>, beat: number): void {
  if (!script.monster) return;
  impactTimes(script).forEach((impact, index) => {
    const frame = frameAt(script.hitSpark, beat - impact, false);
    if (!frame || !script.monster) return;
    const offset = index % 2 === 0 ? -4 : 6;
    commands.push({ image: frame.image, left: script.monster.x - frame.originX + offset, top: script.monster.y - 20 - frame.originY - offset, flip: false, alpha: 1 });
  });
}
