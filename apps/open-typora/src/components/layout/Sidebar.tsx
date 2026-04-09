import { useAppStore } from "../../stores/app-store";

export function Sidebar() {
  const sidebarWidth = useAppStore((s) => s.sidebarWidth);

  return (
    <div
      className="no-select flex flex-col bg-(--color-bg-sidebar) border-r border-(--color-border-primary) overflow-hidden"
      style={{ width: sidebarWidth }}
    >
      {/* Sidebar header */}
      <div className="flex items-center px-3 py-2 text-xs font-semibold text-(--color-text-secondary) uppercase tracking-wide">
        Files
      </div>

      {/* File tree placeholder */}
      <div className="flex-1 overflow-y-auto px-2">
        <div className="py-8 text-center text-xs text-(--color-text-muted)">
          Open a folder to browse files
        </div>
      </div>
    </div>
  );
}
