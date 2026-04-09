import { useFileStore } from "../../stores/file-store";
import { useEditorStore } from "../../stores/editor-store";

export function TitleBar() {
  const fileName = useFileStore((s) => s.currentFileName);
  const isDirty = useEditorStore((s) => s.isDirty);

  const title = fileName
    ? `${isDirty ? "● " : ""}${fileName} — Open Typora`
    : "Open Typora";

  return (
    <div
      data-tauri-drag-region
      className="no-select flex items-center bg-(--color-bg-titlebar) border-b border-(--color-border-primary)"
      style={{ height: "var(--titlebar-height)" }}
    >
      {/* macOS traffic light spacing */}
      <div className="w-[78px] shrink-0" />

      <div
        data-tauri-drag-region
        className="flex-1 text-center text-xs text-(--color-text-secondary) truncate"
      >
        {title}
      </div>

      <div className="w-[78px] shrink-0" />
    </div>
  );
}
