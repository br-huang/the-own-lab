import { create } from 'zustand';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  themeMode: ThemeMode;
  themeName: string;
  setThemeMode: (mode: ThemeMode) => void;
  setThemeName: (name: string) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  themeMode: 'system',
  themeName: 'default',
  setThemeMode: (themeMode) => set({ themeMode }),
  setThemeName: (themeName) => set({ themeName }),
}));
