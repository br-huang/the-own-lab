import { Tab } from './tab';
import { Workspace } from './workspace';

export interface SessionState {
  workspaces: Workspace[];
  tabs: Tab[];
  activeWorkspaceId: string;
  activeTabId: string | null;
}

export interface SessionManager {
  saveState(): Promise<void>;
  restoreState(): Promise<SessionState>;
  getRecentlyClosed(): Promise<Tab[]>;
  reopenTab(tabId: string): Promise<Tab>;
}
