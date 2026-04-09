import { app, Menu } from 'electron';
import { createMainWindow } from './window';
import { createAppMenu } from './menu';
import { registerKernelHandlers } from '../kernel/ipc/register-handlers';
import { ElectronTabManager } from '../kernel/impl/electron-tab-manager';
import { ElectronWorkspaceManager } from '../kernel/impl/electron-workspace-manager';
import { ElectronNavigationManager } from '../kernel/impl/electron-navigation-manager';
import { ElectronWindowManager } from '../kernel/impl/electron-window-manager';
import { IPC_CHANNELS } from '../kernel/ipc/channels';

app.whenReady().then(() => {
  const { window: mainWindow, uiView } = createMainWindow();

  // Create WindowManager first (provides getContentBounds)
  const windowManager = new ElectronWindowManager(
    mainWindow,
    uiView,
    () => tabManager.updateAllBounds(),
  );

  // Create TabManager with content bounds provider
  const tabManager = new ElectronTabManager(
    mainWindow,
    uiView,
    () => windowManager.getContentBounds(),
  );

  // Create WorkspaceManager
  const workspaceManager = new ElectronWorkspaceManager(tabManager);

  // Create NavigationManager
  const navigationManager = new ElectronNavigationManager();

  // Register IPC handlers
  registerKernelHandlers({
    tabs: tabManager,
    workspaces: workspaceManager,
    navigation: navigationManager,
    window: windowManager,
  });

  // Forward kernel events to renderer via IPC
  const send = (channel: string, data: unknown) => {
    if (!uiView.webContents.isDestroyed()) {
      uiView.webContents.send(channel, data);
    }
  };

  tabManager.onTabCreated.subscribe(data => send(IPC_CHANNELS.tabs.onTabCreated, data));
  tabManager.onTabClosed.subscribe(data => send(IPC_CHANNELS.tabs.onTabClosed, data));
  tabManager.onTabUpdated.subscribe(data => send(IPC_CHANNELS.tabs.onTabUpdated, data));
  tabManager.onTabActivated.subscribe(data => send(IPC_CHANNELS.tabs.onTabActivated, data));
  tabManager.onTabMoved.subscribe(data => send(IPC_CHANNELS.tabs.onTabMoved, data));

  workspaceManager.onWorkspaceCreated.subscribe(data => send(IPC_CHANNELS.workspaces.onWorkspaceCreated, data));
  workspaceManager.onWorkspaceDeleted.subscribe(data => send(IPC_CHANNELS.workspaces.onWorkspaceDeleted, data));
  workspaceManager.onWorkspaceUpdated.subscribe(data => send(IPC_CHANNELS.workspaces.onWorkspaceUpdated, data));
  workspaceManager.onWorkspaceActivated.subscribe(data => send(IPC_CHANNELS.workspaces.onWorkspaceActivated, data));

  windowManager.onBoundsChanged.subscribe(data => send(IPC_CHANNELS.window.onBoundsChanged, data));

  // Handle window resize -- update tab content bounds
  mainWindow.on('resize', () => {
    const contentBounds = mainWindow.getContentBounds();
    uiView.setBounds({ x: 0, y: 0, width: contentBounds.width, height: contentBounds.height });
    tabManager.updateAllBounds();
  });

  // Create macOS app menu
  const menu = createAppMenu({
    onNewTab: () => {
      const wsId = workspaceManager.getActiveWorkspaceId();
      tabManager.createTab({ active: true, workspaceId: wsId });
    },
    onCloseTab: async () => {
      const active = await tabManager.getActiveTab();
      if (active) tabManager.closeTab(active.id);
    },
    onReload: async () => {
      const active = await tabManager.getActiveTab();
      if (active) tabManager.reload(active.id);
    },
    onFocusOmnibar: () => {
      uiView.webContents.send('kernel:focus-omnibar');
    },
  });
  Menu.setApplicationMenu(menu);

  // Create initial tab in default workspace
  const defaultWsId = workspaceManager.getActiveWorkspaceId();
  tabManager.createTab({ active: true, workspaceId: defaultWsId });
});

app.on('window-all-closed', () => {
  app.quit();
});
