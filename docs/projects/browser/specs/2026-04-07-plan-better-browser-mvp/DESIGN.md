# Design: Better Browser MVP

## Codebase Analysis

This is a greenfield project. No existing code. The project structure and all code will be created from scratch.

### Relevant Industry Patterns Discovered

From the architecture research, five patterns for building browser UIs have been validated in production:

1. **Electron + HTML/CSS/JS** (Min Browser): Fastest to build, worst memory, limited extension support (~70-80% via electron-chrome-extensions).
2. **Chromium fork + Web Components** (Edge WebUI 2.0, Opera): Full Chrome extension API, high performance, but 6-12 month timeline for first build.
3. **Chromium fork + native UI** (Brave, Arc): Best performance, full extensions, highest development cost.
4. **CSS/XUL transform** (Zen): Only viable for Firefox/Gecko base.
5. **Web tech on Chromium with aggressive optimization** (Vivaldi): React SPA, Portal Windows for multi-window, proven at scale.

### The Central Tension

The requirements demand two things that pull in opposite directions:

- **>90% Chrome extension compatibility** (NFR-04) -- requires deep Chromium integration
- **Rapid MVP delivery by a solo developer** -- requires Electron-level DX

No off-the-shelf solution satisfies both constraints simultaneously.

---

## Proposed Approaches

### Approach A: Pure Electron + electron-chrome-extensions

Accept ~70-80% extension compatibility for maximum development speed.

```
+-----------------------------------------------------------+
|                    Electron Main Process                   |
|  +---------------------+  +----------------------------+  |
|  |    UI Kernel         |  |  electron-chrome-extensions |  |
|  |  (TabManager,        |  |  (Extension Host)          |  |
|  |   WorkspaceManager,  |  |                            |  |
|  |   SessionManager)    |  +----------------------------+  |
|  +---------------------+                                   |
+-----------------------------------------------------------+
|                  Electron Renderer (UI)                    |
|  +------------------------------------------------------+ |
|  |        Web Components (Sidebar, Omnibar, etc.)       | |
|  +------------------------------------------------------+ |
+-----------------------------------------------------------+
|            BrowserView / WebContentsView per Tab          |
|  [ Tab 1 ]  [ Tab 2 ]  [ Tab 3 ]  ...                   |
+-----------------------------------------------------------+
```

**Tech Stack:**

- Electron 34+ (Chromium 134+)
- TypeScript strict mode
- Web Components (Lit for ergonomics, compiles to standard Web Components)
- electron-chrome-extensions (Nicedoc Labs fork or custom)
- Vite for UI bundling

**How it handles key features:**

- **Vertical sidebar**: Web Component in the renderer process, communicates with main process TabManager via IPC.
- **Workspaces**: Pure UI-level filtering. Each tab has a `workspaceId` property. Switching workspace shows/hides tabs via CSS and filters the sidebar list. No process isolation.
- **Extensions**: electron-chrome-extensions library provides chrome.\* API shims. Covers content scripts, popup windows, storage, tabs API. Missing: some declarativeNetRequest rules, complex devtools APIs, certain MV3 service worker edge cases.
- **UI Kernel**: TypeScript interfaces in main process. Renderer never calls Electron APIs directly; all communication through typed IPC channels mapped to kernel interfaces.

**Estimated Effort:** 6-8 person-weeks to P0 features.

| Pros                                       | Cons                                                   |
| ------------------------------------------ | ------------------------------------------------------ |
| Fastest path to a working browser          | Extension compat caps at ~70-80%                       |
| Excellent DX (hot reload, DevTools for UI) | uBlock Origin likely works; complex extensions may not |
| Large Electron ecosystem                   | Higher memory baseline (~300MB vs 200MB target)        |
| Web Components UI is fast to iterate       | BrowserView API may be deprecated in future Electron   |
| Solo-developer friendly                    | Performance ceiling for many-tab scenarios             |

---

### Approach B: Chromium Fork with Web Components UI

Fork Chromium, strip native tab UI, replace with Web Components layer. Full Chrome extension API for free.

```
+-----------------------------------------------------------+
|                  Chromium Browser Process                  |
|  +---------------------+  +----------------------------+  |
|  |    UI Kernel         |  |  Chrome Extension System   |  |
|  |  (C++ backend with   |  |  (native, unmodified)     |  |
|  |   Mojo IPC to UI)    |  |                            |  |
|  +---------------------+  +----------------------------+  |
+-----------------------------------------------------------+
|             WebUI Layer (privileged renderer)              |
|  +------------------------------------------------------+ |
|  |   Web Components UI (Sidebar, Omnibar, Workspaces)   | |
|  |   Communicates via Mojo IPC to browser process        | |
|  +------------------------------------------------------+ |
+-----------------------------------------------------------+
|              Renderer Processes (per tab/site)             |
|  [ Tab 1 ]  [ Tab 2 ]  [ Tab 3 ]  ...                   |
+-----------------------------------------------------------+
```

**Tech Stack:**

- Chromium source (following Brave's build system patterns)
- C++ for kernel layer and Mojo interfaces
- TypeScript + Web Components (Lit) for UI layer
- GN/Ninja build system
- Custom patching system (inspired by Brave's chromium_src approach)

**How it handles key features:**

- **Vertical sidebar**: WebUI page rendered in a privileged side panel. Communicates with C++ TabStripModel via Mojo IPC.
- **Workspaces**: Extends Chromium's TabGroupModel or builds parallel model. Tab filtering by workspace ID. Can later upgrade to profile-level isolation.
- **Extensions**: Zero extra work. Chromium's full chrome.extensions.\* API is available natively. MV3, declarativeNetRequest, all of it.
- **UI Kernel**: Mojo interface definitions (.mojom files) define the contract between the Web Components UI and the C++ backend. This is the cleanest possible kernel boundary.

**Estimated Effort:** 16-24 person-weeks to P0 features.

| Pros                                                | Cons                                    |
| --------------------------------------------------- | --------------------------------------- |
| 100% Chrome extension compatibility                 | 3-6x longer than Electron approach      |
| Best possible performance                           | Requires C++ and Mojo IPC expertise     |
| Clean architecture (Mojo = natural kernel boundary) | Chromium build is 30-60min, 50GB+ disk  |
| Following proven path (Edge, Opera, Brave)          | Rebasing on Chromium updates is complex |
| Future-proof for Phase 2+ features                  | Solo developer may not sustain this     |

---

### Approach C: Electron Shell + Embedded Chrome via Chrome DevTools Protocol

Use Electron for the app shell and UI, but launch and control a real Chrome/Chromium instance for tab rendering and extension hosting. The Electron window provides the sidebar and chrome; actual web pages and extensions run in real Chrome, controlled via the Chrome DevTools Protocol (CDP).

```
+-----------------------------------------------------------+
|                    Electron Main Process                   |
|  +---------------------+  +----------------------------+  |
|  |    UI Kernel         |  |   CDP Bridge               |  |
|  |  (TabManager,        |  |   (puppeteer-core or       |  |
|  |   WorkspaceManager,  |  |    raw CDP WebSocket)      |  |
|  |   SessionManager)    |  +----------------------------+  |
|  +---------------------+                                   |
+-----------------------------------------------------------+
|               Electron Renderer (UI Shell)                |
|  +------------------------------------------------------+ |
|  |   Web Components (Sidebar, Omnibar, Workspaces)      | |
|  |   Displays tab thumbnails / receives page metadata    | |
|  +------------------------------------------------------+ |
+-----------------------------------------------------------+
        |  CDP commands (navigate, list tabs, etc.)
        v
+-----------------------------------------------------------+
|           Chrome/Chromium Instance (headful)               |
|  +---------------------+  +----------------------------+  |
|  |  Full Chrome         |  |  Native Extension Host     |  |
|  |  Extension System    |  |  (Chrome Web Store works)  |  |
|  +---------------------+  +----------------------------+  |
|  [ Tab 1 ]  [ Tab 2 ]  [ Tab 3 ]  ...                   |
+-----------------------------------------------------------+
```

**Tech Stack:**

- Electron 34+ for UI shell
- Chrome/Chromium instance (bundled or system-installed)
- puppeteer-core for CDP communication (or raw WebSocket CDP client)
- TypeScript strict mode
- Web Components (Lit) for UI
- Vite for UI bundling

**How it handles key features:**

- **Vertical sidebar**: Web Component in Electron renderer. Tab metadata (title, favicon, URL) fetched via CDP `Target.getTargets()` and page events.
- **Workspaces**: Managed entirely in the Electron UI layer. Each tab's Chrome target ID is associated with a workspace. Switching workspaces shows/hides tabs by CDP window manipulation or by moving tabs between Chrome windows.
- **Extensions**: Fully native. Chrome is launched with `--load-extension` or the user installs from Chrome Web Store in the Chrome instance. 100% compatibility because it IS Chrome.
- **UI Kernel**: TypeScript interfaces in Electron main process. CDP adapter implements the kernel interfaces, translating between UI Kernel calls and CDP commands.

**Estimated Effort:** 10-14 person-weeks to P0 features.

| Pros                                                  | Cons                                                  |
| ----------------------------------------------------- | ----------------------------------------------------- |
| 100% extension compatibility (it is real Chrome)      | Two processes: Electron + Chrome (high memory)        |
| Electron-level DX for UI development                  | Visual integration is the hard problem                |
| No Chromium fork maintenance burden                   | Tab rendering happens in Chrome windows, not Electron |
| CDP is stable, well-documented                        | Latency for every UI interaction (IPC + CDP)          |
| Can swap Chrome for any CDP-compatible browser        | Fragile: Chrome updates could break CDP assumptions   |
| Proven concept (Playwright, browser automation tools) | User sees Chrome in Activity Monitor (confusing)      |

**The critical challenge with Approach C** is display integration: how do you show Chrome's rendered pages inside Electron's window? Options:

1. **Frameless Chrome windows positioned behind Electron** -- fragile, breaks on resize/move.
2. **Chrome headless + screenshot streaming** -- too slow for interactive browsing.
3. **Chrome `--app` mode windows managed alongside Electron** -- each tab is a separate OS window; Electron sidebar floats on top. This is the most viable but gives up the single-window experience.
4. **Use Chrome's `--embedded-browser-webview`** -- experimental, not stable.

None of these options produce a polished single-window browser experience without significant rendering hacks.

---

## Recommended Approach: Approach A (Pure Electron) with Extension Escape Hatch

### Rationale

**Approach A is the right choice for MVP**, with a clear upgrade path planned from the start.

The decision comes down to this: the MVP's purpose is to validate the UX concept (vertical sidebar + workspaces), not to ship a Chrome replacement. The requirements document itself states the success criteria as "usable as a secondary browser" and lists five specific extensions that must work. Let me evaluate those against electron-chrome-extensions capabilities:

| Extension           | Likely Status on Electron                               | Risk   |
| ------------------- | ------------------------------------------------------- | ------ |
| uBlock Origin (MV3) | Works -- content scripts + declarativeNetRequest basics | LOW    |
| 1Password/Bitwarden | Works -- popup + content scripts + storage              | LOW    |
| React DevTools      | Works -- devtools panel + content scripts               | MEDIUM |
| Dark Reader         | Works -- content scripts + storage                      | LOW    |
| 3+ others (generic) | Varies                                                  | MEDIUM |

The electron-chrome-extensions library has matured since 2024. The biggest gaps are in obscure MV3 service worker behaviors and declarativeNetRequest advanced rules. For the five named extensions, the probability of success is high.

**Why not Approach B (Chromium fork)?**

- 16-24 person-weeks is too long for a solo developer to maintain motivation and validate the concept. By the time the browser works, the UX hypothesis is still untested.
- C++ and Mojo IPC expertise is a steep learning curve that does not contribute to the UX innovation.
- The right time for a Chromium fork is Phase 3+, after the UX is validated and the UI Kernel interfaces are battle-tested.

**Why not Approach C (Electron + Chrome CDP)?**

- The display integration problem is unsolved without hacks. A browser that shows its tabs in separate OS windows is not a usable product.
- Double memory overhead (Electron + Chrome) violates NFR-01.
- CDP latency on every interaction degrades the <100ms tab switch requirement.

**The Extension Escape Hatch:**
If electron-chrome-extensions proves insufficient during development, the UI Kernel abstraction allows swapping the extension host without rewriting the UI. Specifically:

1. The `ExtensionHost` kernel interface is defined abstractly.
2. Implementation A uses electron-chrome-extensions.
3. Implementation B (escape hatch) could spawn a headless Chrome for extension execution only, using CDP to inject content scripts and relay extension actions -- without needing Chrome for tab rendering.

This hybrid escape hatch is smaller in scope than full Approach C because it only uses Chrome for extensions, not for page rendering.

---

## Key Decisions

1. **Electron over Chromium fork** -- because the MVP goal is UX validation, not engine completeness. A working browser in 6-8 weeks beats a perfect browser in 6 months.

2. **Web Components (Lit) over React** -- because (a) the requirements explicitly mandate Web Components (NFR-02), (b) Edge proved Web Components outperform React for browser UI by 42-76%, and (c) Lit compiles to standard Web Components with minimal runtime overhead (~5KB).

3. **Lit over raw Web Components** -- because raw Custom Elements require excessive boilerplate for reactive properties, templating, and event handling. Lit provides decorators, reactive properties, and `html` tagged templates while compiling to standard Web Components. The output IS Web Components; Lit is the authoring format.

4. **WebContentsView over BrowserView** -- because BrowserView is deprecated in Electron 34+. WebContentsView is the replacement, offering better lifecycle management and composability within BaseWindow.

5. **Vite over Webpack** -- because Vite provides sub-second HMR, native TypeScript support, and simpler configuration. The UI bundle is small enough that Vite's dev server advantages dominate.

6. **IPC-based UI Kernel over direct Electron API calls** -- because the UI Kernel abstraction (a) keeps the renderer process clean of Electron imports, (b) enables future migration to Chromium fork without UI rewrite, and (c) makes the UI testable in a plain browser during development.

7. **Shallow workspace isolation for MVP** -- because deep isolation (separate sessions per workspace) requires Electron partition management and complicates the extension model. Shallow isolation (UI-level tab filtering) ships faster and covers the core UX requirement (US-02, US-03).

---

## Dependencies and Risks

| Risk                                                           | Impact | Likelihood | Mitigation                                                                                                   |
| -------------------------------------------------------------- | ------ | ---------- | ------------------------------------------------------------------------------------------------------------ |
| electron-chrome-extensions does not support critical extension | HIGH   | MEDIUM     | Test uBlock Origin and 1Password in week 1. If broken, invoke escape hatch or accept reduced compat for MVP. |
| Electron memory exceeds 200MB baseline                         | MEDIUM | HIGH       | Accept ~250-300MB baseline. Implement tab suspension for background tabs. Document as known limitation.      |
| WebContentsView API instability                                | MEDIUM | LOW        | Pin to Electron 34.x stable. WebContentsView is the designated replacement for BrowserView; it is stable.    |
| Lit version incompatibility or bugs                            | LOW    | LOW        | Lit 3.x is stable and widely used. Pin version.                                                              |
| Performance: sidebar re-renders lag with 50+ tabs              | MEDIUM | MEDIUM     | Virtual scrolling for tab list. Only render visible tabs in DOM.                                             |

---

## UI Kernel Interface Layer

The UI Kernel is the central abstraction that decouples the UI (Web Components in the renderer) from the platform (Electron main process). All communication crosses the IPC boundary through these interfaces.

### Design Principles

1. **The renderer process knows nothing about Electron.** It calls kernel methods via a typed IPC bridge.
2. **The kernel interfaces are engine-agnostic.** They describe browser capabilities, not Electron APIs.
3. **Events flow from kernel to UI via typed event emitters.** The UI subscribes to state changes; the kernel pushes updates.
4. **Commands flow from UI to kernel via typed RPC.** The UI sends commands; the kernel executes them and returns results.

### Interface Definitions

```typescript
// === src/kernel/interfaces/tab.ts ===

interface Tab {
  id: string;
  url: string;
  title: string;
  favicon: string; // data: URL or http: URL
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

interface TabManager {
  // Queries
  getTab(tabId: string): Promise<Tab | null>;
  getAllTabs(): Promise<Tab[]>;
  getTabsByWorkspace(workspaceId: string): Promise<Tab[]>;
  getActiveTab(): Promise<Tab | null>;

  // Commands
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

  // Events
  onTabCreated: KernelEvent<Tab>;
  onTabClosed: KernelEvent<{ tabId: string }>;
  onTabUpdated: KernelEvent<{ tabId: string; changes: Partial<Tab> }>;
  onTabActivated: KernelEvent<{ tabId: string; previousTabId: string | null }>;
  onTabMoved: KernelEvent<{ tabId: string; fromIndex: number; toIndex: number }>;
}

// === src/kernel/interfaces/workspace.ts ===

interface Workspace {
  id: string;
  name: string;
  color: string; // hex color
  icon: string; // emoji or icon name
  tabCount: number;
  isActive: boolean;
  order: number;
}

interface WorkspaceManager {
  // Queries
  getWorkspace(id: string): Promise<Workspace | null>;
  getAllWorkspaces(): Promise<Workspace[]>;
  getActiveWorkspace(): Promise<Workspace>;

  // Commands
  createWorkspace(opts: { name: string; color?: string; icon?: string }): Promise<Workspace>;
  deleteWorkspace(id: string): Promise<void>;
  renameWorkspace(id: string, name: string): Promise<void>;
  updateWorkspace(id: string, changes: Partial<Omit<Workspace, 'id'>>): Promise<void>;
  activateWorkspace(id: string): Promise<void>;
  reorderWorkspace(id: string, newOrder: number): Promise<void>;

  // Events
  onWorkspaceCreated: KernelEvent<Workspace>;
  onWorkspaceDeleted: KernelEvent<{ workspaceId: string }>;
  onWorkspaceUpdated: KernelEvent<{ workspaceId: string; changes: Partial<Workspace> }>;
  onWorkspaceActivated: KernelEvent<{ workspaceId: string; previousId: string }>;
}

// === src/kernel/interfaces/session.ts ===

interface SessionManager {
  // Persist and restore browser state
  saveState(): Promise<void>;
  restoreState(): Promise<SessionState>;
  getRecentlyClosed(): Promise<Tab[]>;
  reopenTab(tabId: string): Promise<Tab>;
}

interface SessionState {
  workspaces: Workspace[];
  tabs: Tab[];
  activeWorkspaceId: string;
  activeTabId: string | null;
}

// === src/kernel/interfaces/extension.ts ===

interface ExtensionInfo {
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

interface ExtensionHost {
  // Queries
  getAll(): Promise<ExtensionInfo[]>;
  getExtension(id: string): Promise<ExtensionInfo | null>;

  // Commands
  enable(id: string): Promise<void>;
  disable(id: string): Promise<void>;
  uninstall(id: string): Promise<void>;
  openPopup(id: string, anchorRect: DOMRect): Promise<void>;
  openOptionsPage(id: string): Promise<void>;
  openChromeWebStore(): Promise<void>;

  // Events
  onExtensionLoaded: KernelEvent<ExtensionInfo>;
  onExtensionUnloaded: KernelEvent<{ extensionId: string }>;
  onBadgeUpdated: KernelEvent<{ extensionId: string; text: string; color: string }>;
}

// === src/kernel/interfaces/window.ts ===

interface WindowManager {
  // Commands
  setContentBounds(tabId: string, bounds: Rect): Promise<void>;
  setSidebarWidth(width: number): Promise<void>;
  toggleSidebar(): Promise<void>;
  enterSplitView(
    tabId1: string,
    tabId2: string,
    direction: 'horizontal' | 'vertical',
  ): Promise<void>;
  exitSplitView(): Promise<void>;

  // Events
  onBoundsChanged: KernelEvent<{ bounds: Rect }>;
}

// === src/kernel/interfaces/navigation.ts ===

interface NavigationManager {
  // For the omnibar: resolve input to URL or search query
  resolveInput(input: string): Promise<{ type: 'url' | 'search'; resolved: string }>;
  getSuggestions(query: string): Promise<Suggestion[]>;
  getSecurityInfo(tabId: string): Promise<SecurityInfo>;
}

// === src/kernel/interfaces/shared.ts ===

interface KernelEvent<T> {
  subscribe(callback: (data: T) => void): () => void; // returns unsubscribe fn
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface FindOpts {
  forward?: boolean;
  matchCase?: boolean;
}

interface FindResult {
  matches: number;
  activeMatch: number;
}

interface Suggestion {
  type: 'history' | 'bookmark' | 'tab' | 'search';
  title: string;
  url: string;
  relevance: number;
}

interface SecurityInfo {
  protocol: 'https' | 'http' | 'file' | 'other';
  certificate?: { issuer: string; validTo: Date };
  isSecure: boolean;
}
```

### IPC Bridge Implementation Pattern

The IPC bridge maps kernel interfaces to Electron's `ipcMain`/`ipcRenderer` channels:

```typescript
// === src/kernel/ipc/bridge.ts (renderer side) ===

// The renderer gets a proxy object that sends IPC for every method call
// and subscribes to IPC events for every KernelEvent.

type KernelAPI = {
  tabs: TabManager;
  workspaces: WorkspaceManager;
  session: SessionManager;
  extensions: ExtensionHost;
  window: WindowManager;
  navigation: NavigationManager;
};

// Exposed via contextBridge.exposeInMainWorld('kernel', proxy)
// UI components access: window.kernel.tabs.createTab({ url: '...' })
```

```typescript
// === src/kernel/ipc/preload.ts ===

// Uses contextBridge to expose a safe, typed API to the renderer.
// Each method call becomes: ipcRenderer.invoke('kernel:<domain>:<method>', ...args)
// Each event subscription becomes: ipcRenderer.on('kernel:<domain>:<event>', callback)
```

This means the renderer process has zero Node.js access and zero Electron imports. The `window.kernel` object is the only bridge.

---

## Component Architecture

### UI Component Tree

```
<bb-app>                              // Root shell, layout manager
├── <bb-sidebar>                      // Left sidebar container
│   ├── <bb-workspace-switcher>       // Workspace list/switcher
│   │   └── <bb-workspace-chip>*      // Individual workspace indicator
│   ├── <bb-pinned-tabs>              // Pinned tabs section
│   │   └── <bb-tab-item>*            // Pinned tab entry
│   ├── <bb-tab-list>                 // Scrollable tab list for active workspace
│   │   └── <bb-tab-item>*            // Regular tab entry (favicon, title, close)
│   ├── <bb-new-tab-button>           // New tab trigger
│   └── <bb-sidebar-footer>           // Extension icons, settings gear
│       └── <bb-extension-button>*    // Per-extension toolbar icon
├── <bb-toolbar>                      // Top toolbar (above content area)
│   ├── <bb-navigation-buttons>       // Back, forward, reload, stop
│   ├── <bb-omnibar>                  // URL/search input
│   │   └── <bb-suggestions-popup>    // Autocomplete dropdown
│   ├── <bb-security-indicator>       // HTTPS lock icon
│   └── <bb-extension-toolbar>        // Extension action buttons (overflow)
├── <bb-content-area>                 // Main content area (managed by WindowManager)
│   └── [WebContentsView]             // Native Electron view, not a Web Component
├── <bb-command-palette>              // ⌘+K overlay (P1)
├── <bb-find-bar>                     // ⌘+F find in page
└── <bb-split-handle>                 // Split view drag handle (P1)
```

### Component Conventions

Every component follows these rules:

1. **Prefix**: All components use `bb-` prefix (Better Browser).
2. **Base class**: Extend `LitElement`.
3. **State**: Components receive state via properties. They do NOT hold authoritative state. The kernel is the source of truth.
4. **Commands**: User actions call `window.kernel.<domain>.<method>()`. Components never mutate state directly.
5. **Events**: Components subscribe to kernel events in `connectedCallback()` and unsubscribe in `disconnectedCallback()`.
6. **Styling**: Each component uses Shadow DOM with scoped CSS. A shared design token CSS file is imported via `adoptedStyleSheets` for colors, spacing, typography.
7. **No framework globals**: No Redux, no stores, no context providers. The kernel IS the store.

### Key Component Details

**`<bb-tab-item>`** -- The most frequently rendered component.

- Properties: `tab: Tab`, `isActive: boolean`, `isDragging: boolean`
- Renders: favicon (16x16 img), title (truncated via CSS `text-overflow`), close button, audio indicator
- Events: click (activate), close-button click (close), drag start/end (reorder)
- Performance: Must handle 100+ instances. Uses `will-change: transform` for drag animations. Tab list uses virtual scrolling if >50 tabs.

**`<bb-omnibar>`** -- The most interactive component.

- Focus management: `⌘+L` focuses. Escape blurs. Enter navigates.
- Debounced input: calls `kernel.navigation.getSuggestions()` after 150ms idle.
- Suggestion rendering: `<bb-suggestions-popup>` positioned absolutely below omnibar.

**`<bb-sidebar>`** -- The layout anchor.

- Resizable: drag handle on right edge, persisted width in SessionManager.
- Collapsible: toggles between full width and 48px icon-only mode.
- Scrollable: `<bb-tab-list>` overflows with scrollbar; pinned tabs do not scroll.

---

## Project Structure

```
better-browser/
├── package.json                     # Root package, scripts, Electron dep
├── tsconfig.json                    # Shared TypeScript config (strict mode)
├── tsconfig.main.json               # Main process TS config (Node target)
├── tsconfig.renderer.json           # Renderer TS config (ESNext target)
├── vite.config.ts                   # Vite config for renderer bundle
├── electron-builder.yml             # Electron Builder config for macOS
├── .eslintrc.cjs                    # ESLint config
├── .prettierrc                      # Prettier config
│
├── src/
│   ├── kernel/                      # UI Kernel — main process
│   │   ├── interfaces/              # Pure TypeScript interface definitions
│   │   │   ├── index.ts             # Re-exports all interfaces
│   │   │   ├── tab.ts               # Tab, TabManager
│   │   │   ├── workspace.ts         # Workspace, WorkspaceManager
│   │   │   ├── session.ts           # SessionManager, SessionState
│   │   │   ├── extension.ts         # ExtensionInfo, ExtensionHost
│   │   │   ├── window.ts            # WindowManager
│   │   │   ├── navigation.ts        # NavigationManager
│   │   │   └── shared.ts            # KernelEvent, Rect, etc.
│   │   │
│   │   ├── impl/                    # Electron implementations of interfaces
│   │   │   ├── electron-tab-manager.ts
│   │   │   ├── electron-workspace-manager.ts
│   │   │   ├── electron-session-manager.ts
│   │   │   ├── electron-extension-host.ts
│   │   │   ├── electron-window-manager.ts
│   │   │   └── electron-navigation-manager.ts
│   │   │
│   │   ├── ipc/                     # IPC bridge infrastructure
│   │   │   ├── channels.ts          # Channel name constants
│   │   │   ├── register-handlers.ts # Main process: registers ipcMain handlers
│   │   │   └── preload.ts           # Preload script: exposes kernel via contextBridge
│   │   │
│   │   └── index.ts                 # Kernel bootstrap: creates impls, registers IPC
│   │
│   ├── ui/                          # Renderer process — Web Components
│   │   ├── index.html               # Root HTML loaded by Electron renderer
│   │   ├── main.ts                  # Entry point: registers components, initializes
│   │   │
│   │   ├── components/              # All Web Components
│   │   │   ├── app/
│   │   │   │   └── bb-app.ts        # Root shell component
│   │   │   ├── sidebar/
│   │   │   │   ├── bb-sidebar.ts
│   │   │   │   ├── bb-tab-list.ts
│   │   │   │   ├── bb-tab-item.ts
│   │   │   │   ├── bb-pinned-tabs.ts
│   │   │   │   ├── bb-workspace-switcher.ts
│   │   │   │   ├── bb-workspace-chip.ts
│   │   │   │   ├── bb-new-tab-button.ts
│   │   │   │   └── bb-sidebar-footer.ts
│   │   │   ├── toolbar/
│   │   │   │   ├── bb-toolbar.ts
│   │   │   │   ├── bb-omnibar.ts
│   │   │   │   ├── bb-suggestions-popup.ts
│   │   │   │   ├── bb-navigation-buttons.ts
│   │   │   │   └── bb-security-indicator.ts
│   │   │   ├── extensions/
│   │   │   │   ├── bb-extension-button.ts
│   │   │   │   └── bb-extension-toolbar.ts
│   │   │   ├── content/
│   │   │   │   └── bb-content-area.ts
│   │   │   ├── overlays/
│   │   │   │   ├── bb-command-palette.ts   # P1
│   │   │   │   ├── bb-find-bar.ts
│   │   │   │   └── bb-split-handle.ts      # P1
│   │   │   └── shared/
│   │   │       ├── bb-icon.ts              # SVG icon component
│   │   │       └── bb-tooltip.ts
│   │   │
│   │   ├── styles/                  # Shared design tokens and base styles
│   │   │   ├── tokens.css           # CSS custom properties (colors, spacing, type)
│   │   │   ├── reset.css            # Minimal CSS reset
│   │   │   └── animations.css       # Shared keyframe animations
│   │   │
│   │   └── lib/                     # Renderer utilities
│   │       ├── kernel-client.ts     # Typed wrapper around window.kernel
│   │       ├── keybindings.ts       # Keyboard shortcut manager
│   │       └── drag-drop.ts         # Drag and drop utilities
│   │
│   ├── main/                        # Electron main process entry
│   │   ├── index.ts                 # App entry: creates window, boots kernel
│   │   ├── window.ts               # BaseWindow + WebContentsView setup
│   │   └── menu.ts                  # macOS native menu bar
│   │
│   └── shared/                      # Code shared between main and renderer
│       └── constants.ts             # App-wide constants (default URLs, etc.)
│
├── tests/
│   ├── kernel/                      # Unit tests for kernel implementations
│   │   ├── tab-manager.test.ts
│   │   ├── workspace-manager.test.ts
│   │   └── session-manager.test.ts
│   ├── ui/                          # Component tests (web-test-runner or vitest)
│   │   ├── bb-tab-item.test.ts
│   │   ├── bb-omnibar.test.ts
│   │   └── bb-sidebar.test.ts
│   └── e2e/                         # End-to-end tests (Playwright)
│       └── basic-browsing.test.ts
│
├── resources/                       # Build resources
│   ├── icons/                       # App icons (icns, png)
│   └── entitlements.mac.plist       # macOS entitlements for signing
│
└── docs/
    ├── browser-architecture-research.md
    └── specs/
        └── 2026-04-07-plan-better-browser-mvp/
            ├── REQUIREMENTS.md
            ├── DESIGN.md            # This document
            └── PLAN.md              # Implementation plan (next)
```

### Build and Dev Scripts

```json
{
  "scripts": {
    "dev": "vite build --watch & electron .",
    "build": "vite build && tsc -p tsconfig.main.json",
    "package": "electron-builder --mac",
    "test": "vitest run",
    "test:e2e": "playwright test",
    "lint": "eslint src/",
    "typecheck": "tsc --noEmit"
  }
}
```

---

## Files Affected

Since this is a greenfield project, all files will be created. The key files that define the architecture are:

- `src/kernel/interfaces/*.ts` -- The UI Kernel contract. These are the most architecturally significant files. Changes here affect everything.
- `src/kernel/ipc/preload.ts` -- The security boundary. This determines what the renderer can access.
- `src/kernel/impl/electron-tab-manager.ts` -- The most complex implementation. Manages WebContentsView lifecycle, navigation events, and tab state.
- `src/ui/components/app/bb-app.ts` -- The root component that wires together sidebar, toolbar, and content area layout.
- `src/main/index.ts` -- The Electron entry point that bootstraps everything.

---

## Open Questions for Implementation

1. **electron-chrome-extensions library selection**: The original `nicedoc/electron-chrome-extensions` may be unmaintained. Evaluate `nicedoc-labs/electron-chrome-extensions` fork vs. `nicedoc-labs/electron-chrome-web-store` vs. building a minimal extension host from scratch. Decision should be made in week 1 based on testing uBlock Origin.

2. **Tab rendering strategy**: Electron's `WebContentsView` vs. `webview` tag. The design assumes `WebContentsView` (managed in main process via `BaseWindow.contentView.addChildView()`). This is the modern, recommended approach but requires careful z-ordering and bounds management.

3. **Session persistence format**: JSON file vs. SQLite. JSON is simpler for MVP. SQLite would be better for history and bookmark search (P1 command palette). Recommend starting with JSON, migrating to SQLite when command palette is implemented.
