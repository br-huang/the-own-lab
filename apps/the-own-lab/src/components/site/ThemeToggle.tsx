import { useEffect, useState } from 'react';
import { Button } from 'ui';
import { THEME_STORAGE_KEY } from '@/lib/theme';

type ThemeMode = 'light' | 'dark';

function getResolvedTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light';

  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') return stored;

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: ThemeMode) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.classList.toggle('dark', theme === 'dark');
  document.documentElement.classList.toggle('light', theme === 'light');
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeMode>('light');

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');

    const sync = () => {
      const nextTheme = getResolvedTheme();
      applyTheme(nextTheme);
      setTheme(nextTheme);
    };

    sync();

    const onMediaChange = () => {
      const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (stored !== 'light' && stored !== 'dark') sync();
    };

    media.addEventListener('change', onMediaChange);
    window.addEventListener('storage', sync);

    return () => {
      media.removeEventListener('change', onMediaChange);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const toggleTheme = () => {
    const nextTheme: ThemeMode = theme === 'dark' ? 'light' : 'dark';
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    applyTheme(nextTheme);
    setTheme(nextTheme);
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      className="rounded-full border border-line-soft bg-card text-card-foreground shadow-soft hover:bg-surface-strong"
    >
      <span className="text-base leading-none text-primary" aria-hidden="true">
        {theme === 'dark' ? '☼' : '◐'}
      </span>
    </Button>
  );
}
