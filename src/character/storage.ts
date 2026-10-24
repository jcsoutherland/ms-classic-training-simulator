import { createStore, get, set, type UseStore } from 'idb-keyval';
import type { Character } from './types';

const CHARACTERS_KEY = 'characters';
const ACTIVE_KEY = 'active-character';
let openedStore: UseStore | null = null;

function store(): UseStore {
  openedStore ??= createStore('ms-classic-training-simulator', 'characters');
  return openedStore;
}

export async function loadCharacters(): Promise<Character[]> {
  return (await get<Character[]>(CHARACTERS_KEY, store())) ?? [];
}

export async function saveCharacters(characters: Character[]): Promise<void> {
  await set(CHARACTERS_KEY, characters, store());
}

export async function loadActiveCharacterId(): Promise<string | null> {
  return (await get<string>(ACTIVE_KEY, store())) ?? null;
}

export async function saveActiveCharacterId(id: string): Promise<void> {
  await set(ACTIVE_KEY, id, store());
}

export function upsertCharacter(characters: Character[], character: Character): Character[] {
  const index = characters.findIndex((existing) => existing.id === character.id);
  if (index === -1) return [...characters, character];
  return characters.map((existing, position) => (position === index ? character : existing));
}

export function newCharacterId(): string {
  return `character-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}
