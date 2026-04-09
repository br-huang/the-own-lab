import { BaseWindow, WebContentsView } from 'electron';
import path from 'path';

let mainWindow: BaseWindow | null = null;
let uiView: WebContentsView | null = null;

export function createMainWindow(): { window: BaseWindow; uiView: WebContentsView } {
  mainWindow = new BaseWindow({
    width: 1280,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    show: false,
  });

  uiView = new WebContentsView({
    webPreferences: {
      preload: path.join(__dirname, '..', 'kernel', 'ipc', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.contentView.addChildView(uiView);

  const updateBounds = () => {
    if (!mainWindow || !uiView) return;
    const { width, height } = mainWindow.getContentBounds();
    uiView.setBounds({ x: 0, y: 0, width, height });
  };

  updateBounds();
  mainWindow.on('resize', updateBounds);

  const htmlPath = path.join(__dirname, '..', '..', 'renderer', 'index.html');
  uiView.webContents.loadFile(htmlPath);

  // BaseWindow doesn't emit 'ready-to-show'; show once the UI HTML loads
  uiView.webContents.once('did-finish-load', () => {
    mainWindow?.show();
  });

  return { window: mainWindow, uiView };
}

export function getMainWindow(): BaseWindow | null {
  return mainWindow;
}

export function getUIView(): WebContentsView | null {
  return uiView;
}
