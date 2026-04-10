import { TitleBar } from './TitleBar';
import { StatusBar } from './StatusBar';
import { Sidebar } from './Sidebar';
import { EditorArea } from '../editor/EditorArea';
import { useAppStore } from '../../stores/app-store';

export function AppShell() {
  const sidebarOpen = useAppStore((s) => s.sidebarOpen);

  return (
    <div className="flex flex-col h-screen">
      <TitleBar />

      <div className="flex flex-1 overflow-hidden">
        {sidebarOpen && <Sidebar />}
        <EditorArea />
      </div>

      <StatusBar />
    </div>
  );
}
