export const MAX_PARTY = 6;

export function partyBonus(members: number, membersWhoHit = 1): number {
  if (members <= 1) return 0;
  return Math.min(0.3, 0.1 * (members - 1)) + 0.05 * (Math.max(1, membersWhoHit) - 1);
}

export function expPerMember(monsterExp: number, members: number): number {
  if (members <= 1) return monsterExp;
  const share = Math.max(1, Math.round(monsterExp / members));
  const bonus = partyBonus(members);
  return share + (bonus > 0 ? Math.max(1, Math.round(share * bonus)) : 0);
}

export function evenShare(total: number, members: number): number {
  return total / Math.max(1, members);
}
