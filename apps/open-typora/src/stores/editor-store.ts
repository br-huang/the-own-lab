import { create } from "zustand";

export type EditorMode = "wysiwyg" | "source";

interface EditorState {
  mode: EditorMode;
  isDirty: boolean;
  setMode: (mode: EditorMode) => void;
  setDirty: (dirty: boolean) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  mode: "wysiwyg",
  isDirty: false,
  setMode: (mode) => set({ mode }),
  setDirty: (isDirty) => set({ isDirty }),
}));
