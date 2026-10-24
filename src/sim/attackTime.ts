export const MAGIC_SPEED_TIER = 6;
const STEP_MILLISECONDS = 30;

const WEAPON_ACTIONS: Record<number, string[]> = {
  30: ['swingO1', 'swingO2', 'swingO3', 'stabO1', 'stabO2'],
  31: ['swingO1', 'swingO2', 'swingO3'],
  32: ['swingO1', 'swingO2', 'swingO3'],
  33: ['stabO1', 'stabO2', 'swingO1'],
  37: ['swingO1', 'swingO2', 'swingO3'],
  38: ['swingO1', 'swingO2', 'swingO3'],
  40: ['swingT1', 'swingT2', 'swingT3'],
  41: ['swingT1', 'swingT2', 'swingT3'],
  42: ['swingT1', 'swingT2', 'swingT3'],
  43: ['stabT1', 'stabT2', 'swingP1', 'swingP2'],
  44: ['swingP1', 'swingP2', 'stabT1'],
  45: ['shoot1'],
  46: ['shoot2'],
  47: ['stabO1', 'swingO1'],
};

export function weaponActions(weaponType: number): string[] {
  return WEAPON_ACTIONS[weaponType] ?? ['swingO1'];
}

export function speedTier(weaponSpeed: number, boosterChange: number): number {
  return Math.min(12, Math.max(0, weaponSpeed + boosterChange));
}

export function actionMilliseconds(frameDelays: number[], tier: number): number {
  const timingTier = Math.min(10, Math.max(0, tier));
  const native = frameDelays.reduce((total, delay) => total + Math.trunc(delay * (10 + timingTier) / 16), 0);
  return STEP_MILLISECONDS * Math.ceil(native / STEP_MILLISECONDS);
}

export function averageActionMilliseconds(actions: string[], delays: Record<string, number[]>, tier: number): number {
  const known = actions.filter((action) => delays[action]?.length);
  if (known.length === 0) return actionMilliseconds([300, 150, 350], tier);
  return known.reduce((total, action) => total + actionMilliseconds(delays[action], tier), 0) / known.length;
}

export function walkPixelsPerSecond(speedPercent: number): number {
  return 125 * (Math.min(140, speedPercent) + 20) / 100;
}

export function climbPixelsPerSecond(speedPercent: number): number {
  return Math.min(140, speedPercent) + 20;
}
