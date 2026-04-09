import type { Tab, Workspace, Suggestion, SecurityInfo, Rect, KernelEvent } from '@kernel/interfaces';

// Type definition for what the preload script exposes
export interface KernelClient {
  tabs: {
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
    onTabCreated: KernelEvent<Tab>;
    onTabClosed: KernelEvent<{ tabId: string }>;
    onTabUpdated: KernelEvent<{ tabId: string; changes: Partial<Tab> }>;
    onTabActivated: KernelEvent<{ tabId: string; previousTabId: string | null }>;
  };
  workspaces: {
    getWorkspace(id: string): Promise<Workspace | null>;
    getAllWorkspaces(): Promise<Workspace[]>;
    getActiveWorkspace(): Promise<Workspace>;
    createWorkspace(opts: { name: string; color?: string; icon?: string }): Promise<Workspace>;
    deleteWorkspace(id: string): Promise<void>;
    renameWorkspace(id: string, name: string): Promise<void>;
    updateWorkspace(id: string, changes: Partial<Omit<Workspace, 'id'>>): Promise<void>;
    activateWorkspace(id: string): Promise<void>;
    reorderWorkspace(id: string, newOrder: number): Promise<void>;
    onWorkspaceCreated: KernelEvent<Workspace>;
    onWorkspaceDeleted: KernelEvent<{ workspaceId: string }>;
    onWorkspaceUpdated: KernelEvent<{ workspaceId: string; changes: Partial<Workspace> }>;
    onWorkspaceActivated: KernelEvent<{ workspaceId: string; previousId: string }>;
  };
  navigation: {
    resolveInput(input: string): Promise<{ type: 'url' | 'search'; resolved: string }>;
    getSuggestions(query: string): Promise<Suggestion[]>;
    getSecurityInfo(tabId: string): Promise<SecurityInfo>;
  };
  window: {
    setContentBounds(tabId: string, bounds: Rect): Promise<void>;
    setSidebarWidth(width: number): Promise<void>;
    toggleSidebar(): Promise<void>;
    onBoundsChanged: KernelEvent<{ bounds: Rect }>;
  };
}

declare global {
  interface Window {
    kernel: KernelClient;
  }
}

// Convenience accessor
export function getKernel(): KernelClient {
  return window.kernel;
}
