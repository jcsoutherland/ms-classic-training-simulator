import type { Job, Skill, SkillKind, SkillLevel } from '../../../src/data/types';
import { childNodes, isNode, numberOf, vector, type GameFiles, type LoadedImage, type Sprite } from '../gameFiles';
import type { WzNode } from '../wz/image';
import type { Strings } from './strings';

export const SKILL_PACK = 'Packs/Skill_00000.ms';
export const CLASSIC_JOBS = [0, 100, 110, 120, 130, 200, 210, 220, 230, 300, 310, 320, 400, 410, 420];
const TYPE_PASSIVE = 50;
const TYPE_BUFF = 10;

const LEVEL_FIELDS: [string, keyof SkillLevel][] = [
  ['damage', 'damage'], ['mad', 'magic'], ['mobCount', 'mobCount'], ['attackCount', 'attackCount'],
  ['bulletCount', 'bulletCount'], ['range', 'range'], ['mastery', 'mastery'], ['accX', 'accuracy'], ['mpCon', 'mpCost'],
  ['time', 'duration'], ['x', 'x'], ['y', 'y'], ['speed', 'speed'], ['indiePad', 'attackBoost'], ['pad', 'attackBoost'],
  ['indieMad', 'magicBoost'], ['indiePdd', 'defenseBoost'], ['prop', 'chance'], ['fixdamage', 'fixedDamage'],
  ['indieAcc', 'accuracy'], ['indieEva', 'avoid'], ['evaX', 'avoid'], ['indieSpeed', 'speed'],
  ['crtX', 'criticalChance'], ['crdX', 'criticalDamage'],
];

export function jobImageName(jobId: number): string {
  return `Skill/${String(jobId).padStart(3, '0')}.img`;
}

export function readJobs(files: GameFiles, strings: Strings): Job[] {
  return CLASSIC_JOBS.map((jobId) => {
    const source = files.image(SKILL_PACK, jobImageName(jobId));
    const skillRoot = source.root.skill as WzNode | undefined;
    const skills = childNodes(skillRoot)
      .map(([id, node]) => readSkill(Number(id), node, strings, skillRoot))
      .filter((skill): skill is Skill => skill !== null)
      .sort((a, b) => a.id - b.id);
    return { id: jobId, name: strings.jobs.get(jobId) ?? `Job ${jobId}`, skills };
  });
}

export function readSkillSprites(files: GameFiles, jobId: number, skillId: number, part: 'icon' | 'effect' | 'hit' | 'ball'): Sprite[] {
  const source = files.image(SKILL_PACK, jobImageName(jobId));
  const node = (source.root.skill as WzNode | undefined)?.[String(skillId).padStart(7, '0')] as WzNode | undefined;
  if (!node) return [];
  if (part === 'icon') return compact([files.sprite(source, node.icon)]);
  return framesOf(files, source, firstAnimation(node[part] as WzNode | undefined) ?? lastLevelPart(node, part));
}

function readSkill(id: number, node: WzNode, strings: Strings, skillRoot: WzNode | undefined): Skill | null {
  const name = strings.skills.get(id);
  const levelNodes = childNodes(node.level as WzNode | undefined).sort((a, b) => Number(a[0]) - Number(b[0]));
  if (!name || levelNodes.length === 0) return null;
  const common = node.common as WzNode | undefined;
  const linked = linkedSkillLevels(node, skillRoot);
  const levels = levelNodes.map(([key, levelNode]) => ({ ...withoutZeroDamage(readLevel(levelNode, common)), ...linked.get(key) }));
  return {
    id,
    name: name.name,
    description: name.description.replace(/\\n/g, '\n'),
    kind: kindOf(node, levels),
    maxLevel: levels.length,
    element: typeof node.elemAttr === 'string' ? node.elemAttr : null,
    weaponTypes: [numberOf(node.weapon), numberOf(node.weapon2)].filter((value): value is number => value !== undefined && value > 0),
    actions: actionsOf(node.action),
    levels,
    levelText: name.levelText.map((text) => text.replace(/\n/g, ' ')),
    effects: { effect: !!node.effect, hit: !!node.hit || !!lastLevelPart(node, 'hit'), ball: !!node.ball || !!lastLevelPart(node, 'ball') },
  };
}

function readLevel(levelNode: WzNode, common: WzNode | undefined): SkillLevel {
  const level: SkillLevel = {};
  for (const source of [common, levelNode]) {
    if (!source) continue;
    for (const [field, key] of LEVEL_FIELDS) {
      const value = numberOf(source[field]);
      if (value !== undefined) (level as Record<string, number>)[key] = value;
    }
    const topLeft = vector(source.lt);
    const bottomRight = vector(source.rb);
    if (topLeft && bottomRight) level.hitBox = [topLeft[0], topLeft[1], bottomRight[0], bottomRight[1]];
  }
  return level;
}

function linkedSkillLevels(node: WzNode, skillRoot: WzNode | undefined): Map<string, SkillLevel> {
  const linkedId = childNodes(node.extraSkillInfo).map(([, info]) => info.skill).find((value) => typeof value === 'string');
  const linkedNode = typeof linkedId === 'string' ? skillRoot?.[linkedId] as WzNode | undefined : undefined;
  const levels = new Map<string, SkillLevel>();
  if (!linkedNode) return levels;
  const common = linkedNode.common as WzNode | undefined;
  for (const [key, levelNode] of childNodes(linkedNode.level)) levels.set(key, readLevel(levelNode, common));
  return levels;
}

function withoutZeroDamage(level: SkillLevel): SkillLevel {
  if (level.damage !== 0) return level;
  const copy = { ...level };
  delete copy.damage;
  return copy;
}

function actionsOf(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (!isNode(value)) return [];
  return Object.values(value).filter((action): action is string => typeof action === 'string');
}

function kindOf(node: WzNode, levels: SkillLevel[]): SkillKind {
  const type = numberOf((node.info as WzNode | undefined)?.type);
  const last = levels[levels.length - 1];
  if (type === TYPE_PASSIVE || node.psd) return 'passive';
  if (type === TYPE_BUFF) return 'buff';
  if (last.damage !== undefined || last.magic !== undefined || last.fixedDamage !== undefined) return 'attack';
  if (last.duration !== undefined) return 'buff';
  return 'passive';
}

function firstAnimation(node: WzNode | undefined): WzNode | undefined {
  if (!node) return undefined;
  if (node['0'] && typeof node['0'] === 'object' && !(node['0'] as WzNode).__canvas && (node['0'] as WzNode)['0']) return node['0'] as WzNode;
  return node;
}

function lastLevelPart(node: WzNode, part: string): WzNode | undefined {
  const levels = childNodes(node.level as WzNode | undefined);
  const last = levels[levels.length - 1]?.[1];
  return firstAnimation(last?.[part] as WzNode | undefined);
}

function framesOf(files: GameFiles, source: LoadedImage, node: WzNode | undefined): Sprite[] {
  return compact(childNodes(node)
    .filter(([key]) => /^\d+$/.test(key))
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([, frame]) => files.sprite(source, frame)));
}

function compact(sprites: (Sprite | null)[]): Sprite[] {
  return sprites.filter((sprite): sprite is Sprite => sprite !== null);
}
