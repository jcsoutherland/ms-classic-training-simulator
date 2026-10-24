import { useCallback, useMemo, useState } from 'react';
import type { DropTables } from '../../data/types';
import { rollDrops, seededRandom, seedFromText, type RolledDrop } from '../../sim/drops';
import { readStored, writeStored } from '../shared/storedState';

interface Reroll {
  rollKey: string;
  seed: number;
}

export function useDropRoll(rollKey: string, killsByMonster: Map<number, number>, tables: DropTables): { drops: RolledDrop[]; rollAgain: () => void } {
  const [reroll, setReroll] = useState<Reroll | null>(null);
  const seed = reroll?.rollKey === rollKey ? reroll.seed : savedSeed(rollKey);
  const drops = useMemo(() => rollDrops(killsByMonster, tables, seededRandom(seed)), [killsByMonster, tables, seed]);
  const rollAgain = useCallback(() => {
    const next = (Date.now() ^ Math.floor(Math.random() * 4294967296)) >>> 0;
    writeStored(`roll:${rollKey}`, String(next));
    setReroll({ rollKey, seed: next });
  }, [rollKey]);
  return { drops, rollAgain };
}

function savedSeed(rollKey: string): number {
  const saved = readStored(`roll:${rollKey}`);
  return saved !== null && Number.isFinite(Number(saved)) ? Number(saved) : seedFromText(rollKey);
}
