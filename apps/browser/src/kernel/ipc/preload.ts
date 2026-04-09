import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from './channels';

// Helper: create an invoke function for a given channel
function invoke(channel: string) {
  return (...args: unknown[]) => ipcRenderer.invoke(channel, ...args);
}

// Helper: create an event subscriber for a given channel
function onEvent(channel: string) {
  return {
    subscribe(callback: (data: unknown) => void): () => void {
      const handler = (_event: Electron.IpcRendererEvent, data: unknown) => callback(data);
      ipcRenderer.on(channel, handler);
      return () => ipcRenderer.removeListener(channel, handler);
    },
  };
}

const kernelAPI = {
  tabs: {
    getTab: invoke(IPC_CHANNELS.tabs.getTab),
    getAllTabs: invoke(IPC_CHANNELS.tabs.getAllTabs),
    getTabsByWorkspace: invoke(IPC_CHANNELS.tabs.getTabsByWorkspace),
    getActiveTab: invoke(IPC_CHANNELS.tabs.getActiveTab),
    createTab: invoke(IPC_CHANNELS.tabs.createTab),
    closeTab: invoke(IPC_CHANNELS.tabs.closeTab),
    closeTabs: invoke(IPC_CHANNELS.tabs.closeTabs),
    activateTab: invoke(IPC_CHANNELS.tabs.activateTab),
    navigateTo: invoke(IPC_CHANNELS.tabs.navigateTo),
    goBack: invoke(IPC_CHANNELS.tabs.goBack),
    goForward: invoke(IPC_CHANNELS.tabs.goForward),
    reload: invoke(IPC_CHANNELS.tabs.reload),
    stop: invoke(IPC_CHANNELS.tabs.stop),
    duplicateTab: invoke(IPC_CHANNELS.tabs.duplicateTab),
    pinTab: invoke(IPC_CHANNELS.tabs.pinTab),
    unpinTab: invoke(IPC_CHANNELS.tabs.unpinTab),
    muteTab: invoke(IPC_CHANNELS.tabs.muteTab),
    unmuteTab: invoke(IPC_CHANNELS.tabs.unmuteTab),
    moveTab: invoke(IPC_CHANNELS.tabs.moveTab),
    moveTabToWorkspace: invoke(IPC_CHANNELS.tabs.moveTabToWorkspace),
    setZoom: invoke(IPC_CHANNELS.tabs.setZoom),
    findInPage: invoke(IPC_CHANNELS.tabs.findInPage),
    stopFindInPage: invoke(IPC_CHANNELS.tabs.stopFindInPage),
    onTabCreated: onEvent(IPC_CHANNELS.tabs.onTabCreated),
    onTabClosed: onEvent(IPC_CHANNELS.tabs.onTabClosed),
    onTabUpdated: onEvent(IPC_CHANNELS.tabs.onTabUpdated),
    onTabActivated: onEvent(IPC_CHANNELS.tabs.onTabActivated),
    onTabMoved: onEvent(IPC_CHANNELS.tabs.onTabMoved),
  },
  workspaces: {
    getWorkspace: invoke(IPC_CHANNELS.workspaces.getWorkspace),
    getAllWorkspaces: invoke(IPC_CHANNELS.workspaces.getAllWorkspaces),
    getActiveWorkspace: invoke(IPC_CHANNELS.workspaces.getActiveWorkspace),
    createWorkspace: invoke(IPC_CHANNELS.workspaces.createWorkspace),
    deleteWorkspace: invoke(IPC_CHANNELS.workspaces.deleteWorkspace),
    renameWorkspace: invoke(IPC_CHANNELS.workspaces.renameWorkspace),
    updateWorkspace: invoke(IPC_CHANNELS.workspaces.updateWorkspace),
    activateWorkspace: invoke(IPC_CHANNELS.workspaces.activateWorkspace),
    reorderWorkspace: invoke(IPC_CHANNELS.workspaces.reorderWorkspace),
    onWorkspaceCreated: onEvent(IPC_CHANNELS.workspaces.onWorkspaceCreated),
    onWorkspaceDeleted: onEvent(IPC_CHANNELS.workspaces.onWorkspaceDeleted),
    onWorkspaceUpdated: onEvent(IPC_CHANNELS.workspaces.onWorkspaceUpdated),
    onWorkspaceActivated: onEvent(IPC_CHANNELS.workspaces.onWorkspaceActivated),
  },
  navigation: {
    resolveInput: invoke(IPC_CHANNELS.navigation.resolveInput),
    getSuggestions: invoke(IPC_CHANNELS.navigation.getSuggestions),
    getSecurityInfo: invoke(IPC_CHANNELS.navigation.getSecurityInfo),
  },
  window: {
    setContentBounds: invoke(IPC_CHANNELS.window.setContentBounds),
    setSidebarWidth: invoke(IPC_CHANNELS.window.setSidebarWidth),
    toggleSidebar: invoke(IPC_CHANNELS.window.toggleSidebar),
    onBoundsChanged: onEvent(IPC_CHANNELS.window.onBoundsChanged),
  },
};

contextBridge.exposeInMainWorld('kernel', kernelAPI);

// Expose a focused event listener for non-kernel IPC (e.g., menu-triggered focus)
contextBridge.exposeInMainWorld('__electronOn', (channel: string, callback: (...args: unknown[]) => void) => {
  const allowedChannels = ['kernel:focus-omnibar'];
  if (allowedChannels.includes(channel)) {
    ipcRenderer.on(channel, (_event, ...args) => callback(...args));
  }
});
