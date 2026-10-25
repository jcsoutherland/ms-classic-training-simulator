export const STAT_SHOT = 'stat.png';

export const STAT_VALUES: Record<string, string> = {
  level: '40', hp: '1369/1369', mp: '1101/1128', exp: '76483 (25%)', fame: '31',
  str: '40 (38+2)', dex: '196 (174+22)', int: '4', luk: '4',
};

export const DETAIL_VALUES: Record<string, string> = {
  attack: '283 - 359', pdd: '165', mad: '2', mdd: '38', acc: '88', eva: '41', crt: '37%', crd: '137%', spd: '110%', jmp: '100%',
};

export const SKILL_SHOTS: Record<string, number[]> = {
  'skill_1.png': [3, 3, 3],
  'skill_2.png': [15, 15, 10, 1, 20, 0],
  'skill_3.png': [20, 1, 1, 5, 2, 2],
};

export const SKILL_LEVELS_BY_NAME: Record<string, number> = {
  'Three Snails': 3, Recovery: 3, 'Nimble Feet': 3,
  'Critical Shot': 15, 'The Eye of Amazon': 15, Focus: 10, 'Power Knockback': 1, 'Arrow Blow': 20, 'Double Shot': 0,
  'Bow Mastery': 20, "Amazon's Judgement": 1, 'Final Attack: Bow': 1, 'Bow Booster': 5, 'Soul Arrow: Bow': 2, 'Arrow Bomb': 2,
};
