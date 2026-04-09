import { KernelEvent, FindOpts, FindResult } from './shared';

export interface Tab {
  id: string;
  url: string;
  title: string;
  favicon: string;
  workspaceId: string;
  isPinned: boolean;
  isMuted: boolean;
  isLoading: boolean;
  isActive: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  zoomFactor: number;
  audioPlaying: boolean;
}

export interface TabManager {
  getTab(tabId: string): Promise<Tab | null>;
  getAllTabs(): Promise<Tab[]>;
  getTabsByWorkspace(workspaceId: string): Promise<Tab[]>;
  getActiveTab(): Promise<Tab | null>;
  createTab(opts: { url?: string; workspaceId?: string; active?: boolean }): Promise<Tab>;
  closeTab(tabId: string): Promise<void>;
  closeTabs(tabIds: string[]): Promise<void>;
  activateTab(tabId: string): Promise<void>;
  navigateTo(tabId: string, url: string): Promise<void>;
  goBack(tabId: string): Promise<void>;
  goForward(tabId: string): Promise<void>;
  reload(tabId: string): Promise<void>;
  stop(tabId: string): Promise<void>;
  duplicateTab(tabId: string): Promise<Tab>;
  pinTab(tabId: string): Promise<void>;
  unpinTab(tabId: string): Promise<void>;
  muteTab(tabId: string): Promise<void>;
  unmuteTab(tabId: string): Promise<void>;
  moveTab(tabId: string, toIndex: number): Promise<void>;
  moveTabToWorkspace(tabId: string, workspaceId: string): Promise<void>;
  setZoom(tabId: string, factor: number): Promise<void>;
  findInPage(tabId: string, query: string, opts?: FindOpts): Promise<FindResult>;
  stopFindInPage(tabId: string): Promise<void>;
  onTabCreated: KernelEvent<Tab>;
  onTabClosed: KernelEvent<{ tabId: string }>;
  onTabUpdated: KernelEvent<{ tabId: string; changes: Partial<Tab> }>;
  onTabActivated: KernelEvent<{ tabId: string; previousTabId: string | null }>;
  onTabMoved: KernelEvent<{ tabId: string; fromIndex: number; toIndex: number }>;
}
