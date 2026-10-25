export const MIX_STEP = 10;

export function stepUp(percent: number): number {
  return Math.min(100, Math.floor(percent / MIX_STEP) * MIX_STEP + MIX_STEP);
}

export function stepDown(percent: number): number {
  return Math.max(0, Math.ceil(percent / MIX_STEP) * MIX_STEP - MIX_STEP);
}
