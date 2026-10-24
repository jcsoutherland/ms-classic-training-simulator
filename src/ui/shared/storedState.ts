import { useCallback, useState } from 'react';

const PREFIX = 'ms-classic-training-simulator:';

export function readStored(key: string): string | null {
  try {
    return window.localStorage.getItem(PREFIX + key);
  } catch {
    return null;
  }
}

export function writeStored(key: string, value: string): boolean {
  try {
    window.localStorage.setItem(PREFIX + key, value);
    return true;
  } catch {
    return false;
  }
}

export function useStoredState(key: string, fallback: string): [string, (value: string) => void] {
  const [value, setValue] = useState(() => readStored(key) ?? fallback);
  const update = useCallback((next: string) => {
    setValue(next);
    writeStored(key, next);
  }, [key]);
  return [value, update];
}
