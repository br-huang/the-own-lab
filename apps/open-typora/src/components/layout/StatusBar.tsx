import { useEditorStore } from "../../stores/editor-store";

export function StatusBar() {
  const mode = useEditorStore((s) => s.mode);

  return (
    <div
      className="no-select flex items-center justify-between px-3 text-xs text-(--color-text-muted) bg-(--color-bg-statusbar) border-t border-(--color-border-primary)"
      style={{ height: "var(--statusbar-height)" }}
    >
      <div className="flex gap-3">
        <span>Words: 0</span>
        <span>Characters: 0</span>
      </div>
      <div className="flex gap-3">
        <span className="uppercase">{mode}</span>
      </div>
    </div>
  );
}
