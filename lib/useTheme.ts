import { useCallback, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

const readStoredTheme = (): Theme | null => {
  try {
    const stored = localStorage.getItem('theme');
    return stored === 'dark' || stored === 'light' ? stored : null;
  } catch {
    return null;
  }
};

/**
 * The theme a user picks is now remembered.
 *
 * Previously `theme` reset to `light` on every load and a mount effect only ever
 * consulted `prefers-color-scheme`, so the toggle was forgotten on reload while
 * every text field in the app was persisted. The inline script in index.html
 * applies the stored class before first paint; this hook keeps it in sync.
 *
 * Nothing is written to storage until the user actually toggles, so until then
 * the app keeps following the OS setting.
 */
export const useTheme = (): [Theme, () => void] => {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = readStoredTheme();
    if (stored) return stored;
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  // Follow the OS only while the user has not made an explicit choice.
  useEffect(() => {
    if (readStoredTheme()) return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => {
      if (readStoredTheme()) return;
      setTheme(e.matches ? 'dark' : 'light');
    };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === 'light' ? 'dark' : 'light';
      try {
        localStorage.setItem('theme', next);
      } catch {
        /* storage disabled; the choice just won't survive a reload */
      }
      return next;
    });
  }, []);

  return [theme, toggle];
};
