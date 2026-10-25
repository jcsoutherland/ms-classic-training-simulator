import { useEffect, useRef, useState } from 'react';
import { buildLook, frameUrl, lookKey, type Look } from '../../avatar/look';
import { cachedImage, loadImage } from '../../avatar/spriteCache';
import type { Character } from '../../character/types';
import { imageUrl, loadAnimations, type SiteData } from '../../data/loadGameData';
import type { Animations, Skill, SpriteFrame } from '../../data/types';
import { weaponActions } from '../../sim/attackTime';
import { learnedLevel } from '../../sim/buffs';
import { characterSkills } from '../../sim/simulateMap';
import type { Frame, Point, StageScript } from './timeline';

const SLIME = 7;
const BULLET_FOR_WEAPON: Record<number, number> = { 45: 2060000, 46: 2061000, 47: 2070000 };

export interface StageRequest {
  character: Character;
  site: SiteData;
  sceneFile: string;
  feet: Point;
  monster: { id: number; at: Point } | null;
  castsToKill: number;
}

export interface StageState {
  scene: ImageBitmap | null;
  script: StageScript<ImageBitmap> | null;
  characterReady: boolean;
  problem: string | null;
}

const EMPTY_STAGE: StageState = { scene: null, script: null, characterReady: false, problem: null };
const builtStages = new Map<string, StageState>();

export function useStageScript(request: StageRequest): StageState {
  const key = requestKey(request);
  const [state, setState] = useState<StageState>(() => builtStages.get(key) ?? EMPTY_STAGE);
  const latest = useRef(request);
  latest.current = request;
  useEffect(() => {
    const built = builtStages.get(key);
    if (built?.characterReady) {
      setState(built);
      return undefined;
    }
    let cancelled = false;
    const current = latest.current;
    const show = (next: StageState) => {
      if (next.script) builtStages.set(key, next);
      if (!cancelled) setState(next);
    };
    buildScene(current)
      .then(({ scene, script }) => {
        if (cancelled) return null;
        show({ scene, script, characterReady: false, problem: null });
        return loadBody(current, script, () => cancelled).then((body) => (body ? { scene, script: { ...script, ...body } } : null));
      })
      .then((ready) => {
        if (ready) show({ ...ready, characterReady: true, problem: null });
      })
      .catch((error: unknown) => {
        if (!cancelled) setState((previous) => ({ ...previous, problem: error instanceof Error ? error.message : String(error) }));
      });
    return () => { cancelled = true; };
  }, [key]);
  return state;
}

function requestKey({ character, site, sceneFile, feet, monster, castsToKill }: StageRequest): string {
  const look = lookKey(buildLook(character, site.items));
  return [look, sceneFile, monster?.id, monster?.at.x, monster?.at.y, feet.x, feet.y, castsToKill, JSON.stringify(character.attackMix), JSON.stringify(character.skills)].join('|');
}

async function buildScene(request: StageRequest): Promise<{ scene: ImageBitmap; script: StageScript<ImageBitmap> }> {
  const { character, site, sceneFile, feet, monster, castsToKill } = request;
  const animations = await loadAnimations();
  const skills = characterSkills(character, site.game);
  const mainSkill = mainAttackSkill(character, skills);
  const skillAnimations = mainSkill ? animations.skills[mainSkill.id] ?? {} : {};
  const monsterId = monster && idleAnimation(animations.mobs[monster.id] ?? {}) ? monster.id : SLIME;
  const monsterAnimations = animations.mobs[monsterId] ?? {};
  const idle = idleAnimation(monsterAnimations);
  const bulletId = BULLET_FOR_WEAPON[character.weaponType];
  const isSpell = mainSkill?.levels[0].magic !== undefined;
  const [scene, attackEffect, hitSpark, projectile, buffs, monsterStand, monsterHit, monsterDie] = await Promise.all([
    loadImage(imageUrl(`scenes/${sceneFile}.webp`)),
    framesFrom(`img/skills/${mainSkill?.id}`, 'effect', skillAnimations.effect),
    framesFrom(`img/skills/${mainSkill?.id}`, 'hit', skillAnimations.hit),
    skillAnimations.ball ? framesFrom(`img/skills/${mainSkill?.id}`, 'ball', skillAnimations.ball) : isSpell ? Promise.resolve([]) : framesFrom(`img/bullets/${bulletId}`, 'bullet', animations.bullets[bulletId]),
    Promise.all(buffSkills(character, skills).map((skill) => framesFrom(`img/skills/${skill.id}`, 'effect', animations.skills[skill.id]?.effect))),
    monster && idle ? framesFrom(`img/mobs/${monsterId}`, idle, monsterAnimations[idle]) : Promise.resolve([]),
    monster ? framesFrom(`img/mobs/${monsterId}`, 'hit1', monsterAnimations.hit1) : Promise.resolve([]),
    monster ? framesFrom(`img/mobs/${monsterId}`, 'die1', monsterAnimations.die1) : Promise.resolve([]),
  ]);
  const level = mainSkill ? learnedLevel(character, mainSkill) : null;
  return {
    scene,
    script: {
      feet, monster: monster?.at ?? null, stand: [], attack: [],
      buffs: buffs.filter((frames) => frames.length > 0),
      attackEffect, projectile, projectiles: Math.max(1, level?.bulletCount ?? 1), hitSpark,
      monsterStand, monsterHit, monsterDie, castsToKill,
    },
  };
}

async function loadBody(request: StageRequest, script: StageScript<ImageBitmap>, isCancelled: () => boolean): Promise<Pick<StageScript<ImageBitmap>, 'stand' | 'attack'> | null> {
  const { character, site } = request;
  const mainSkill = mainAttackSkill(character, characterSkills(character, site.game));
  const attackAction = mainSkill?.actions[0] ?? weaponActions(character.weaponType)[0];
  const look = buildLook(character, site.items);
  const stand = await bodyFrames(look, 'stand1', site.game.actions.stand1 ?? [500, 500, 500], isCancelled);
  const attack = script.monster ? await bodyFrames(look, attackAction, site.game.actions[attackAction] ?? [300, 150, 350], isCancelled) : [];
  return isCancelled() ? null : { stand, attack };
}

function idleAnimation(animations: Animations): string | null {
  return ['stand', 'move', 'fly'].find((name) => animations[name]?.length) ?? null;
}

function mainAttackSkill(character: Character, skills: Skill[]): Skill | null {
  const [best] = Object.entries(character.attackMix).sort((a, b) => b[1] - a[1]);
  return skills.find((skill) => skill.id === Number(best?.[0])) ?? null;
}

function buffSkills(character: Character, skills: Skill[]): Skill[] {
  return skills.filter((skill) => skill.kind === 'buff' && skill.effects.effect && learnedLevel(character, skill) !== null);
}

async function bodyFrames(look: Look, action: string, delays: number[], isCancelled: () => boolean): Promise<Frame<ImageBitmap>[]> {
  const frames: Frame<ImageBitmap>[] = [];
  for (const [index, delay] of delays.entries()) {
    const image = await cachedImage(frameUrl(look, action, index), isCancelled);
    frames.push({ image, width: image.width, height: image.height, originX: image.width / 2, originY: image.height / 2, delay });
  }
  return frames;
}

async function framesFrom(folder: string, prefix: string, frames: SpriteFrame[] | undefined): Promise<Frame<ImageBitmap>[]> {
  if (!frames?.length) return [];
  const images = await Promise.all(frames.map((_, index) => loadImage(imageUrl(`${folder}/${prefix}-${index}.png`))));
  return images.map((image, index) => ({ image, ...frames[index] }));
}
