import { KernelEvent, Rect } from './shared';

export interface WindowManager {
  setContentBounds(tabId: string, bounds: Rect): Promise<void>;
  setSidebarWidth(width: number): Promise<void>;
  toggleSidebar(): Promise<void>;
  enterSplitView(tabId1: string, tabId2: string, direction: 'horizontal' | 'vertical'): Promise<void>;
  exitSplitView(): Promise<void>;
  onBoundsChanged: KernelEvent<{ bounds: Rect }>;
}
