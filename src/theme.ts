import { useState, useEffect } from 'react';

export type NatalTheme = 'black-rich' | 'silver-light';

export const NATAL_THEME_STORAGE_KEY = 'natal_theme';
export const NATAL_THEME_CHANGED_EVENT = 'natal_theme_changed';

/**
 * Returns the currently active theme from localStorage or defaults to 'black-rich'
 */
export function getStoredTheme(): NatalTheme {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(NATAL_THEME_STORAGE_KEY);
    } catch {}
  }
  return 'black-rich';
}

/**
 * Applies Black Rich theme to the document HTML & body and ensures clean state.
 */
export function applyTheme(theme: NatalTheme = 'black-rich') {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const body = document.body;

  root.setAttribute('data-theme', 'black-rich');
  root.classList.add('theme-black-rich');
  root.classList.remove('theme-silver');
  if (body) {
    body.setAttribute('data-theme', 'black-rich');
    body.classList.add('theme-black-rich');
    body.classList.remove('theme-silver');
  }

  try {
    localStorage.removeItem(NATAL_THEME_STORAGE_KEY);
  } catch {}
}

/**
 * Toggles between 'black-rich' and 'silver-light'
 */
export function toggleTheme(): NatalTheme {
  const current = getStoredTheme();
  const next: NatalTheme = current === 'black-rich' ? 'silver-light' : 'black-rich';
  applyTheme(next);
  return next;
}

/**
 * React hook to read, set, and toggle the theme with reactive updates
 */
export function useNatalTheme() {
  const [theme, setThemeState] = useState<NatalTheme>(getStoredTheme);

  useEffect(() => {
    // Ensure document attribute is initialized on mount
    const initial = getStoredTheme();
    applyTheme(initial);
    setThemeState(initial);

    const handleThemeChange = (e: any) => {
      const newTheme = e.detail || getStoredTheme();
      setThemeState(newTheme);
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === NATAL_THEME_STORAGE_KEY && (e.newValue === 'silver-light' || e.newValue === 'black-rich')) {
        setThemeState(e.newValue);
        applyTheme(e.newValue);
      }
    };

    window.addEventListener(NATAL_THEME_CHANGED_EVENT, handleThemeChange);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener(NATAL_THEME_CHANGED_EVENT, handleThemeChange);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const setTheme = (newTheme: NatalTheme) => {
    applyTheme(newTheme);
    setThemeState(newTheme);
  };

  const toggle = () => {
    const next = toggleTheme();
    setThemeState(next);
  };

  return {
    theme,
    isSilver: theme === 'silver-light',
    isBlackRich: theme === 'black-rich',
    setTheme,
    toggleTheme: toggle
  };
}
