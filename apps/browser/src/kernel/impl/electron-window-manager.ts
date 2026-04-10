import { BaseWindow, WebContentsView } from 'electron';
import { WindowManager } from '../interfaces/window';
import { Rect } from '../interfaces/shared';
import { KernelEventEmitter } from './kernel-event';
import { DEFAULT_SIDEBAR_WIDTH } from '../../shared/constants';

export class ElectronWindowManager implements WindowManager {
  private sidebarWidth: number = DEFAULT_SIDEBAR_WIDTH;
  private sidebarVisible: boolean = true;

  onBoundsChanged = new KernelEventEmitter<{ bounds: Rect }>();

  constructor(
    private mainWindow: BaseWindow,
    private uiView: WebContentsView,
    private onContentBoundsChanged: (bounds: Electron.Rectangle) => void,
  ) {}

  async setContentBounds(_tabId: string, bounds: Rect): Promise<void> {
    this.onContentBoundsChanged({
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
    });
  }

  async setSidebarWidth(width: number): Promise<void> {
    this.sidebarWidth = width;
    this.recalculateBounds();
  }

  async toggleSidebar(): Promise<void> {
    this.sidebarVisible = !this.sidebarVisible;
    this.recalculateBounds();
  }

  async enterSplitView(
    _tabId1: string,
    _tabId2: string,
    _direction: 'horizontal' | 'vertical',
  ): Promise<void> {
    // Stub -- P1 feature
  }

  async exitSplitView(): Promise<void> {
    // Stub -- P1 feature
  }

  getContentBounds(): Electron.Rectangle {
    const windowBounds = this.mainWindow.getContentBounds();
    const sidebarW = this.sidebarVisible ? this.sidebarWidth : 0;
    const toolbarH = 40;
    return {
      x: sidebarW,
      y: toolbarH,
      width: windowBounds.width - sidebarW,
      height: windowBounds.height - toolbarH,
    };
  }

  private recalculateBounds(): void {
    const bounds = this.getContentBounds();
    this.onContentBoundsChanged(bounds);
    this.onBoundsChanged.emit({ bounds });
  }
}
