import { createStore, get, set, type UseStore } from 'idb-keyval';

const FIRST_RENDER_TIMEOUT = 120_000;
const BACKOFF = [30_000, 90_000, 180_000];
let openedStore: UseStore | null = null;

function store(): UseStore {
  openedStore ??= createStore('ms-classic-training-simulator-sprites', 'frames');
  return openedStore;
}

export async function savedImage(url: string): Promise<ImageBitmap | null> {
  const saved = await get<Blob>(url, store());
  return saved ? createImageBitmap(saved) : null;
}

export async function cachedImage(url: string, isCancelled: () => boolean): Promise<ImageBitmap> {
  const saved = await savedImage(url);
  if (saved) return saved;
  for (let attempt = 0; ; attempt++) {
    try {
      return await fetchAndSave(url);
    } catch (error) {
      if (attempt >= BACKOFF.length || isCancelled()) throw error;
      await new Promise((resolve) => setTimeout(resolve, BACKOFF[attempt]));
    }
  }
}

export async function loadImage(url: string): Promise<ImageBitmap> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Couldn't load ${url} (${response.status}).`);
  return createImageBitmap(await response.blob());
}

async function fetchAndSave(url: string): Promise<ImageBitmap> {
  const response = await fetch(url, { signal: AbortSignal.timeout(FIRST_RENDER_TIMEOUT) });
  if (!response.ok) throw new Error(`The character service is busy (${response.status}). Trying again shortly.`);
  const blob = await response.blob();
  if (!blob.type.startsWith('image/')) throw new Error('The character service sent something that is not a picture.');
  await set(url, blob, store());
  return createImageBitmap(blob);
}
