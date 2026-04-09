# Implementation Plan: Better Browser MVP — Week 1-2 Foundation

This plan covers the foundational infrastructure: project setup, UI Kernel interfaces, IPC bridge, Electron main process, core Web Components, TabManager, WorkspaceManager, basic navigation, keyboard shortcuts, and wiring everything together into a working vertical-sidebar browser.

**Total steps: 30**
**Estimated time: 90-150 minutes**

---

## Prerequisites

- Node.js 20+ installed
- npm 10+ installed
- macOS 13+ (development machine)
- A code editor with TypeScript support

---

## Phase 1: Project Initialization

### Step 1: Initialize npm project and install dependencies

- **Files**: `/Users/rong/Workspaces/1-Projects/12-Sandbox-Labs/122-Better-Browser/package.json`
- **Action**: Run `npm init -y` in the project root, then install all dependencies.
- **Details**:
  ```bash
  cd /Users/rong/Workspaces/1-Projects/12-Sandbox-Labs/122-Better-Browser
  npm init -y
  npm install electron@34 lit@3
  npm install -D typescript@5 vite@6 @electron/rebuild electron-builder vitest @open-wc/testing
  ```
  After install, edit `package.json` to set:
  - `"name": "better-browser"`
  - `"version": "0.1.0"`
  - `"main": "dist/main/index.js"` (Electron entry point)
  - `"type": "module"`
  - Add scripts:
    ```json
    "scripts": {
      "dev": "concurrently \"vite build -w\" \"tsc -p tsconfig.main.json -w\" \"electron .\"",
      "dev:renderer": "vite build -w",
      "dev:main": "tsc -p tsconfig.main.json -w",
      "dev:electron": "electron .",
      "build": "vite build && tsc -p tsconfig.main.json",
      "package": "npm run build && electron-builder --mac",
      "test": "vitest run",
      "lint": "tsc --noEmit",
      "typecheck": "tsc --noEmit"
    }
    ```
  Also install: `npm install -D concurrently`
- **Do NOT**: Add any application source code yet. This step is only project scaffolding.
- **Verify**: `cat package.json` shows correct name, main, scripts. `ls node_modules/electron` exists. `ls node_modules/lit` exists.
- **Dependencies**: None.

---

### Step 2: Create TypeScript configuration files

- **Files**:
  - `tsconfig.json` (shared base)
  - `tsconfig.main.json` (main process)
  - `tsconfig.renderer.json` (renderer process)
- **Action**: Create three tsconfig files.

**`tsconfig.json`** (shared base config):
```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "useDefineForClassFields": false,
    "experimentalDecorators": true,
    "declaration": true,
    "sourceMap": true,
    "baseUrl": ".",
    "paths": {
      "@kernel/*": ["src/kernel/*"],
      "@ui/*": ["src/ui/*"],
      "@shared/*": ["src/shared/*"]
    }
  },
  "exclude": ["node_modules", "dist"]
}
```

**`tsconfig.main.json`** (main process — Node target):
```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "module": "CommonJS",
    "moduleResolution": "node",
    "target": "ES2022",
    "outDir": "dist/main",
    "declaration": false
  },
  "include": ["src/main/**/*", "src/kernel/**/*", "src/shared/**/*"]
}
```

**`tsconfig.renderer.json`** (renderer — browser target):
```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "target": "ESNext",
    "lib": ["ESNext", "DOM", "DOM.Iterable"],
    "outDir": "dist/renderer"
  },
  "include": ["src/ui/**/*", "src/shared/**/*", "src/kernel/interfaces/**/*"]
}
```

- **Do NOT**: Set `useDefineForClassFields: true` — Lit decorators require it to be `false` (or omitted with `experimentalDecorators: true`).
- **Verify**: Run `npx tsc --project tsconfig.main.json --noEmit` — should succeed with no errors (and no files to compile yet). Same for `tsconfig.renderer.json`.
- **Dependencies**: Step 1.

---

### Step 3: Create Vite configuration for renderer bundling

- **Files**: `vite.config.ts`
- **Action**: Create Vite config that builds the renderer (UI) code.
- **Details**:
  ```typescript
  import { defineConfig } from 'vite';
  import { resolve } from 'path';

  export default defineConfig({
    root: resolve(__dirname, 'src/ui'),
    base: './',
    build: {
      outDir: resolve(__dirname, 'dist/renderer'),
      emptyOutDir: true,
      rollupOptions: {
        input: resolve(__dirname, 'src/ui/index.html'),
      },
    },
    resolve: {
      alias: {
        '@kernel': resolve(__dirname, 'src/kernel'),
        '@ui': resolve(__dirname, 'src/ui'),
        '@shared': resolve(__dirname, 'src/shared'),
      },
    },
  });
  ```
- **Do NOT**: Add any Electron-specific Vite plugins. The renderer is pure browser code — no Node.js access.
- **Verify**: `npx vite build` should succeed (will warn about missing input file — that is expected, we create it in a later step).
- **Dependencies**: Steps 1, 2.

---

### Step 4: Create electron-builder configuration

- **Files**: `electron-builder.yml`
- **Action**: Create minimal macOS build config.
- **Details**:
  ```yaml
  appId: com.betterbrowser.app
  productName: Better Browser
  directories:
    output: release
    buildResources: resources
  files:
    - dist/**/*
    - package.json
  mac:
    category: public.app-category.productivity
    target:
      - target: dmg
        arch:
          - arm64
          - x64
    darkModeSupport: true
  dmg:
    title: Better Browser
  ```
- **Do NOT**: Add Windows or Linux targets.
- **Verify**: File exists and is valid YAML.
- **Dependencies**: Step 1.

---

### Step 5: Create directory structure and placeholder files

- **Files**: Create the full directory tree from DESIGN.md.
- **Action**: Run mkdir commands to create all directories:
  ```bash
  mkdir -p src/kernel/interfaces
  mkdir -p src/kernel/impl
  mkdir -p src/kernel/ipc
  mkdir -p src/ui/components/app
  mkdir -p src/ui/components/sidebar
  mkdir -p src/ui/components/toolbar
  mkdir -p src/ui/components/extensions
  mkdir -p src/ui/components/content
  mkdir -p src/ui/components/overlays
  mkdir -p src/ui/components/shared
  mkdir -p src/ui/styles
  mkdir -p src/ui/lib
  mkdir -p src/main
  mkdir -p src/shared
  mkdir -p tests/kernel
  mkdir -p tests/ui
  mkdir -p tests/e2e
  mkdir -p resources/icons
  ```
  Also create `src/shared/constants.ts`:
  ```typescript
  export const DEFAULT_URL = 'https://www.google.com';
  export const DEFAULT_SEARCH_ENGINE = 'https://www.google.com/search?q=';
  export const APP_NAME = 'Better Browser';
  export const DEFAULT_SIDEBAR_WIDTH = 260;
  export const MIN_SIDEBAR_WIDTH = 48;
  export const MAX_SIDEBAR_WIDTH = 480;
  export const DEFAULT_WORKSPACE_NAME = 'Personal';
  export const DEFAULT_WORKSPACE_COLOR = '#5B7FFF';
  export const DEFAULT_WORKSPACE_ICON = '🏠';
  ```
- **Do NOT**: Create any component files yet.
- **Verify**: `find src -type d | sort` shows the full directory tree. `cat src/shared/constants.ts` shows constants.
- **Dependencies**: Step 1.

---

## Phase 2: UI Kernel Interface Definitions

### Step 6: Create shared kernel types

- **Files**: `src/kernel/interfaces/shared.ts`
- **Action**: Define all shared types used across kernel interfaces.
- **Signature**:
  ```typescript
  export interface KernelEvent<T> {
    subscribe(callback: (data: T) => void): () => void;
  }

  export interface Rect {
    x: number; y: number; width: number; height: number;
  }

  export interface FindOpts {
    forward?: boolean;
    matchCase?: boolean;
  }

  export interface FindResult {
    matches: number;
    activeMatch: number;
  }

  export interface Suggestion {
    type: 'history' | 'bookmark' | 'tab' | 'search';
    title: string;
    url: string;
    relevance: number;
  }

  export interface SecurityInfo {
    protocol: 'https' | 'http' | 'file' | 'other';
    certificate?: { issuer: string; validTo: Date };
    isSecure: boolean;
  }
  ```
- **Details**: Copy exactly from DESIGN.md section "Interface Definitions" — the `shared.ts` types.
- **Do NOT**: Add implementation logic. These are pure type definitions.
- **Verify**: `npx tsc --project tsconfig.main.json --noEmit` passes.
- **Dependencies**: Step 5.

---

### Step 7: Create Tab and TabManager interfaces

- **Files**: `src/kernel/interfaces/tab.ts`
- **Action**: Define the `Tab` data type and `TabManager` interface.
- **Signature**: Copy the full `Tab` interface and `TabManager` interface from DESIGN.md exactly. Import `KernelEvent`, `FindOpts`, `FindResult` from `./shared`.
- **Details**:
  ```typescript
  import { KernelEvent, FindOpts, FindResult } from './shared';

  export interface Tab {
    id: string;
    url: string;
    title: string;
    favicon: string;
    workspaceId: string;
    isPinned: boolean;
    isMuted: boolean;
    isLoading: boolean;
    isActive: boolean;
    canGoBack: boolean;
    canGoForward: boolean;
    zoomFactor: number;
    audioPlaying: boolean;
  }

  export interface TabManager {
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
    findInPage(tabId: string, query: string, opts?: FindOpts): Promise<FindResult>;
    stopFindInPage(tabId: string): Promise<void>;
    onTabCreated: KernelEvent<Tab>;
    onTabClosed: KernelEvent<{ tabId: string }>;
    onTabUpdated: KernelEvent<{ tabId: string; changes: Partial<Tab> }>;
    onTabActivated: KernelEvent<{ tabId: string; previousTabId: string | null }>;
    onTabMoved: KernelEvent<{ tabId: string; fromIndex: number; toIndex: number }>;
  }
  ```
- **Do NOT**: Add any implementation. Pure interfaces only.
- **Verify**: `npx tsc --project tsconfig.main.json --noEmit` passes.
- **Dependencies**: Step 6.

---

### Step 8: Create Workspace and WorkspaceManager interfaces

- **Files**: `src/kernel/interfaces/workspace.ts`
- **Action**: Define `Workspace` and `WorkspaceManager` exactly from DESIGN.md.
- **Signature**:
  ```typescript
  import { KernelEvent } from './shared';

  export interface Workspace {
    id: string;
    name: string;
    color: string;
    icon: string;
    tabCount: number;
    isActive: boolean;
    order: number;
  }

  export interface WorkspaceManager {
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
  }
  ```
- **Do NOT**: Implement anything.
- **Verify**: TypeScript compiles clean.
- **Dependencies**: Step 6.

---

### Step 9: Create remaining kernel interfaces (session, extension, window, navigation)

- **Files**:
  - `src/kernel/interfaces/session.ts`
  - `src/kernel/interfaces/extension.ts`
  - `src/kernel/interfaces/window.ts`
  - `src/kernel/interfaces/navigation.ts`
- **Action**: Create all four files. Copy interfaces exactly from DESIGN.md.
- **Details**: Each file imports from `./shared` as needed. The `session.ts` file imports `Tab` from `./tab` and `Workspace` from `./workspace`. Write all four files in one step since they are small and independent.
- **Do NOT**: Add implementation code.
- **Verify**: TypeScript compiles clean.
- **Dependencies**: Steps 6, 7, 8.

---

### Step 10: Create kernel interfaces barrel export

- **Files**: `src/kernel/interfaces/index.ts`
- **Action**: Re-export everything from all interface files.
- **Signature**:
  ```typescript
  export * from './shared';
  export * from './tab';
  export * from './workspace';
  export * from './session';
  export * from './extension';
  export * from './window';
  export * from './navigation';
  ```
- **Verify**: `import { Tab, Workspace, SessionManager } from './kernel/interfaces'` resolves all types.
- **Dependencies**: Steps 6-9.

---

## Phase 3: IPC Bridge Infrastructure

### Step 11: Define IPC channel constants

- **Files**: `src/kernel/ipc/channels.ts`
- **Action**: Define all IPC channel name constants. These map kernel interface methods to IPC channel strings.
- **Details**: Create a nested constant object:
  ```typescript
  export const IPC_CHANNELS = {
    tabs: {
      getTab: 'kernel:tabs:getTab',
      getAllTabs: 'kernel:tabs:getAllTabs',
      getTabsByWorkspace: 'kernel:tabs:getTabsByWorkspace',
      getActiveTab: 'kernel:tabs:getActiveTab',
      createTab: 'kernel:tabs:createTab',
      closeTab: 'kernel:tabs:closeTab',
      closeTabs: 'kernel:tabs:closeTabs',
      activateTab: 'kernel:tabs:activateTab',
      navigateTo: 'kernel:tabs:navigateTo',
      goBack: 'kernel:tabs:goBack',
      goForward: 'kernel:tabs:goForward',
      reload: 'kernel:tabs:reload',
      stop: 'kernel:tabs:stop',
      duplicateTab: 'kernel:tabs:duplicateTab',
      pinTab: 'kernel:tabs:pinTab',
      unpinTab: 'kernel:tabs:unpinTab',
      muteTab: 'kernel:tabs:muteTab',
      unmuteTab: 'kernel:tabs:unmuteTab',
      moveTab: 'kernel:tabs:moveTab',
      moveTabToWorkspace: 'kernel:tabs:moveTabToWorkspace',
      setZoom: 'kernel:tabs:setZoom',
      findInPage: 'kernel:tabs:findInPage',
      stopFindInPage: 'kernel:tabs:stopFindInPage',
      // Events (main → renderer)
      onTabCreated: 'kernel:tabs:onTabCreated',
      onTabClosed: 'kernel:tabs:onTabClosed',
      onTabUpdated: 'kernel:tabs:onTabUpdated',
      onTabActivated: 'kernel:tabs:onTabActivated',
      onTabMoved: 'kernel:tabs:onTabMoved',
    },
    workspaces: {
      getWorkspace: 'kernel:workspaces:getWorkspace',
      getAllWorkspaces: 'kernel:workspaces:getAllWorkspaces',
      getActiveWorkspace: 'kernel:workspaces:getActiveWorkspace',
      createWorkspace: 'kernel:workspaces:createWorkspace',
      deleteWorkspace: 'kernel:workspaces:deleteWorkspace',
      renameWorkspace: 'kernel:workspaces:renameWorkspace',
      updateWorkspace: 'kernel:workspaces:updateWorkspace',
      activateWorkspace: 'kernel:workspaces:activateWorkspace',
      reorderWorkspace: 'kernel:workspaces:reorderWorkspace',
      onWorkspaceCreated: 'kernel:workspaces:onWorkspaceCreated',
      onWorkspaceDeleted: 'kernel:workspaces:onWorkspaceDeleted',
      onWorkspaceUpdated: 'kernel:workspaces:onWorkspaceUpdated',
      onWorkspaceActivated: 'kernel:workspaces:onWorkspaceActivated',
    },
    navigation: {
      resolveInput: 'kernel:navigation:resolveInput',
      getSuggestions: 'kernel:navigation:getSuggestions',
      getSecurityInfo: 'kernel:navigation:getSecurityInfo',
    },
    window: {
      setContentBounds: 'kernel:window:setContentBounds',
      setSidebarWidth: 'kernel:window:setSidebarWidth',
      toggleSidebar: 'kernel:window:toggleSidebar',
      onBoundsChanged: 'kernel:window:onBoundsChanged',
    },
  } as const;
  ```
- **Do NOT**: Include session or extension channels yet — those are not needed for Week 1-2 foundation.
- **Verify**: File compiles. All channel strings follow the pattern `kernel:<domain>:<method>`.
- **Dependencies**: Step 5.

---

### Step 12: Create the preload script (contextBridge)

- **Files**: `src/kernel/ipc/preload.ts`
- **Action**: Create the preload script that exposes a typed `window.kernel` API to the renderer via `contextBridge`.
- **Details**: The preload script uses `contextBridge.exposeInMainWorld` to create a `kernel` object. Each method calls `ipcRenderer.invoke(channel, ...args)`. Each event uses `ipcRenderer.on(channel, callback)`.
- **Signature**:
  ```typescript
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
  ```
- **Do NOT**: Expose `ipcRenderer` directly. Do NOT expose `require` or any Node.js APIs. The `kernel` object is the ONLY thing exposed.
- **Verify**: File compiles with `tsc --project tsconfig.main.json --noEmit`.
- **Dependencies**: Step 11.

---

### Step 13: Create the IPC handler registration (main process side)

- **Files**: `src/kernel/ipc/register-handlers.ts`
- **Action**: Create a function that registers `ipcMain.handle` for every channel, delegating to the kernel implementations.
- **Signature**:
  ```typescript
  import { ipcMain, WebContents } from 'electron';
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
  ```
- **Details**: The function takes a `KernelServices` object and registers every channel. This is called once at app startup.
- **Do NOT**: Import or reference kernel implementations directly — only the interfaces. The wiring happens in `src/main/index.ts`.
- **Verify**: File compiles. All channels from Step 11 have a corresponding handler registration.
- **Dependencies**: Steps 10, 11.

---

### Step 14: Create kernel-client type declaration for the renderer

- **Files**: `src/ui/lib/kernel-client.ts`
- **Action**: Create a typed wrapper that provides TypeScript types for the `window.kernel` global. This is what all UI components import.
- **Signature**:
  ```typescript
  import type { Tab, TabManager, WorkspaceManager, NavigationManager, WindowManager, KernelEvent } from '@kernel/interfaces';

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
      getWorkspace(id: string): Promise<import('@kernel/interfaces').Workspace | null>;
      getAllWorkspaces(): Promise<import('@kernel/interfaces').Workspace[]>;
      getActiveWorkspace(): Promise<import('@kernel/interfaces').Workspace>;
      createWorkspace(opts: { name: string; color?: string; icon?: string }): Promise<import('@kernel/interfaces').Workspace>;
      deleteWorkspace(id: string): Promise<void>;
      renameWorkspace(id: string, name: string): Promise<void>;
      updateWorkspace(id: string, changes: Partial<Omit<import('@kernel/interfaces').Workspace, 'id'>>): Promise<void>;
      activateWorkspace(id: string): Promise<void>;
      reorderWorkspace(id: string, newOrder: number): Promise<void>;
      onWorkspaceCreated: KernelEvent<import('@kernel/interfaces').Workspace>;
      onWorkspaceDeleted: KernelEvent<{ workspaceId: string }>;
      onWorkspaceUpdated: KernelEvent<{ workspaceId: string; changes: Partial<import('@kernel/interfaces').Workspace> }>;
      onWorkspaceActivated: KernelEvent<{ workspaceId: string; previousId: string }>;
    };
    navigation: {
      resolveInput(input: string): Promise<{ type: 'url' | 'search'; resolved: string }>;
      getSuggestions(query: string): Promise<import('@kernel/interfaces').Suggestion[]>;
      getSecurityInfo(tabId: string): Promise<import('@kernel/interfaces').SecurityInfo>;
    };
    window: {
      setContentBounds(tabId: string, bounds: import('@kernel/interfaces').Rect): Promise<void>;
      setSidebarWidth(width: number): Promise<void>;
      toggleSidebar(): Promise<void>;
      onBoundsChanged: KernelEvent<{ bounds: import('@kernel/interfaces').Rect }>;
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
  ```
- **Do NOT**: Import Electron modules. This is renderer-only code.
- **Verify**: File compiles with `tsconfig.renderer.json`.
- **Dependencies**: Steps 10, 12.

---

## Phase 4: Electron Main Process

### Step 15: Create the window management module

- **Files**: `src/main/window.ts`
- **Action**: Create functions to set up the main `BaseWindow` with a UI `WebContentsView` (for the sidebar/toolbar) and manage tab `WebContentsView` instances.
- **Signature**:
  ```typescript
  import { BaseWindow, WebContentsView } from 'electron';
  import path from 'path';

  let mainWindow: BaseWindow | null = null;
  let uiView: WebContentsView | null = null;

  export function createMainWindow(): { window: BaseWindow; uiView: WebContentsView } {
    // Create a BaseWindow (no built-in webContents)
    // Size: 1280x900, minWidth: 800, minHeight: 600
    // titleBarStyle: 'hiddenInset' for macOS traffic lights
    // Create a WebContentsView for the UI (sidebar + toolbar)
    //   - preload: path to compiled preload.js
    //   - Load the renderer index.html from dist/renderer/index.html
    // Add the UI view as a child of the window's contentView
    // Set UI view bounds to fill the window
    // Listen to window 'resize' event to recalculate bounds
    // Return both the window and uiView
  }

  export function getMainWindow(): BaseWindow | null { return mainWindow; }
  export function getUIView(): WebContentsView | null { return uiView; }
  ```
- **Details**:
  - Use `BaseWindow` (NOT `BrowserWindow`) because we need multiple `WebContentsView` children.
  - The UI view fills the entire window initially. Tab views will be positioned on top of the right portion (content area) by the TabManager.
  - The preload script path should resolve to `dist/main/kernel/ipc/preload.js` (compiled output).
  - The HTML path should resolve to `dist/renderer/index.html`.
  - Set `webPreferences.contextIsolation: true` and `webPreferences.nodeIntegration: false` on the UI view.
- **Do NOT**: Create tab WebContentsViews here — that is the TabManager's responsibility (Step 20).
- **Verify**: File compiles with `tsconfig.main.json`.
- **Dependencies**: Step 12.

---

### Step 16: Create the macOS menu bar

- **Files**: `src/main/menu.ts`
- **Action**: Create the native macOS application menu.
- **Signature**:
  ```typescript
  import { Menu, MenuItemConstructorOptions } from 'electron';

  export function createAppMenu(handlers: {
    onNewTab: () => void;
    onCloseTab: () => void;
    onReload: () => void;
    onFocusOmnibar: () => void;
  }): Menu {
    // Build a standard macOS menu template with:
    // - App menu (About, Quit)
    // - File menu (New Tab: Cmd+T, Close Tab: Cmd+W)
    // - Edit menu (standard Undo/Redo/Cut/Copy/Paste/SelectAll)
    // - View menu (Reload: Cmd+R, Toggle DevTools: Cmd+Alt+I, Zoom In/Out)
    // - Window menu (Minimize, Zoom)
    // Return Menu.buildFromTemplate(template)
  }
  ```
- **Details**: The handlers are callbacks that will be connected to kernel services. Do not implement the handlers — just wire the menu accelerators to call the provided callback functions.
- **Do NOT**: Handle keyboard shortcuts in the menu that we will handle in the renderer (like Cmd+L for omnibar focus). Only include shortcuts that must work even when the renderer is not focused.
- **Verify**: File compiles.
- **Dependencies**: Step 5.

---

### Step 17: Create the Electron main entry point

- **Files**: `src/main/index.ts`
- **Action**: Create the app entry point that boots Electron, creates the window, instantiates kernel services, and registers IPC handlers.
- **Signature**:
  ```typescript
  import { app, Menu } from 'electron';
  import { createMainWindow } from './window';
  import { createAppMenu } from './menu';
  import { registerKernelHandlers } from '../kernel/ipc/register-handlers';
  // Import kernel implementations (stubs for now)
  // import { ElectronTabManager } from '../kernel/impl/electron-tab-manager';
  // import { ElectronWorkspaceManager } from '../kernel/impl/electron-workspace-manager';
  // import { ElectronNavigationManager } from '../kernel/impl/electron-navigation-manager';
  // import { ElectronWindowManager } from '../kernel/impl/electron-window-manager';

  app.whenReady().then(() => {
    const { window, uiView } = createMainWindow();

    // TODO: Instantiate kernel services (Step 20-22 will create these)
    // const tabManager = new ElectronTabManager(window, uiView);
    // const workspaceManager = new ElectronWorkspaceManager(tabManager);
    // const navigationManager = new ElectronNavigationManager();
    // const windowManager = new ElectronWindowManager(window, uiView);

    // TODO: registerKernelHandlers({ tabs: tabManager, workspaces: workspaceManager, ... });

    // Create and set the app menu
    // const menu = createAppMenu({ onNewTab, onCloseTab, onReload, onFocusOmnibar });
    // Menu.setApplicationMenu(menu);
  });

  app.on('window-all-closed', () => {
    app.quit();
  });
  ```
- **Details**: For now, leave the kernel service instantiation as TODO comments. The important thing is that the window opens and the UI HTML loads. Steps 20-22 will create the actual implementations, and Step 28 will wire everything together.
- **Do NOT**: Import kernel implementations that do not exist yet. Use comments as placeholders.
- **Verify**: After `npm run build`, running `npx electron .` should open a window (with empty/broken UI — that is expected at this stage).
- **Dependencies**: Steps 13, 15, 16.

---

## Phase 5: Design Tokens and Base Styles

### Step 18: Create CSS design tokens and base styles

- **Files**:
  - `src/ui/styles/tokens.css`
  - `src/ui/styles/reset.css`
  - `src/ui/styles/animations.css`
- **Action**: Create the shared design system.

**`tokens.css`** — CSS custom properties:
```css
:root {
  /* Colors — dark theme (primary) */
  --bb-bg-primary: #1a1a2e;
  --bb-bg-secondary: #16213e;
  --bb-bg-tertiary: #0f3460;
  --bb-bg-hover: rgba(255, 255, 255, 0.06);
  --bb-bg-active: rgba(255, 255, 255, 0.10);
  --bb-text-primary: #e0e0e0;
  --bb-text-secondary: #a0a0b0;
  --bb-text-muted: #606070;
  --bb-accent: #5B7FFF;
  --bb-accent-hover: #7B9FFF;
  --bb-danger: #ff5555;
  --bb-border: rgba(255, 255, 255, 0.08);

  /* Spacing */
  --bb-space-xs: 4px;
  --bb-space-sm: 8px;
  --bb-space-md: 12px;
  --bb-space-lg: 16px;
  --bb-space-xl: 24px;

  /* Typography */
  --bb-font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --bb-font-size-xs: 11px;
  --bb-font-size-sm: 12px;
  --bb-font-size-md: 13px;
  --bb-font-size-lg: 15px;

  /* Radii */
  --bb-radius-sm: 4px;
  --bb-radius-md: 8px;
  --bb-radius-lg: 12px;

  /* Sidebar */
  --bb-sidebar-width: 260px;

  /* Transitions */
  --bb-transition-fast: 120ms ease;
  --bb-transition-normal: 200ms ease;
}
```

**`reset.css`** — Minimal reset:
```css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body { height: 100%; overflow: hidden; font-family: var(--bb-font-family); font-size: var(--bb-font-size-md); color: var(--bb-text-primary); background: var(--bb-bg-primary); -webkit-font-smoothing: antialiased; }
```

**`animations.css`**:
```css
@keyframes bb-fade-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes bb-slide-in-left { from { transform: translateX(-8px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
```

- **Do NOT**: Add light mode tokens yet (dark-only for MVP).
- **Verify**: Files exist and contain valid CSS.
- **Dependencies**: Step 5.

---

### Step 19: Create renderer HTML and entry point

- **Files**:
  - `src/ui/index.html`
  - `src/ui/main.ts`
- **Action**: Create the root HTML file that Electron loads, and the TypeScript entry point that imports and registers all Web Components.

**`index.html`**:
```html
<\!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';">
  <title>Better Browser</title>
  <link rel="stylesheet" href="./styles/reset.css">
  <link rel="stylesheet" href="./styles/tokens.css">
  <link rel="stylesheet" href="./styles/animations.css">
</head>
<body>
  <bb-app></bb-app>
  <script type="module" src="./main.ts"></script>
</body>
</html>
```

**`main.ts`**:
```typescript
// Import all components — this registers them as custom elements
import './components/app/bb-app';
import './components/sidebar/bb-sidebar';
import './components/sidebar/bb-tab-list';
import './components/sidebar/bb-tab-item';
import './components/sidebar/bb-workspace-switcher';
import './components/sidebar/bb-workspace-chip';
import './components/sidebar/bb-new-tab-button';
import './components/toolbar/bb-toolbar';
import './components/toolbar/bb-omnibar';
import './components/toolbar/bb-navigation-buttons';
import './components/content/bb-content-area';

// Import keyboard shortcut handler
import './lib/keybindings';

console.log('Better Browser UI initialized');
```

- **Do NOT**: Import components that have not been created yet. For now, comment out imports that do not yet exist. Uncomment them as you create each component.
- **Verify**: `npx vite build` succeeds (or warns about missing imports — that is fine for now).
- **Dependencies**: Step 18.

---

## Phase 6: Core Web Components

### Step 20: Create bb-app root component

- **Files**: `src/ui/components/app/bb-app.ts`
- **Action**: Create the root layout component that arranges sidebar, toolbar, and content area.
- **Signature**:
  ```typescript
  import { LitElement, html, css } from 'lit';
  import { customElement, state } from 'lit/decorators.js';
  import type { Tab, Workspace } from '@kernel/interfaces';

  @customElement('bb-app')
  export class BbApp extends LitElement {
    @state() private tabs: Tab[] = [];
    @state() private workspaces: Workspace[] = [];
    @state() private activeWorkspaceId: string = '';
    @state() private activeTabId: string | null = null;
    @state() private sidebarWidth: number = 260;

    // In connectedCallback:
    //   - Subscribe to kernel events: onTabCreated, onTabClosed, onTabUpdated, onTabActivated
    //   - Subscribe to workspace events: onWorkspaceCreated, onWorkspaceActivated, etc.
    //   - Fetch initial state: kernel.tabs.getAllTabs(), kernel.workspaces.getAllWorkspaces()

    // In disconnectedCallback:
    //   - Unsubscribe from all events

    // render(): Layout is a horizontal flexbox:
    //   [bb-sidebar (fixed width)] [right panel (flex:1)]
    //   Right panel is vertical flexbox:
    //     [bb-toolbar (fixed height ~40px)]
    //     [bb-content-area (flex:1)]

    static styles = css`
      :host {
        display: flex;
        height: 100vh;
        width: 100vw;
        overflow: hidden;
        background: var(--bb-bg-primary);
      }
      .right-panel {
        display: flex;
        flex-direction: column;
        flex: 1;
        min-width: 0;
      }
    `;

    render() {
      return html`
        <bb-sidebar
          .tabs=${this.tabs.filter(t => t.workspaceId === this.activeWorkspaceId)}
          .workspaces=${this.workspaces}
          .activeWorkspaceId=${this.activeWorkspaceId}
          .activeTabId=${this.activeTabId}
          style="width: ${this.sidebarWidth}px"
        ></bb-sidebar>
        <div class="right-panel">
          <bb-toolbar
            .activeTab=${this.tabs.find(t => t.id === this.activeTabId) ?? null}
          ></bb-toolbar>
          <bb-content-area></bb-content-area>
        </div>
      `;
    }
  }
  ```
- **Details**: The `bb-app` component is the top-level state holder in the renderer. It fetches state from the kernel, subscribes to events, and passes data down to children via properties. Children dispatch commands directly to `window.kernel`.
- **Do NOT**: Put tab management logic here. All mutations go through `window.kernel`. This component only holds reactive UI state.
- **Verify**: Component class compiles. Custom element is registered as `bb-app`.
- **Dependencies**: Steps 14, 18, 19.

---

### Step 21: Create bb-sidebar component

- **Files**: `src/ui/components/sidebar/bb-sidebar.ts`
- **Action**: Create the sidebar container that holds the workspace switcher, tab list, and new-tab button.
- **Signature**:
  ```typescript
  import { LitElement, html, css } from 'lit';
  import { customElement, property } from 'lit/decorators.js';
  import type { Tab, Workspace } from '@kernel/interfaces';

  @customElement('bb-sidebar')
  export class BbSidebar extends LitElement {
    @property({ type: Array }) tabs: Tab[] = [];
    @property({ type: Array }) workspaces: Workspace[] = [];
    @property({ type: String }) activeWorkspaceId: string = '';
    @property({ type: String }) activeTabId: string | null = null;

    static styles = css`
      :host {
        display: flex;
        flex-direction: column;
        background: var(--bb-bg-secondary);
        border-right: 1px solid var(--bb-border);
        height: 100%;
        overflow: hidden;
        /* macOS traffic light spacing */
        padding-top: 38px;
      }
      .tab-list-container { flex: 1; overflow-y: auto; overflow-x: hidden; }
    `;

    render() {
      // Layout:
      // <bb-workspace-switcher .workspaces .activeWorkspaceId />
      // <div class="tab-list-container">
      //   <bb-tab-list .tabs .activeTabId />
      // </div>
      // <bb-new-tab-button />
    }
  }
  ```
- **Details**: The sidebar is a flex column. Workspace switcher at top, scrollable tab list in the middle, new-tab button at bottom. It receives all data via properties from `bb-app`. The `padding-top: 38px` leaves room for macOS traffic light buttons when `titleBarStyle: 'hiddenInset'` is used.
- **Do NOT**: Fetch data from the kernel. Sidebar receives data from its parent (`bb-app`).
- **Verify**: Component compiles and renders its children.
- **Dependencies**: Step 20.

---

### Step 22: Create bb-tab-item component

- **Files**: `src/ui/components/sidebar/bb-tab-item.ts`
- **Action**: Create the individual tab entry shown in the sidebar.
- **Signature**:
  ```typescript
  import { LitElement, html, css } from 'lit';
  import { customElement, property } from 'lit/decorators.js';
  import type { Tab } from '@kernel/interfaces';

  @customElement('bb-tab-item')
  export class BbTabItem extends LitElement {
    @property({ type: Object }) tab\!: Tab;
    @property({ type: Boolean, reflect: true }) active: boolean = false;

    static styles = css`
      :host {
        display: flex;
        align-items: center;
        gap: var(--bb-space-sm);
        padding: var(--bb-space-sm) var(--bb-space-md);
        cursor: pointer;
        border-radius: var(--bb-radius-sm);
        margin: 0 var(--bb-space-xs);
        transition: background var(--bb-transition-fast);
        user-select: none;
      }
      :host(:hover) { background: var(--bb-bg-hover); }
      :host([active]) { background: var(--bb-bg-active); }
      .favicon { width: 16px; height: 16px; border-radius: 2px; flex-shrink: 0; }
      .title {
        flex: 1; min-width: 0;
        overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        font-size: var(--bb-font-size-sm);
        color: var(--bb-text-primary);
      }
      .close-btn {
        opacity: 0; width: 16px; height: 16px; border: none;
        background: none; color: var(--bb-text-muted); cursor: pointer;
        border-radius: var(--bb-radius-sm); display: flex;
        align-items: center; justify-content: center; flex-shrink: 0;
        font-size: 14px;
      }
      :host(:hover) .close-btn { opacity: 1; }
      .close-btn:hover { background: var(--bb-danger); color: white; }
    `;

    private _onActivate() {
      window.kernel.tabs.activateTab(this.tab.id);
    }

    private _onClose(e: Event) {
      e.stopPropagation();
      window.kernel.tabs.closeTab(this.tab.id);
    }

    render() {
      return html`
        <img class="favicon" src=${this.tab.favicon || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>'} alt="" @error=${(e: Event) => (e.target as HTMLImageElement).style.visibility = 'hidden'} />
        <span class="title">${this.tab.title || this.tab.url || 'New Tab'}</span>
        <button class="close-btn" @click=${this._onClose} title="Close tab">×</button>
      `;
    }

    connectedCallback() {
      super.connectedCallback();
      this.addEventListener('click', this._onActivate);
    }

    disconnectedCallback() {
      super.disconnectedCallback();
      this.removeEventListener('click', this._onActivate);
    }
  }
  ```
- **Details**: This is the most-rendered component. It must be lightweight. Uses CSS `text-overflow: ellipsis` for title truncation. Close button is hidden until hover. Clicking the item activates the tab via kernel. Close button stops propagation to avoid activating while closing.
- **Do NOT**: Store tab state internally. The `tab` property is the single source of truth, passed down from parent.
- **Verify**: Component compiles. Has click handler for activate and close.
- **Dependencies**: Step 14.

---

### Step 23: Create bb-tab-list component

- **Files**: `src/ui/components/sidebar/bb-tab-list.ts`
- **Action**: Create the scrollable list of tab items.
- **Signature**:
  ```typescript
  import { LitElement, html, css } from 'lit';
  import { customElement, property } from 'lit/decorators.js';
  import type { Tab } from '@kernel/interfaces';

  @customElement('bb-tab-list')
  export class BbTabList extends LitElement {
    @property({ type: Array }) tabs: Tab[] = [];
    @property({ type: String }) activeTabId: string | null = null;

    static styles = css`
      :host { display: block; padding: var(--bb-space-xs) 0; }
    `;

    render() {
      return html`
        ${this.tabs.map(tab => html`
          <bb-tab-item
            .tab=${tab}
            ?active=${tab.id === this.activeTabId}
          ></bb-tab-item>
        `)}
      `;
    }
  }
  ```
- **Details**: Simple list renderer. Maps over tabs and renders `bb-tab-item` for each. Passes `active` boolean attribute.
- **Do NOT**: Add virtual scrolling yet — that is a P1 optimization for 50+ tabs.
- **Verify**: Component compiles.
- **Dependencies**: Step 22.

---

### Step 24: Create bb-workspace-switcher and bb-workspace-chip

- **Files**:
  - `src/ui/components/sidebar/bb-workspace-switcher.ts`
  - `src/ui/components/sidebar/bb-workspace-chip.ts`
- **Action**: Create the workspace switcher (horizontal row of workspace chips) and individual workspace chip.

**`bb-workspace-switcher`**:
```typescript
import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { Workspace } from '@kernel/interfaces';

@customElement('bb-workspace-switcher')
export class BbWorkspaceSwitcher extends LitElement {
  @property({ type: Array }) workspaces: Workspace[] = [];
  @property({ type: String }) activeWorkspaceId: string = '';

  static styles = css`
    :host {
      display: flex;
      gap: var(--bb-space-xs);
      padding: var(--bb-space-sm) var(--bb-space-md);
      flex-wrap: wrap;
    }
  `;

  render() {
    return html`
      ${this.workspaces.map(ws => html`
        <bb-workspace-chip
          .workspace=${ws}
          ?active=${ws.id === this.activeWorkspaceId}
        ></bb-workspace-chip>
      `)}
    `;
  }
}
```

**`bb-workspace-chip`**:
```typescript
import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { Workspace } from '@kernel/interfaces';

@customElement('bb-workspace-chip')
export class BbWorkspaceChip extends LitElement {
  @property({ type: Object }) workspace\!: Workspace;
  @property({ type: Boolean, reflect: true }) active: boolean = false;

  static styles = css`
    :host {
      display: inline-flex;
      align-items: center;
      gap: var(--bb-space-xs);
      padding: var(--bb-space-xs) var(--bb-space-sm);
      border-radius: var(--bb-radius-md);
      cursor: pointer;
      font-size: var(--bb-font-size-xs);
      color: var(--bb-text-secondary);
      transition: all var(--bb-transition-fast);
      border: 1px solid transparent;
    }
    :host(:hover) { background: var(--bb-bg-hover); }
    :host([active]) {
      background: var(--bb-bg-active);
      color: var(--bb-text-primary);
      border-color: var(--bb-border);
    }
    .icon { font-size: 14px; }
    .name { white-space: nowrap; }
    .count {
      font-size: var(--bb-font-size-xs);
      color: var(--bb-text-muted);
      margin-left: 2px;
    }
  `;

  private _onClick() {
    window.kernel.workspaces.activateWorkspace(this.workspace.id);
  }

  render() {
    return html`
      <span class="icon">${this.workspace.icon}</span>
      <span class="name">${this.workspace.name}</span>
      <span class="count">${this.workspace.tabCount}</span>
    `;
  }

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener('click', this._onClick);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('click', this._onClick);
  }
}
```

- **Do NOT**: Add workspace creation/rename UI yet — that can come later. This is just the switcher for existing workspaces.
- **Verify**: Both components compile. Clicking a chip calls `kernel.workspaces.activateWorkspace`.
- **Dependencies**: Step 14.

---

### Step 25: Create bb-new-tab-button

- **Files**: `src/ui/components/sidebar/bb-new-tab-button.ts`
- **Action**: Simple button that creates a new tab in the active workspace.
- **Signature**:
  ```typescript
  import { LitElement, html, css } from 'lit';
  import { customElement } from 'lit/decorators.js';

  @customElement('bb-new-tab-button')
  export class BbNewTabButton extends LitElement {
    static styles = css`
      :host {
        display: block;
        padding: var(--bb-space-sm) var(--bb-space-md);
        border-top: 1px solid var(--bb-border);
      }
      button {
        width: 100%;
        padding: var(--bb-space-sm);
        background: none;
        border: 1px solid var(--bb-border);
        border-radius: var(--bb-radius-sm);
        color: var(--bb-text-secondary);
        cursor: pointer;
        font-size: var(--bb-font-size-sm);
        font-family: var(--bb-font-family);
        transition: all var(--bb-transition-fast);
      }
      button:hover { background: var(--bb-bg-hover); color: var(--bb-text-primary); }
    `;

    private async _onClick() {
      await window.kernel.tabs.createTab({ active: true });
    }

    render() {
      return html`<button @click=${this._onClick}>+ New Tab</button>`;
    }
  }
  ```
- **Verify**: Component compiles. Click calls `kernel.tabs.createTab`.
- **Dependencies**: Step 14.

---

### Step 26: Create bb-toolbar, bb-omnibar, and bb-navigation-buttons

- **Files**:
  - `src/ui/components/toolbar/bb-toolbar.ts`
  - `src/ui/components/toolbar/bb-omnibar.ts`
  - `src/ui/components/toolbar/bb-navigation-buttons.ts`

**`bb-toolbar`**:
```typescript
import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { Tab } from '@kernel/interfaces';

@customElement('bb-toolbar')
export class BbToolbar extends LitElement {
  @property({ type: Object }) activeTab: Tab | null = null;

  static styles = css`
    :host {
      display: flex;
      align-items: center;
      gap: var(--bb-space-sm);
      padding: var(--bb-space-xs) var(--bb-space-md);
      background: var(--bb-bg-secondary);
      border-bottom: 1px solid var(--bb-border);
      height: 40px;
      flex-shrink: 0;
      /* Allow dragging the window from the toolbar area */
      -webkit-app-region: drag;
    }
    bb-navigation-buttons, bb-omnibar { -webkit-app-region: no-drag; }
  `;

  render() {
    return html`
      <bb-navigation-buttons .activeTab=${this.activeTab}></bb-navigation-buttons>
      <bb-omnibar .activeTab=${this.activeTab}></bb-omnibar>
    `;
  }
}
```

**`bb-navigation-buttons`**:
```typescript
import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { Tab } from '@kernel/interfaces';

@customElement('bb-navigation-buttons')
export class BbNavigationButtons extends LitElement {
  @property({ type: Object }) activeTab: Tab | null = null;

  static styles = css`
    :host { display: flex; gap: 2px; }
    button {
      width: 28px; height: 28px; border: none; border-radius: var(--bb-radius-sm);
      background: none; color: var(--bb-text-secondary); cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      font-size: 16px; transition: all var(--bb-transition-fast);
    }
    button:hover:not(:disabled) { background: var(--bb-bg-hover); color: var(--bb-text-primary); }
    button:disabled { opacity: 0.3; cursor: default; }
  `;

  render() {
    const tab = this.activeTab;
    return html`
      <button @click=${() => tab && window.kernel.tabs.goBack(tab.id)} ?disabled=${\!tab?.canGoBack} title="Back">&#8592;</button>
      <button @click=${() => tab && window.kernel.tabs.goForward(tab.id)} ?disabled=${\!tab?.canGoForward} title="Forward">&#8594;</button>
      <button @click=${() => tab && window.kernel.tabs.reload(tab.id)} ?disabled=${\!tab} title="Reload">&#8635;</button>
    `;
  }
}
```

**`bb-omnibar`**:
```typescript
import { LitElement, html, css } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import type { Tab } from '@kernel/interfaces';

@customElement('bb-omnibar')
export class BbOmnibar extends LitElement {
  @property({ type: Object }) activeTab: Tab | null = null;
  @state() private inputValue: string = '';
  @state() private isFocused: boolean = false;
  @query('input') private inputEl\!: HTMLInputElement;

  static styles = css`
    :host { flex: 1; min-width: 0; }
    .omnibar-container {
      display: flex;
      align-items: center;
      background: var(--bb-bg-primary);
      border: 1px solid var(--bb-border);
      border-radius: var(--bb-radius-md);
      padding: 0 var(--bb-space-md);
      height: 28px;
      transition: border-color var(--bb-transition-fast);
    }
    .omnibar-container:focus-within {
      border-color: var(--bb-accent);
    }
    input {
      flex: 1;
      border: none;
      outline: none;
      background: none;
      color: var(--bb-text-primary);
      font-size: var(--bb-font-size-sm);
      font-family: var(--bb-font-family);
      min-width: 0;
    }
    input::placeholder { color: var(--bb-text-muted); }
  `;

  // When the active tab changes and the omnibar is NOT focused,
  // update inputValue to show the current tab URL.
  updated(changed: Map<string, unknown>) {
    if (changed.has('activeTab') && \!this.isFocused && this.activeTab) {
      this.inputValue = this.activeTab.url;
    }
  }

  // Public method: focus the input (called by keyboard shortcut Cmd+L)
  public focus() {
    this.inputEl?.focus();
    this.inputEl?.select();
  }

  private _onFocus() {
    this.isFocused = true;
    this.inputEl?.select();
  }

  private _onBlur() {
    this.isFocused = false;
    // Reset to current tab URL when blurring without navigation
    if (this.activeTab) {
      this.inputValue = this.activeTab.url;
    }
  }

  private _onInput(e: Event) {
    this.inputValue = (e.target as HTMLInputElement).value;
  }

  private async _onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      const input = this.inputValue.trim();
      if (\!input) return;

      // Ask the kernel to resolve the input (URL or search query)
      const result = await window.kernel.navigation.resolveInput(input);
      const activeTab = this.activeTab;
      if (activeTab) {
        await window.kernel.tabs.navigateTo(activeTab.id, result.resolved);
      } else {
        await window.kernel.tabs.createTab({ url: result.resolved, active: true });
      }
      this.inputEl?.blur();
    } else if (e.key === 'Escape') {
      this.inputEl?.blur();
    }
  }

  render() {
    return html`
      <div class="omnibar-container">
        <input
          type="text"
          .value=${this.inputValue}
          @input=${this._onInput}
          @keydown=${this._onKeyDown}
          @focus=${this._onFocus}
          @blur=${this._onBlur}
          placeholder="Search or enter URL"
          spellcheck="false"
        />
      </div>
    `;
  }
}
```

- **Do NOT**: Add autocomplete suggestions popup yet. The omnibar should just resolve input to URL or search and navigate.
- **Verify**: All three components compile. Omnibar handles Enter key to navigate.
- **Dependencies**: Step 14.

---

### Step 27: Create bb-content-area component

- **Files**: `src/ui/components/content/bb-content-area.ts`
- **Action**: Create the content area placeholder. In Electron, actual web pages are rendered by `WebContentsView` instances managed by the main process, positioned over this area. This component serves as the layout placeholder and provides bounds information.
- **Signature**:
  ```typescript
  import { LitElement, html, css } from 'lit';
  import { customElement } from 'lit/decorators.js';

  @customElement('bb-content-area')
  export class BbContentArea extends LitElement {
    static styles = css`
      :host {
        flex: 1;
        background: var(--bb-bg-primary);
        position: relative;
        /* This is where WebContentsView will be placed on top by the main process */
      }
      .empty-state {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        color: var(--bb-text-muted);
        font-size: var(--bb-font-size-lg);
      }
    `;

    render() {
      return html`<div class="empty-state">No tab selected</div>`;
    }
  }
  ```
- **Details**: The main process will use `ResizeObserver` or window bounds calculations to position `WebContentsView` instances exactly on top of where this component is rendered. The component itself does not manage web content — it is purely a layout placeholder.
- **Do NOT**: Try to create `<webview>` or embed any web content from the renderer side.
- **Verify**: Component compiles.
- **Dependencies**: Step 18.

---

## Phase 7: Kernel Implementations (Main Process)

### Step 28: Create KernelEvent utility class

- **Files**: `src/kernel/impl/kernel-event.ts`
- **Action**: Create a concrete implementation of the `KernelEvent<T>` interface that manages subscriptions and can emit events.
- **Signature**:
  ```typescript
  import { KernelEvent } from '../interfaces/shared';

  export class KernelEventEmitter<T> implements KernelEvent<T> {
    private listeners: Set<(data: T) => void> = new Set();

    subscribe(callback: (data: T) => void): () => void {
      this.listeners.add(callback);
      return () => { this.listeners.delete(callback); };
    }

    emit(data: T): void {
      for (const listener of this.listeners) {
        listener(data);
      }
    }
  }
  ```
- **Details**: This is used by all kernel implementations to fire events. In addition, the register-handlers code will subscribe to these events and forward them to the renderer via `uiView.webContents.send(channel, data)`.
- **Do NOT**: Add error handling or async support to emit — keep it simple and synchronous.
- **Verify**: File compiles.
- **Dependencies**: Step 6.

---

### Step 29: Implement ElectronTabManager

- **Files**: `src/kernel/impl/electron-tab-manager.ts`
- **Action**: Create the main TabManager implementation that manages `WebContentsView` instances inside the `BaseWindow`.
- **Signature**:
  ```typescript
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
    private tabOrder: string[] = []; // ordered list of tab IDs

    // Events
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

    // --- Queries ---
    async getTab(tabId: string): Promise<Tab | null> { ... }
    async getAllTabs(): Promise<Tab[]> { ... }
    async getTabsByWorkspace(workspaceId: string): Promise<Tab[]> { ... }
    async getActiveTab(): Promise<Tab | null> { ... }

    // --- Commands ---
    async createTab(opts: { url?: string; workspaceId?: string; active?: boolean }): Promise<Tab> {
      // 1. Generate unique ID: crypto.randomUUID()
      // 2. Create a new WebContentsView
      // 3. Set its webPreferences: { contextIsolation: true, sandbox: true }
      // 4. Create Tab data object with defaults
      // 5. Store in this.entries
      // 6. Add tabId to this.tabOrder
      // 7. Load URL: view.webContents.loadURL(opts.url || DEFAULT_URL)
      // 8. Listen to webContents events:
      //    - 'did-start-loading' → update isLoading=true, emit onTabUpdated
      //    - 'did-stop-loading' → update isLoading=false, emit onTabUpdated
      //    - 'page-title-updated' → update title, emit onTabUpdated
      //    - 'page-favicon-updated' → update favicon, emit onTabUpdated
      //    - 'did-navigate' → update url, canGoBack, canGoForward, emit onTabUpdated
      //    - 'did-navigate-in-page' → same as did-navigate
      // 9. Emit onTabCreated
      // 10. If opts.active \!== false, call this.activateTab(id)
      // 11. Return the Tab object
    }

    async closeTab(tabId: string): Promise<void> {
      // 1. Get entry from this.entries
      // 2. If this is the active tab, activate an adjacent tab (next, or previous, or null)
      // 3. Remove the view from mainWindow.contentView
      // 4. Destroy view.webContents (view.webContents.close())
      // 5. Remove from this.entries and this.tabOrder
      // 6. Emit onTabClosed
    }

    async closeTabs(tabIds: string[]): Promise<void> {
      for (const id of tabIds) await this.closeTab(id);
    }

    async activateTab(tabId: string): Promise<void> {
      // 1. Hide the current active tab's view (remove from contentView or set bounds to 0)
      // 2. Set new active tab
      // 3. Add new tab's view to mainWindow.contentView if not already added
      // 4. Set view bounds to getContentBounds()
      // 5. Bring view to front (mainWindow.contentView.addChildView moves it to top)
      // 6. Update Tab.isActive for old and new
      // 7. Emit onTabActivated
      // 8. Emit onTabUpdated for both old and new tabs
    }

    async navigateTo(tabId: string, url: string): Promise<void> {
      // Get entry, call view.webContents.loadURL(url)
    }

    async goBack(tabId: string): Promise<void> {
      // Get entry, call view.webContents.goBack()
    }

    async goForward(tabId: string): Promise<void> {
      // Get entry, call view.webContents.goForward()
    }

    async reload(tabId: string): Promise<void> {
      // Get entry, call view.webContents.reload()
    }

    async stop(tabId: string): Promise<void> {
      // Get entry, call view.webContents.stop()
    }

    async duplicateTab(tabId: string): Promise<Tab> {
      // Get the tab's URL, create a new tab with same URL and workspaceId
    }

    async pinTab(tabId: string): Promise<void> {
      // Update tab.isPinned = true, emit onTabUpdated
    }

    async unpinTab(tabId: string): Promise<void> {
      // Update tab.isPinned = false, emit onTabUpdated
    }

    async muteTab(tabId: string): Promise<void> {
      // view.webContents.setAudioMuted(true), update tab.isMuted, emit onTabUpdated
    }

    async unmuteTab(tabId: string): Promise<void> {
      // view.webContents.setAudioMuted(false), update tab.isMuted, emit onTabUpdated
    }

    async moveTab(tabId: string, toIndex: number): Promise<void> {
      // Reorder this.tabOrder, emit onTabMoved
    }

    async moveTabToWorkspace(tabId: string, workspaceId: string): Promise<void> {
      // Update tab.workspaceId, emit onTabUpdated
    }

    async setZoom(tabId: string, factor: number): Promise<void> {
      // view.webContents.setZoomFactor(factor), update tab.zoomFactor, emit onTabUpdated
    }

    async findInPage(tabId: string, query: string, opts?: FindOpts): Promise<FindResult> {
      // view.webContents.findInPage(query, opts)
      // Return result via 'found-in-page' event
    }

    async stopFindInPage(tabId: string): Promise<void> {
      // view.webContents.stopFindInPage('clearSelection')
    }

    // --- Internal ---
    // Method to update content bounds when window resizes
    updateAllBounds(): void {
      // Only update the active tab's view bounds
      if (this.activeTabId) {
        const entry = this.entries.get(this.activeTabId);
        if (entry) {
          entry.view.setBounds(this.getContentBounds());
        }
      }
    }
  }
  ```
- **Details**: This is the most complex class. The key insight is that `WebContentsView` instances are managed as children of `mainWindow.contentView`. Only the active tab's view is visible (positioned over the content area). Inactive tabs have their views removed from the parent or set to zero-size bounds.
  - The `getContentBounds` callback is provided by the main entry point — it calculates the rectangle to the right of the sidebar and below the toolbar.
  - Use `crypto.randomUUID()` for tab IDs (available in Node 19+).
- **Do NOT**: Add extension support. Do NOT add session persistence. Focus on create, close, activate, navigate.
- **Verify**: File compiles with `tsconfig.main.json`. All TabManager interface methods are implemented.
- **Dependencies**: Steps 10, 15, 28.

---

### Step 30: Implement ElectronWorkspaceManager

- **Files**: `src/kernel/impl/electron-workspace-manager.ts`
- **Action**: Create the WorkspaceManager implementation. This is a shallow implementation — workspaces are just metadata. Tab filtering by workspace is done by querying TabManager.
- **Signature**:
  ```typescript
  import { Workspace, WorkspaceManager } from '../interfaces/workspace';
  import { KernelEventEmitter } from './kernel-event';
  import { ElectronTabManager } from './electron-tab-manager';
  import { DEFAULT_WORKSPACE_NAME, DEFAULT_WORKSPACE_COLOR, DEFAULT_WORKSPACE_ICON } from '../../shared/constants';
  import crypto from 'crypto';

  export class ElectronWorkspaceManager implements WorkspaceManager {
    private workspaces: Map<string, Workspace> = new Map();
    private activeWorkspaceId: string = '';

    onWorkspaceCreated = new KernelEventEmitter<Workspace>();
    onWorkspaceDeleted = new KernelEventEmitter<{ workspaceId: string }>();
    onWorkspaceUpdated = new KernelEventEmitter<{ workspaceId: string; changes: Partial<Workspace> }>();
    onWorkspaceActivated = new KernelEventEmitter<{ workspaceId: string; previousId: string }>();

    constructor(private tabManager: ElectronTabManager) {
      // Create a default workspace on construction
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
      this.activeWorkspaceId = defaultWs.id;

      // Subscribe to tab events to update tabCount
      this.tabManager.onTabCreated.subscribe(() => this._updateCounts());
      this.tabManager.onTabClosed.subscribe(() => this._updateCounts());
      this.tabManager.onTabUpdated.subscribe(() => this._updateCounts());
    }

    private async _updateCounts(): Promise<void> {
      for (const [id, ws] of this.workspaces) {
        const tabs = await this.tabManager.getTabsByWorkspace(id);
        const newCount = tabs.length;
        if (ws.tabCount \!== newCount) {
          ws.tabCount = newCount;
          this.onWorkspaceUpdated.emit({ workspaceId: id, changes: { tabCount: newCount } });
        }
      }
    }

    async getWorkspace(id: string): Promise<Workspace | null> {
      return this.workspaces.get(id) ?? null;
    }

    async getAllWorkspaces(): Promise<Workspace[]> {
      return Array.from(this.workspaces.values()).sort((a, b) => a.order - b.order);
    }

    async getActiveWorkspace(): Promise<Workspace> {
      return this.workspaces.get(this.activeWorkspaceId)\!;
    }

    async createWorkspace(opts: { name: string; color?: string; icon?: string }): Promise<Workspace> {
      const ws: Workspace = {
        id: crypto.randomUUID(),
        name: opts.name,
        color: opts.color ?? '#5B7FFF',
        icon: opts.icon ?? '📁',
        tabCount: 0,
        isActive: false,
        order: this.workspaces.size,
      };
      this.workspaces.set(ws.id, ws);
      this.onWorkspaceCreated.emit(ws);
      return ws;
    }

    async deleteWorkspace(id: string): Promise<void> {
      // Cannot delete the last workspace
      if (this.workspaces.size <= 1) return;
      // If deleting the active workspace, activate another one
      if (this.activeWorkspaceId === id) {
        const other = Array.from(this.workspaces.keys()).find(k => k \!== id);
        if (other) await this.activateWorkspace(other);
      }
      // Move all tabs in this workspace to the active workspace
      const tabs = await this.tabManager.getTabsByWorkspace(id);
      for (const tab of tabs) {
        await this.tabManager.moveTabToWorkspace(tab.id, this.activeWorkspaceId);
      }
      this.workspaces.delete(id);
      this.onWorkspaceDeleted.emit({ workspaceId: id });
    }

    async renameWorkspace(id: string, name: string): Promise<void> {
      const ws = this.workspaces.get(id);
      if (\!ws) return;
      ws.name = name;
      this.onWorkspaceUpdated.emit({ workspaceId: id, changes: { name } });
    }

    async updateWorkspace(id: string, changes: Partial<Omit<Workspace, 'id'>>): Promise<void> {
      const ws = this.workspaces.get(id);
      if (\!ws) return;
      Object.assign(ws, changes);
      this.onWorkspaceUpdated.emit({ workspaceId: id, changes });
    }

    async activateWorkspace(id: string): Promise<void> {
      const prev = this.activeWorkspaceId;
      if (prev === id) return;
      const prevWs = this.workspaces.get(prev);
      const nextWs = this.workspaces.get(id);
      if (\!nextWs) return;
      if (prevWs) prevWs.isActive = false;
      nextWs.isActive = true;
      this.activeWorkspaceId = id;
      this.onWorkspaceActivated.emit({ workspaceId: id, previousId: prev });
    }

    async reorderWorkspace(id: string, newOrder: number): Promise<void> {
      const ws = this.workspaces.get(id);
      if (\!ws) return;
      ws.order = newOrder;
      this.onWorkspaceUpdated.emit({ workspaceId: id, changes: { order: newOrder } });
    }

    // Expose activeWorkspaceId for use by other kernel services
    getActiveWorkspaceId(): string {
      return this.activeWorkspaceId;
    }
  }
  ```
- **Do NOT**: Implement session persistence. Do NOT implement deep isolation (separate sessions per workspace).
- **Verify**: File compiles. All WorkspaceManager interface methods are implemented.
- **Dependencies**: Steps 10, 28, 29.

---

### Step 31: Implement ElectronNavigationManager

- **Files**: `src/kernel/impl/electron-navigation-manager.ts`
- **Action**: Create the NavigationManager that resolves omnibar input to URLs or search queries.
- **Signature**:
  ```typescript
  import { NavigationManager } from '../interfaces/navigation';
  import { Suggestion, SecurityInfo } from '../interfaces/shared';
  import { DEFAULT_SEARCH_ENGINE } from '../../shared/constants';

  export class ElectronNavigationManager implements NavigationManager {
    async resolveInput(input: string): Promise<{ type: 'url' | 'search'; resolved: string }> {
      const trimmed = input.trim();
      // If it looks like a URL (has protocol, or is domain-like)
      if (/^https?:\/\//i.test(trimmed)) {
        return { type: 'url', resolved: trimmed };
      }
      if (/^[a-zA-Z0-9-]+(\.[a-zA-Z]{2,})(\/.*)?$/.test(trimmed)) {
        return { type: 'url', resolved: `https://${trimmed}` };
      }
      if (/^localhost(:\d+)?(\/.*)?$/.test(trimmed)) {
        return { type: 'url', resolved: `http://${trimmed}` };
      }
      // Otherwise, treat as search
      return { type: 'search', resolved: `${DEFAULT_SEARCH_ENGINE}${encodeURIComponent(trimmed)}` };
    }

    async getSuggestions(_query: string): Promise<Suggestion[]> {
      // Stub for now — return empty array
      // TODO: Implement history/bookmark search
      return [];
    }

    async getSecurityInfo(_tabId: string): Promise<SecurityInfo> {
      // Stub — return basic info
      return { protocol: 'https', isSecure: true };
    }
  }
  ```
- **Do NOT**: Implement real suggestion search or full security info. Stubs are fine for Week 1-2.
- **Verify**: File compiles. `resolveInput` correctly distinguishes URLs from search queries.
- **Dependencies**: Steps 10, 5.

---

### Step 32: Implement ElectronWindowManager

- **Files**: `src/kernel/impl/electron-window-manager.ts`
- **Action**: Create the WindowManager that controls sidebar width and content bounds.
- **Signature**:
  ```typescript
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
      // Directly set bounds — this is called by the TabManager
      this.onContentBoundsChanged({ x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height });
    }

    async setSidebarWidth(width: number): Promise<void> {
      this.sidebarWidth = width;
      this._recalculateBounds();
    }

    async toggleSidebar(): Promise<void> {
      this.sidebarVisible = \!this.sidebarVisible;
      this._recalculateBounds();
    }

    async enterSplitView(_tabId1: string, _tabId2: string, _direction: 'horizontal' | 'vertical'): Promise<void> {
      // Stub — P1 feature
    }

    async exitSplitView(): Promise<void> {
      // Stub — P1 feature
    }

    // Returns the rectangle where web content should be displayed
    getContentBounds(): Electron.Rectangle {
      const windowBounds = this.mainWindow.getContentBounds();
      const sidebarW = this.sidebarVisible ? this.sidebarWidth : 0;
      const toolbarH = 40; // matches bb-toolbar height
      return {
        x: sidebarW,
        y: toolbarH,
        width: windowBounds.width - sidebarW,
        height: windowBounds.height - toolbarH,
      };
    }

    private _recalculateBounds(): void {
      const bounds = this.getContentBounds();
      this.onContentBoundsChanged(bounds);
      this.onBoundsChanged.emit({ bounds });
    }
  }
  ```
- **Do NOT**: Implement split view.
- **Verify**: File compiles. `getContentBounds` correctly subtracts sidebar width and toolbar height.
- **Dependencies**: Steps 10, 15, 28.

---

## Phase 8: Keyboard Shortcuts

### Step 33: Create keyboard shortcut manager

- **Files**: `src/ui/lib/keybindings.ts`
- **Action**: Create a global keyboard event listener in the renderer that maps shortcut keys to kernel commands.
- **Signature**:
  ```typescript
  // Listen for keyboard shortcuts on the document
  // All shortcuts use Cmd (metaKey) on macOS

  function setupKeybindings(): void {
    document.addEventListener('keydown', async (e: KeyboardEvent) => {
      const meta = e.metaKey; // Cmd on macOS
      if (\!meta) return;

      switch (e.key) {
        case 't': // Cmd+T — New tab
          e.preventDefault();
          await window.kernel.tabs.createTab({ active: true });
          break;

        case 'w': // Cmd+W — Close active tab
          e.preventDefault();
          const activeTab = await window.kernel.tabs.getActiveTab();
          if (activeTab) {
            await window.kernel.tabs.closeTab(activeTab.id);
          }
          break;

        case 'l': // Cmd+L — Focus omnibar
          e.preventDefault();
          const omnibar = document.querySelector('bb-app')
            ?.shadowRoot?.querySelector('bb-toolbar')
            ?.shadowRoot?.querySelector('bb-omnibar') as any;
          omnibar?.focus();
          break;

        case 'r': // Cmd+R — Reload
          e.preventDefault();
          const tab = await window.kernel.tabs.getActiveTab();
          if (tab) {
            await window.kernel.tabs.reload(tab.id);
          }
          break;
      }
    });
  }

  setupKeybindings();
  ```
- **Details**: The keybinding code runs once when imported. It attaches a single `keydown` listener on `document`. The Cmd+L shortcut needs to reach into the Shadow DOM to focus the omnibar input — this is done via chained `shadowRoot` queries. A cleaner approach would be a custom event, but this works for MVP.
- **Do NOT**: Handle shortcuts that are already handled by the native macOS menu (Step 16). If there is overlap, the renderer handler takes precedence when the renderer is focused. Keep both since native menu handles cases when renderer is not focused.
- **Verify**: File compiles. Keybindings are registered on import.
- **Dependencies**: Steps 14, 26.

---

## Phase 9: Wiring Everything Together

### Step 34: Wire up the Electron main entry point with all kernel services

- **Files**: `src/main/index.ts` (modify — replace the TODO comments from Step 17)
- **Action**: Instantiate all kernel services, register IPC handlers, and wire event forwarding from kernel to renderer.
- **Signature**:
  ```typescript
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
      (bounds) => tabManager.updateAllBounds(),
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
    // Each event on the kernel side sends a message to the uiView's webContents
    const send = (channel: string, data: unknown) => {
      if (\!uiView.webContents.isDestroyed()) {
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

    // Handle window resize → update tab content bounds
    mainWindow.on('resize', () => {
      // Update UI view to fill entire window
      const contentBounds = mainWindow.getContentBounds();
      uiView.setBounds({ x: 0, y: 0, width: contentBounds.width, height: contentBounds.height });
      // Update active tab's WebContentsView bounds
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
        // Send a custom IPC to renderer to focus omnibar
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
  ```
- **Details**: This is the wiring step. The circular dependency between `windowManager` and `tabManager` is resolved by passing a callback (`() => windowManager.getContentBounds()`). The event forwarding subscribes to kernel events and sends them to the renderer via `webContents.send()` — this is how the preload's `onEvent` subscribers receive data.
- **Do NOT**: Add error handling for edge cases like "last tab closed" or "no workspaces" — keep it simple for now.
- **Verify**: `npm run build` succeeds. Running `npx electron .` opens a window with sidebar on the left, toolbar at top, and a web page loaded in the content area.
- **Dependencies**: Steps 12, 13, 15, 16, 29, 30, 31, 32.

---

### Step 35: Complete bb-app connectedCallback with kernel event subscriptions

- **Files**: `src/ui/components/app/bb-app.ts` (modify — flesh out connectedCallback from Step 20)
- **Action**: Implement the full event subscription and initial data loading in `bb-app`.
- **Details**:
  ```typescript
  // Add to the bb-app class:

  private unsubscribers: (() => void)[] = [];

  async connectedCallback() {
    super.connectedCallback();

    // Load initial state
    this.tabs = await window.kernel.tabs.getAllTabs();
    this.workspaces = await window.kernel.workspaces.getAllWorkspaces();
    const activeWs = await window.kernel.workspaces.getActiveWorkspace();
    this.activeWorkspaceId = activeWs.id;
    const activeTab = await window.kernel.tabs.getActiveTab();
    this.activeTabId = activeTab?.id ?? null;

    // Subscribe to tab events
    this.unsubscribers.push(
      window.kernel.tabs.onTabCreated.subscribe((tab) => {
        this.tabs = [...this.tabs, tab];
      }),
      window.kernel.tabs.onTabClosed.subscribe(({ tabId }) => {
        this.tabs = this.tabs.filter(t => t.id \!== tabId);
        if (this.activeTabId === tabId) {
          this.activeTabId = null;
        }
      }),
      window.kernel.tabs.onTabUpdated.subscribe(({ tabId, changes }) => {
        this.tabs = this.tabs.map(t =>
          t.id === tabId ? { ...t, ...changes } : t
        );
      }),
      window.kernel.tabs.onTabActivated.subscribe(({ tabId }) => {
        this.activeTabId = tabId;
        // Update isActive on all tabs
        this.tabs = this.tabs.map(t => ({
          ...t,
          isActive: t.id === tabId,
        }));
      }),
    );

    // Subscribe to workspace events
    this.unsubscribers.push(
      window.kernel.workspaces.onWorkspaceCreated.subscribe((ws) => {
        this.workspaces = [...this.workspaces, ws];
      }),
      window.kernel.workspaces.onWorkspaceDeleted.subscribe(({ workspaceId }) => {
        this.workspaces = this.workspaces.filter(w => w.id \!== workspaceId);
      }),
      window.kernel.workspaces.onWorkspaceUpdated.subscribe(({ workspaceId, changes }) => {
        this.workspaces = this.workspaces.map(w =>
          w.id === workspaceId ? { ...w, ...changes } : w
        );
      }),
      window.kernel.workspaces.onWorkspaceActivated.subscribe(({ workspaceId }) => {
        this.activeWorkspaceId = workspaceId;
        this.workspaces = this.workspaces.map(w => ({
          ...w,
          isActive: w.id === workspaceId,
        }));
      }),
    );
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.unsubscribers.forEach(unsub => unsub());
    this.unsubscribers = [];
  }
  ```
- **Do NOT**: Add any business logic. This is purely state subscription and propagation.
- **Verify**: When the app runs, `bb-app` loads initial state and reactively updates when kernel events fire.
- **Dependencies**: Steps 20, 34.

---

### Step 36: Uncomment all imports in main.ts and verify full build

- **Files**: `src/ui/main.ts` (modify)
- **Action**: Ensure all component imports are uncommented and the full application builds.
- **Details**: Update `main.ts` to import all components created in Steps 20-27:
  ```typescript
  import './components/app/bb-app';
  import './components/sidebar/bb-sidebar';
  import './components/sidebar/bb-tab-list';
  import './components/sidebar/bb-tab-item';
  import './components/sidebar/bb-workspace-switcher';
  import './components/sidebar/bb-workspace-chip';
  import './components/sidebar/bb-new-tab-button';
  import './components/toolbar/bb-toolbar';
  import './components/toolbar/bb-omnibar';
  import './components/toolbar/bb-navigation-buttons';
  import './components/content/bb-content-area';
  import './lib/keybindings';

  console.log('Better Browser UI initialized');
  ```
  Then run the full build and test:
  ```bash
  npm run build
  npx electron .
  ```
- **Verify**:
  1. The app opens a window with a dark sidebar on the left
  2. A toolbar with omnibar appears at the top of the content area
  3. A default tab loads Google (or the DEFAULT_URL)
  4. The tab appears in the sidebar
  5. Clicking "+ New Tab" creates a new tab
  6. Clicking a tab in the sidebar switches to it
  7. Typing a URL in the omnibar and pressing Enter navigates
  8. Typing a search query in the omnibar and pressing Enter searches Google
  9. Cmd+T creates a new tab
  10. Cmd+W closes the active tab
  11. Cmd+L focuses the omnibar
  12. Cmd+R reloads the page
  13. A workspace chip appears in the sidebar (the default "Personal" workspace)
- **Dependencies**: All previous steps.

---

## Summary

| Phase | Steps | Description |
|-------|-------|-------------|
| 1: Project Init | 1-5 | package.json, tsconfig, vite, electron-builder, directory structure |
| 2: Kernel Interfaces | 6-10 | All TypeScript interface definitions for the UI Kernel |
| 3: IPC Bridge | 11-14 | Channel constants, preload script, handler registration, kernel-client types |
| 4: Electron Main | 15-17 | BaseWindow setup, macOS menu, app entry point (with TODOs) |
| 5: Styles & HTML | 18-19 | Design tokens, CSS reset, index.html, main.ts entry |
| 6: Web Components | 20-27 | bb-app, bb-sidebar, bb-tab-item, bb-tab-list, bb-workspace-*, bb-toolbar, bb-omnibar, bb-content-area |
| 7: Kernel Impls | 28-32 | KernelEvent utility, ElectronTabManager, ElectronWorkspaceManager, ElectronNavigationManager, ElectronWindowManager |
| 8: Shortcuts | 33 | Keyboard shortcut manager (Cmd+T/W/L/R) |
| 9: Wiring | 34-36 | Main entry point wiring, bb-app event subscriptions, full integration test |

At the end of these 36 steps, the developer should have a working browser application where they can:
- See a vertical sidebar with tabs
- Open new tabs (button or Cmd+T)
- Close tabs (X button or Cmd+W)
- Switch between tabs by clicking in the sidebar
- Navigate by typing URLs or search queries in the omnibar
- See the current page in the content area
- See a default workspace chip in the sidebar
- Use basic keyboard shortcuts
