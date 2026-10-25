import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { defaultCharacter } from '../character/defaults';
import { loadActiveCharacterId, loadCharacters, newCharacterId, removeCharacter, saveActiveCharacterId, saveCharacters, upsertCharacter } from '../character/storage';
import type { Character } from '../character/types';
import { loadSiteData, type SiteData } from '../data/loadGameData';

interface SiteState {
  site: SiteData;
  characters: Character[];
  character: Character;
  selectCharacter: (id: string) => void;
  saveCharacter: (character: Character) => Promise<void>;
  addCharacter: () => Promise<void>;
  deleteCharacter: (id: string) => Promise<void>;
}

const SiteContext = createContext<SiteState | null>(null);
const FIRST_JOB = 410;
const FIRST_LEVEL = 34;

export function useSite(): SiteState {
  const state = useContext(SiteContext);
  if (!state) throw new Error('useSite must be used inside <SiteProvider>.');
  return state;
}

export function SiteProvider({ children }: { children: ReactNode }) {
  const [site, setSite] = useState<SiteData | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadSiteData(), loadCharacters(), loadActiveCharacterId()])
      .then(([loaded, saved, active]) => {
        if (cancelled) return;
        const starting = saved.length ? saved : [{ ...defaultCharacter(FIRST_JOB, FIRST_LEVEL, { data: loaded.game, guides: loaded.guides, items: loaded.itemList }), id: newCharacterId() }];
        setSite(loaded);
        setCharacters(starting);
        setActiveId(active && starting.some((character) => character.id === active) ? active : starting[0].id);
      })
      .catch((error: unknown) => setProblem(error instanceof Error ? error.message : String(error)));
    return () => {
      cancelled = true;
    };
  }, []);

  const saveCharacter = useCallback(async (character: Character) => {
    const next = upsertCharacter(characters, character);
    setCharacters(next);
    setActiveId(character.id);
    await saveCharacters(next);
    await saveActiveCharacterId(character.id);
  }, [characters]);

  const selectCharacter = useCallback((id: string) => {
    setActiveId(id);
    saveActiveCharacterId(id).catch((error: unknown) => setProblem(`Couldn't remember your choice: ${String(error)}`));
  }, []);

  const addCharacter = useCallback(async () => {
    if (!site) return;
    const fresh = { ...defaultCharacter(FIRST_JOB, FIRST_LEVEL, { data: site.game, guides: site.guides, items: site.itemList }), id: newCharacterId(), name: 'New character' };
    await saveCharacter(fresh);
  }, [site, saveCharacter]);

  const deleteCharacter = useCallback(async (id: string) => {
    if (!site) return;
    const remaining = removeCharacter(characters, id);
    const next = remaining.length ? remaining : [{ ...defaultCharacter(FIRST_JOB, FIRST_LEVEL, { data: site.game, guides: site.guides, items: site.itemList }), id: newCharacterId() }];
    setCharacters(next);
    setActiveId(next[0].id);
    await saveCharacters(next);
    await saveActiveCharacterId(next[0].id);
  }, [site, characters]);

  const value = useMemo(() => {
    if (!site) return null;
    const character = characters.find((candidate) => candidate.id === activeId) ?? characters[0];
    return character ? { site, characters, character, selectCharacter, saveCharacter, addCharacter, deleteCharacter } : null;
  }, [site, characters, activeId, selectCharacter, saveCharacter, addCharacter, deleteCharacter]);

  if (problem) return <main className="wrap page-head"><h1>Something went wrong</h1><p>{problem}</p></main>;
  if (!value) return <main className="wrap page-head"><h1>Loading game data…</h1><p>This takes a moment the first time.</p></main>;
  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
}
