import { useCallback, useEffect, useRef, useState } from 'react';

export interface Capture {
  id: number;
  name: string;
  blob: Blob;
  url: string;
}

const SNIP_URL = 'ms-screenclip:';

export interface Captures {
  captures: Capture[];
  add: (blobs: Blob[], label: string) => void;
  remove: (id: number) => void;
  clear: () => void;
  snip: () => void;
  problem: string | null;
}

export function useCaptures(): Captures {
  const [captures, setCaptures] = useState<Capture[]>([]);
  const [problem, setProblem] = useState<string | null>(null);
  const nextId = useRef(1);
  const waitingForSnip = useRef(false);

  const add = useCallback((blobs: Blob[], label: string) => {
    const images = blobs.filter((blob) => blob.type.startsWith('image/'));
    if (!images.length) return;
    setCaptures((current) => [...current, ...images.map((blob, index) => ({ id: nextId.current++, name: blob instanceof File ? blob.name : `${label} ${current.length + index + 1}`, blob, url: URL.createObjectURL(blob) }))]);
  }, []);

  const remove = useCallback((id: number) => {
    setCaptures((current) => current.filter((capture) => {
      if (capture.id === id) URL.revokeObjectURL(capture.url);
      return capture.id !== id;
    }));
  }, []);

  const clear = useCallback(() => {
    setCaptures((current) => {
      for (const capture of current) URL.revokeObjectURL(capture.url);
      return [];
    });
  }, []);

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => add([...(event.clipboardData?.files ?? [])], 'Pasted snip');
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [add]);

  useEffect(() => {
    const onFocus = () => {
      if (!waitingForSnip.current) return;
      waitingForSnip.current = false;
      readClipboardImages()
        .then((blobs) => {
          if (blobs.length) add(blobs, 'Snip');
          else setProblem('No snip found. Snip a window, then come back to this page, or press Ctrl+V.');
        })
        .catch(() => setProblem('Your browser blocked reading the snip. Press Ctrl+V on this page to add it.'));
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [add]);

  const snip = useCallback(() => {
    setProblem(null);
    waitingForSnip.current = true;
    window.location.href = SNIP_URL;
  }, []);

  return { captures, add, remove, clear, snip, problem };
}

async function readClipboardImages(): Promise<Blob[]> {
  if (!navigator.clipboard?.read) return [];
  const items = await navigator.clipboard.read();
  const blobs: Blob[] = [];
  for (const item of items) {
    const type = item.types.find((candidate) => candidate.startsWith('image/'));
    if (type) blobs.push(await item.getType(type));
  }
  return blobs;
}
