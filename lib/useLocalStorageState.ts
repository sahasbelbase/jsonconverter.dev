import { useCallback, useEffect, useRef, useState } from 'react';

const MAX_PERSISTED_CHARS = 2_000_000;

type Area = 'local' | 'session';

const getArea = (area: Area): Storage | null => {
  try {
    return area === 'session' ? window.sessionStorage : window.localStorage;
  } catch {
    return null;
  }
};

interface Options {
  maxChars?: number;
  /**
   * `session` clears when the tab closes. Use it for anything credential-shaped,
   * such as the token in the JWT tool.
   */
  area?: Area;
}

/**
 * State that survives a reload, written back on a debounce.
 *
 * Each tool now owns its own persisted value instead of App.tsx holding one
 * giant blob of every tool's input and rewriting all of them on every keystroke.
 */
export function useLocalStorageState(
  key: string,
  initial = '',
  { maxChars = MAX_PERSISTED_CHARS, area = 'local' }: Options = {}
): [string, (value: string) => void] {
  const [value, setValue] = useState<string>(() => {
    try {
      return getArea(area)?.getItem(key) ?? initial;
    } catch {
      return initial;
    }
  });

  const keyRef = useRef(key);
  keyRef.current = key;

  useEffect(() => {
    const timer = setTimeout(() => {
      const storage = getArea(area);
      if (!storage) return;
      try {
        if (value.length > maxChars) return;
        if (value) storage.setItem(keyRef.current, value);
        else storage.removeItem(keyRef.current);
      } catch {
        /* quota exceeded or storage disabled — the tool still works */
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [value, maxChars, area]);

  const set = useCallback((next: string) => setValue(next), []);

  return [value, set];
}
