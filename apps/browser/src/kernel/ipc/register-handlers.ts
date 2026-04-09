import { ipcMain } from 'electron';
import { IPC_CHANNELS } from './channels';
import { TabManager } from '../interfaces/tab';
import { WorkspaceManager } from '../interfaces/workspace';
import { NavigationManager } from '../interfaces/navigation';
import { WindowManager } from '../interfaces/window';

export interface KernelServices {
  tabs: TabManager;
  workspaces: WorkspaceManager;
  navigation: NavigationManager;
  window: WindowManager;
}

export function registerKernelHandlers(services: KernelServices): void {
  // Tab handlers
  ipcMain.handle(IPC_CHANNELS.tabs.getTab, (_e, tabId: string) => services.tabs.getTab(tabId));
  ipcMain.handle(IPC_CHANNELS.tabs.getAllTabs, () => services.tabs.getAllTabs());
  ipcMain.handle(IPC_CHANNELS.tabs.getTabsByWorkspace, (_e, wsId: string) => services.tabs.getTabsByWorkspace(wsId));
  ipcMain.handle(IPC_CHANNELS.tabs.getActiveTab, () => services.tabs.getActiveTab());
  ipcMain.handle(IPC_CHANNELS.tabs.createTab, (_e, opts) => services.tabs.createTab(opts));
  ipcMain.handle(IPC_CHANNELS.tabs.closeTab, (_e, tabId: string) => services.tabs.closeTab(tabId));
  ipcMain.handle(IPC_CHANNELS.tabs.closeTabs, (_e, tabIds: string[]) => services.tabs.closeTabs(tabIds));
  ipcMain.handle(IPC_CHANNELS.tabs.activateTab, (_e, tabId: string) => services.tabs.activateTab(tabId));
  ipcMain.handle(IPC_CHANNELS.tabs.navigateTo, (_e, tabId: string, url: string) => services.tabs.navigateTo(tabId, url));
  ipcMain.handle(IPC_CHANNELS.tabs.goBack, (_e, tabId: string) => services.tabs.goBack(tabId));
  ipcMain.handle(IPC_CHANNELS.tabs.goForward, (_e, tabId: string) => services.tabs.goForward(tabId));
  ipcMain.handle(IPC_CHANNELS.tabs.reload, (_e, tabId: string) => services.tabs.reload(tabId));
  ipcMain.handle(IPC_CHANNELS.tabs.stop, (_e, tabId: string) => services.tabs.stop(tabId));
  ipcMain.handle(IPC_CHANNELS.tabs.duplicateTab, (_e, tabId: string) => services.tabs.duplicateTab(tabId));
  ipcMain.handle(IPC_CHANNELS.tabs.pinTab, (_e, tabId: string) => services.tabs.pinTab(tabId));
  ipcMain.handle(IPC_CHANNELS.tabs.unpinTab, (_e, tabId: string) => services.tabs.unpinTab(tabId));
  ipcMain.handle(IPC_CHANNELS.tabs.muteTab, (_e, tabId: string) => services.tabs.muteTab(tabId));
  ipcMain.handle(IPC_CHANNELS.tabs.unmuteTab, (_e, tabId: string) => services.tabs.unmuteTab(tabId));
  ipcMain.handle(IPC_CHANNELS.tabs.moveTab, (_e, tabId: string, toIndex: number) => services.tabs.moveTab(tabId, toIndex));
  ipcMain.handle(IPC_CHANNELS.tabs.moveTabToWorkspace, (_e, tabId: string, wsId: string) => services.tabs.moveTabToWorkspace(tabId, wsId));
  ipcMain.handle(IPC_CHANNELS.tabs.setZoom, (_e, tabId: string, factor: number) => services.tabs.setZoom(tabId, factor));
  ipcMain.handle(IPC_CHANNELS.tabs.findInPage, (_e, tabId: string, query: string, opts?: any) => services.tabs.findInPage(tabId, query, opts));
  ipcMain.handle(IPC_CHANNELS.tabs.stopFindInPage, (_e, tabId: string) => services.tabs.stopFindInPage(tabId));

  // Workspace handlers
  ipcMain.handle(IPC_CHANNELS.workspaces.getWorkspace, (_e, id: string) => services.workspaces.getWorkspace(id));
  ipcMain.handle(IPC_CHANNELS.workspaces.getAllWorkspaces, () => services.workspaces.getAllWorkspaces());
  ipcMain.handle(IPC_CHANNELS.workspaces.getActiveWorkspace, () => services.workspaces.getActiveWorkspace());
  ipcMain.handle(IPC_CHANNELS.workspaces.createWorkspace, (_e, opts) => services.workspaces.createWorkspace(opts));
  ipcMain.handle(IPC_CHANNELS.workspaces.deleteWorkspace, (_e, id: string) => services.workspaces.deleteWorkspace(id));
  ipcMain.handle(IPC_CHANNELS.workspaces.renameWorkspace, (_e, id: string, name: string) => services.workspaces.renameWorkspace(id, name));
  ipcMain.handle(IPC_CHANNELS.workspaces.updateWorkspace, (_e, id: string, changes) => services.workspaces.updateWorkspace(id, changes));
  ipcMain.handle(IPC_CHANNELS.workspaces.activateWorkspace, (_e, id: string) => services.workspaces.activateWorkspace(id));
  ipcMain.handle(IPC_CHANNELS.workspaces.reorderWorkspace, (_e, id: string, newOrder: number) => services.workspaces.reorderWorkspace(id, newOrder));

  // Navigation handlers
  ipcMain.handle(IPC_CHANNELS.navigation.resolveInput, (_e, input: string) => services.navigation.resolveInput(input));
  ipcMain.handle(IPC_CHANNELS.navigation.getSuggestions, (_e, query: string) => services.navigation.getSuggestions(query));
  ipcMain.handle(IPC_CHANNELS.navigation.getSecurityInfo, (_e, tabId: string) => services.navigation.getSecurityInfo(tabId));

  // Window handlers
  ipcMain.handle(IPC_CHANNELS.window.setContentBounds, (_e, tabId: string, bounds) => services.window.setContentBounds(tabId, bounds));
  ipcMain.handle(IPC_CHANNELS.window.setSidebarWidth, (_e, width: number) => services.window.setSidebarWidth(width));
  ipcMain.handle(IPC_CHANNELS.window.toggleSidebar, () => services.window.toggleSidebar());
}
