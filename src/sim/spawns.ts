export const RESPAWN_TICK_SECONDS = 7.56;
export const POINT_COOLDOWN_SECONDS = 5;

export function capacityScale(players: number): number {
  return Math.min(1, 0.75 + 0.05 * (Math.max(1, players) - 1));
}
