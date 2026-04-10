import { create } from 'zustand';

interface FileState {
  currentFilePath: string | null;
  currentFileName: string | null;
  setCurrentFile: (path: string | null, name: string | null) => void;
}

export const useFileStore = create<FileState>((set) => ({
  currentFilePath: null,
  currentFileName: null,
  setCurrentFile: (path, name) => set({ currentFilePath: path, currentFileName: name }),
}));
