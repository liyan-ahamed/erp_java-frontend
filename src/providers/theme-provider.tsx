'use client';

import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

/** Only the colour-theme preference is stored in the browser; no ERP data is. */
export const THEME_STORAGE_KEY = 'forma-theme';

/**
 * Runs before React hydrates (see app/layout.tsx) so a dark-mode user never sees a light flash.
 * Kept tiny and dependency-free on purpose.
 */
export const themeInitScript = `try{if(localStorage.getItem('${THEME_STORAGE_KEY}')==='dark')document.documentElement.classList.add('dark')}catch(e){}`;

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');

  // The init script may already have applied dark mode; sync React state with it.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (document.documentElement.classList.contains('dark')) setTheme('dark');
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((current) => {
      const next = current === 'light' ? 'dark' : 'light';
      document.documentElement.classList.toggle('dark', next === 'dark');
      try {
        localStorage.setItem(THEME_STORAGE_KEY, next);
      } catch {
        // Storage can be unavailable (private mode); the toggle still works for this visit.
      }
      return next;
    });
  }, []);

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};
