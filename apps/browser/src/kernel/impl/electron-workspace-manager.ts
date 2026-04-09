import { Workspace, WorkspaceManager } from '../interfaces/workspace';
import { KernelEventEmitter } from './kernel-event';
import { ElectronTabManager } from './electron-tab-manager';
import { DEFAULT_WORKSPACE_NAME, DEFAULT_WORKSPACE_COLOR, DEFAULT_WORKSPACE_ICON } from '../../shared/constants';
import crypto from 'crypto';

export class ElectronWorkspaceManager implements WorkspaceManager {
  private workspaces: Map<string, Workspace> = new Map();
  private activeId: string = '';

  onWorkspaceCreated = new KernelEventEmitter<Workspace>();
  onWorkspaceDeleted = new KernelEventEmitter<{ workspaceId: string }>();
  onWorkspaceUpdated = new KernelEventEmitter<{ workspaceId: string; changes: Partial<Workspace> }>();
  onWorkspaceActivated = new KernelEventEmitter<{ workspaceId: string; previousId: string }>();

  constructor(private tabManager: ElectronTabManager) {
    const defaultWs: Workspace = {
      id: crypto.randomUUID(),
      name: DEFAULT_WORKSPACE_NAME,
      color: DEFAULT_WORKSPACE_COLOR,
      icon: DEFAULT_WORKSPACE_ICON,
      tabCount: 0,
      isActive: true,
      order: 0,
    };
    this.workspaces.set(defaultWs.id, defaultWs);
    this.activeId = defaultWs.id;

    this.tabManager.onTabCreated.subscribe(() => this.refreshCounts());
    this.tabManager.onTabClosed.subscribe(() => this.refreshCounts());
    this.tabManager.onTabUpdated.subscribe(() => this.refreshCounts());
  }

  async getWorkspace(id: string): Promise<Workspace | null> {
    return this.workspaces.get(id) ?? null;
  }

  async getAllWorkspaces(): Promise<Workspace[]> {
    return Array.from(this.workspaces.values()).sort((a, b) => a.order - b.order);
  }

  async getActiveWorkspace(): Promise<Workspace> {
    return this.workspaces.get(this.activeId)!;
  }

  async createWorkspace(opts: { name: string; color?: string; icon?: string }): Promise<Workspace> {
    const ws: Workspace = {
      id: crypto.randomUUID(),
      name: opts.name,
      color: opts.color ?? '#5B7FFF',
      icon: opts.icon ?? '',
      tabCount: 0,
      isActive: false,
      order: this.workspaces.size,
    };
    this.workspaces.set(ws.id, ws);
    this.onWorkspaceCreated.emit(ws);
    return ws;
  }

  async deleteWorkspace(id: string): Promise<void> {
    if (this.workspaces.size <= 1) return;

    if (this.activeId === id) {
      const other = Array.from(this.workspaces.keys()).find(k => k !== id);
      if (other) await this.activateWorkspace(other);
    }

    const tabs = await this.tabManager.getTabsByWorkspace(id);
    for (const tab of tabs) {
      await this.tabManager.moveTabToWorkspace(tab.id, this.activeId);
    }

    this.workspaces.delete(id);
    this.onWorkspaceDeleted.emit({ workspaceId: id });
  }

  async renameWorkspace(id: string, name: string): Promise<void> {
    const ws = this.workspaces.get(id);
    if (!ws) return;
    ws.name = name;
    this.onWorkspaceUpdated.emit({ workspaceId: id, changes: { name } });
  }

  async updateWorkspace(id: string, changes: Partial<Omit<Workspace, 'id'>>): Promise<void> {
    const ws = this.workspaces.get(id);
    if (!ws) return;
    Object.assign(ws, changes);
    this.onWorkspaceUpdated.emit({ workspaceId: id, changes });
  }

  async activateWorkspace(id: string): Promise<void> {
    const prev = this.activeId;
    if (prev === id) return;

    const prevWs = this.workspaces.get(prev);
    const nextWs = this.workspaces.get(id);
    if (!nextWs) return;

    if (prevWs) prevWs.isActive = false;
    nextWs.isActive = true;
    this.activeId = id;
    this.onWorkspaceActivated.emit({ workspaceId: id, previousId: prev });
  }

  async reorderWorkspace(id: string, newOrder: number): Promise<void> {
    const ws = this.workspaces.get(id);
    if (!ws) return;
    ws.order = newOrder;
    this.onWorkspaceUpdated.emit({ workspaceId: id, changes: { order: newOrder } });
  }

  getActiveWorkspaceId(): string {
    return this.activeId;
  }

  private async refreshCounts(): Promise<void> {
    for (const [id, ws] of this.workspaces) {
      const tabs = await this.tabManager.getTabsByWorkspace(id);
      const newCount = tabs.length;
      if (ws.tabCount !== newCount) {
        ws.tabCount = newCount;
        this.onWorkspaceUpdated.emit({ workspaceId: id, changes: { tabCount: newCount } });
      }
    }
  }
}
