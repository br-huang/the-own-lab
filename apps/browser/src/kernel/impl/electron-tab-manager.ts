import { BaseWindow, WebContentsView } from 'electron';
import { Tab, TabManager } from '../interfaces/tab';
import { FindOpts, FindResult } from '../interfaces/shared';
import { KernelEventEmitter } from './kernel-event';
import { DEFAULT_URL } from '../../shared/constants';
import crypto from 'crypto';

interface TabEntry {
  tab: Tab;
  view: WebContentsView;
}

export class ElectronTabManager implements TabManager {
  private entries: Map<string, TabEntry> = new Map();
  private activeTabId: string | null = null;
  private tabOrder: string[] = [];

  onTabCreated = new KernelEventEmitter<Tab>();
  onTabClosed = new KernelEventEmitter<{ tabId: string }>();
  onTabUpdated = new KernelEventEmitter<{ tabId: string; changes: Partial<Tab> }>();
  onTabActivated = new KernelEventEmitter<{ tabId: string; previousTabId: string | null }>();
  onTabMoved = new KernelEventEmitter<{ tabId: string; fromIndex: number; toIndex: number }>();

  constructor(
    private mainWindow: BaseWindow,
    private uiView: WebContentsView,
    private getContentBounds: () => Electron.Rectangle,
  ) {}

  async getTab(tabId: string): Promise<Tab | null> {
    return this.entries.get(tabId)?.tab ?? null;
  }

  async getAllTabs(): Promise<Tab[]> {
    return this.tabOrder.map((id) => this.entries.get(id)?.tab).filter((t): t is Tab => t != null);
  }

  async getTabsByWorkspace(workspaceId: string): Promise<Tab[]> {
    return (await this.getAllTabs()).filter((t) => t.workspaceId === workspaceId);
  }

  async getActiveTab(): Promise<Tab | null> {
    if (!this.activeTabId) return null;
    return this.entries.get(this.activeTabId)?.tab ?? null;
  }

  async createTab(opts: { url?: string; workspaceId?: string; active?: boolean }): Promise<Tab> {
    const id = crypto.randomUUID();
    const url = opts.url || DEFAULT_URL;

    const view = new WebContentsView({
      webPreferences: {
        contextIsolation: true,
        sandbox: true,
      },
    });

    const tab: Tab = {
      id,
      url,
      title: '',
      favicon: '',
      workspaceId: opts.workspaceId || '',
      isPinned: false,
      isMuted: false,
      isLoading: true,
      isActive: false,
      canGoBack: false,
      canGoForward: false,
      zoomFactor: 1,
      audioPlaying: false,
    };

    this.entries.set(id, { tab, view });
    this.tabOrder.push(id);

    this.attachWebContentsListeners(id, view);
    view.webContents.loadURL(url);

    this.onTabCreated.emit({ ...tab });

    if (opts.active !== false) {
      await this.activateTab(id);
    }

    return { ...tab };
  }

  async closeTab(tabId: string): Promise<void> {
    const entry = this.entries.get(tabId);
    if (!entry) return;

    if (this.activeTabId === tabId) {
      const idx = this.tabOrder.indexOf(tabId);
      const nextId = this.tabOrder[idx + 1] || this.tabOrder[idx - 1] || null;
      if (nextId) {
        await this.activateTab(nextId);
      } else {
        this.activeTabId = null;
      }
    }

    this.removeViewFromWindow(entry.view);

    if (!entry.view.webContents.isDestroyed()) {
      entry.view.webContents.removeAllListeners();
      entry.view.webContents.close();
    }

    this.entries.delete(tabId);
    this.tabOrder = this.tabOrder.filter((id) => id !== tabId);

    this.onTabClosed.emit({ tabId });
  }

  async closeTabs(tabIds: string[]): Promise<void> {
    for (const id of tabIds) {
      await this.closeTab(id);
    }
  }

  async activateTab(tabId: string): Promise<void> {
    const entry = this.entries.get(tabId);
    if (!entry) return;

    const previousTabId = this.activeTabId;
    if (previousTabId === tabId) return;

    // Hide previous active tab
    if (previousTabId) {
      const prevEntry = this.entries.get(previousTabId);
      if (prevEntry) {
        this.removeViewFromWindow(prevEntry.view);
        prevEntry.tab.isActive = false;
        this.onTabUpdated.emit({
          tabId: previousTabId,
          changes: { isActive: false },
        });
      }
    }

    // Show new active tab
    this.activeTabId = tabId;
    entry.tab.isActive = true;

    this.mainWindow.contentView.addChildView(entry.view);
    entry.view.setBounds(this.getContentBounds());

    this.onTabActivated.emit({ tabId, previousTabId });
    this.onTabUpdated.emit({
      tabId,
      changes: { isActive: true },
    });
  }

  async navigateTo(tabId: string, url: string): Promise<void> {
    const entry = this.entries.get(tabId);
    if (!entry) return;
    entry.view.webContents.loadURL(url);
  }

  async goBack(tabId: string): Promise<void> {
    const entry = this.entries.get(tabId);
    if (!entry) return;
    entry.view.webContents.goBack();
  }

  async goForward(tabId: string): Promise<void> {
    const entry = this.entries.get(tabId);
    if (!entry) return;
    entry.view.webContents.goForward();
  }

  async reload(tabId: string): Promise<void> {
    const entry = this.entries.get(tabId);
    if (!entry) return;
    entry.view.webContents.reload();
  }

  async stop(tabId: string): Promise<void> {
    const entry = this.entries.get(tabId);
    if (!entry) return;
    entry.view.webContents.stop();
  }

  async duplicateTab(tabId: string): Promise<Tab> {
    const entry = this.entries.get(tabId);
    if (!entry) throw new Error(`Tab not found: ${tabId}`);
    return this.createTab({
      url: entry.tab.url,
      workspaceId: entry.tab.workspaceId,
      active: true,
    });
  }

  async pinTab(tabId: string): Promise<void> {
    const entry = this.entries.get(tabId);
    if (!entry) return;
    entry.tab.isPinned = true;
    this.onTabUpdated.emit({ tabId, changes: { isPinned: true } });
  }

  async unpinTab(tabId: string): Promise<void> {
    const entry = this.entries.get(tabId);
    if (!entry) return;
    entry.tab.isPinned = false;
    this.onTabUpdated.emit({ tabId, changes: { isPinned: false } });
  }

  async muteTab(tabId: string): Promise<void> {
    const entry = this.entries.get(tabId);
    if (!entry) return;
    entry.view.webContents.setAudioMuted(true);
    entry.tab.isMuted = true;
    this.onTabUpdated.emit({ tabId, changes: { isMuted: true } });
  }

  async unmuteTab(tabId: string): Promise<void> {
    const entry = this.entries.get(tabId);
    if (!entry) return;
    entry.view.webContents.setAudioMuted(false);
    entry.tab.isMuted = false;
    this.onTabUpdated.emit({ tabId, changes: { isMuted: false } });
  }

  async moveTab(tabId: string, toIndex: number): Promise<void> {
    const fromIndex = this.tabOrder.indexOf(tabId);
    if (fromIndex === -1) return;
    this.tabOrder.splice(fromIndex, 1);
    this.tabOrder.splice(toIndex, 0, tabId);
    this.onTabMoved.emit({ tabId, fromIndex, toIndex });
  }

  async moveTabToWorkspace(tabId: string, workspaceId: string): Promise<void> {
    const entry = this.entries.get(tabId);
    if (!entry) return;
    entry.tab.workspaceId = workspaceId;
    this.onTabUpdated.emit({ tabId, changes: { workspaceId } });
  }

  async setZoom(tabId: string, factor: number): Promise<void> {
    const entry = this.entries.get(tabId);
    if (!entry) return;
    entry.view.webContents.setZoomFactor(factor);
    entry.tab.zoomFactor = factor;
    this.onTabUpdated.emit({ tabId, changes: { zoomFactor: factor } });
  }

  async findInPage(tabId: string, query: string, opts?: FindOpts): Promise<FindResult> {
    const entry = this.entries.get(tabId);
    if (!entry || !query) return { matches: 0, activeMatch: 0 };

    return new Promise<FindResult>((resolve) => {
      const timeout = setTimeout(() => {
        resolve({ matches: 0, activeMatch: 0 });
      }, 5000);

      entry.view.webContents.once('found-in-page', (_event, result) => {
        clearTimeout(timeout);
        resolve({
          matches: result.matches ?? 0,
          activeMatch: result.activeMatchOrdinal ?? 0,
        });
      });
      entry.view.webContents.findInPage(query, {
        forward: opts?.forward,
        matchCase: opts?.matchCase,
      });
    });
  }

  async stopFindInPage(tabId: string): Promise<void> {
    const entry = this.entries.get(tabId);
    if (!entry) return;
    entry.view.webContents.stopFindInPage('clearSelection');
  }

  updateAllBounds(): void {
    if (!this.activeTabId) return;
    const entry = this.entries.get(this.activeTabId);
    if (entry) {
      entry.view.setBounds(this.getContentBounds());
    }
  }

  private removeViewFromWindow(view: WebContentsView): void {
    try {
      this.mainWindow.contentView.removeChildView(view);
    } catch {
      // View may not be a child — ignore
    }
  }

  private attachWebContentsListeners(tabId: string, view: WebContentsView): void {
    const wc = view.webContents;

    wc.on('did-start-loading', () => {
      this.updateTab(tabId, { isLoading: true });
    });

    wc.on('did-stop-loading', () => {
      this.updateTab(tabId, { isLoading: false });
    });

    wc.on('page-title-updated', (_event, title) => {
      this.updateTab(tabId, { title });
    });

    wc.on('page-favicon-updated', (_event, favicons) => {
      if (favicons.length > 0) {
        this.updateTab(tabId, { favicon: favicons[0] });
      }
    });

    wc.on('did-navigate', () => {
      this.updateTabNavState(tabId);
    });

    wc.on('did-navigate-in-page', () => {
      this.updateTabNavState(tabId);
    });
  }

  private updateTab(tabId: string, changes: Partial<Tab>): void {
    const entry = this.entries.get(tabId);
    if (!entry) return;
    Object.assign(entry.tab, changes);
    this.onTabUpdated.emit({ tabId, changes });
  }

  private updateTabNavState(tabId: string): void {
    const entry = this.entries.get(tabId);
    if (!entry) return;
    const wc = entry.view.webContents;
    const changes: Partial<Tab> = {
      url: wc.getURL(),
      canGoBack: wc.canGoBack(),
      canGoForward: wc.canGoForward(),
    };
    Object.assign(entry.tab, changes);
    this.onTabUpdated.emit({ tabId, changes });
  }
}
