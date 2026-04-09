import { KernelEvent } from './shared';

export interface ExtensionInfo {
  id: string;
  name: string;
  version: string;
  icon: string;
  enabled: boolean;
  hasPopup: boolean;
  hasBadge: boolean;
  badgeText: string;
  badgeColor: string;
}

export interface ExtensionHost {
  getAll(): Promise<ExtensionInfo[]>;
  getExtension(id: string): Promise<ExtensionInfo | null>;
  enable(id: string): Promise<void>;
  disable(id: string): Promise<void>;
  uninstall(id: string): Promise<void>;
  openPopup(id: string, anchorRect: DOMRect): Promise<void>;
  openOptionsPage(id: string): Promise<void>;
  openChromeWebStore(): Promise<void>;
  onExtensionLoaded: KernelEvent<ExtensionInfo>;
  onExtensionUnloaded: KernelEvent<{ extensionId: string }>;
  onBadgeUpdated: KernelEvent<{ extensionId: string; text: string; color: string }>;
}
