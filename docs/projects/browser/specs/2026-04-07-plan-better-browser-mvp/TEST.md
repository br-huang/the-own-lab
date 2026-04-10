# Test Report: Better Browser MVP — Week 1-2 Foundation

**Date**: 2026-04-07
**Scope**: Week 1-2 Foundation (Steps 1-36 from PLAN.md)

---

## Summary

- Total automated tests: 0 (no test files exist yet)
- Passed: N/A
- Failed: N/A
- Build: PASS (vite build + tsc -p tsconfig.main.json both succeed cleanly)
- TypeScript errors: 0 in both tsconfigs
- Source files found: 38 (matches expectation)
- Critical bugs found: 3
- Warning-level issues: 3

---

## Acceptance Criteria Verification

| Criterion                                        | Status             | Evidence                                                                                                                                                                                                                                        |
| ------------------------------------------------ | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| App opens a window with dark sidebar on the left | PASS               | `window.ts` creates a `BaseWindow`, `bb-sidebar.ts` renders with `--bb-bg-secondary` dark background at fixed width                                                                                                                             |
| Toolbar with omnibar at the top of content area  | PASS               | `bb-toolbar.ts` renders `bb-navigation-buttons` + `bb-omnibar`; height is 40px; positioned above `bb-content-area` in `bb-app.ts`                                                                                                               |
| Default tab loads a webpage                      | FAIL               | App creates a tab and calls `loadURL(DEFAULT_URL)` — but the tab will not appear because `window.ts` resolves the renderer HTML to the wrong path (see Issue 1) and the preload resolves to the wrong path (see Issue 2). The app cannot start. |
| Tab appears in the sidebar                       | FAIL               | Blocked by Issues 1 and 2; additionally, tabs created from the UI have an empty `workspaceId` and are filtered out by `bb-app.ts` (see Issue 3)                                                                                                 |
| "+ New Tab" creates a new tab                    | FAIL               | `bb-new-tab-button.ts` calls `createTab({ active: true })` without `workspaceId`, so new tabs would not appear in the active workspace's sidebar list (Issue 3)                                                                                 |
| Clicking a tab switches to it                    | PASS (code review) | `bb-tab-item.ts` calls `window.kernel.tabs.activateTab(tab.id)`; `ElectronTabManager.activateTab` adds the `WebContentsView` to the window and sets its bounds                                                                                  |
| Omnibar navigates URLs and searches              | PASS (code review) | `bb-omnibar.ts` handles `Enter` key, calls `navigation.resolveInput`, then `tabs.navigateTo`; `ElectronNavigationManager.resolveInput` correctly distinguishes URLs from search queries                                                         |
| Cmd+T shortcut creates a new tab                 | FAIL               | `keybindings.ts` Cmd+T calls `createTab({ active: true })` without `workspaceId`; new tab will have empty workspaceId and not appear in sidebar (Issue 3)                                                                                       |
| Cmd+W shortcut closes active tab                 | PASS (code review) | `keybindings.ts` Cmd+W retrieves active tab and calls `closeTab`                                                                                                                                                                                |
| Cmd+L shortcut focuses omnibar                   | PARTIAL            | `keybindings.ts` Cmd+L uses deep shadow DOM traversal which is fragile but functional. The native menu's "Focus Address Bar" sends `kernel:focus-omnibar` IPC but no renderer listener exists (Issue 4).                                        |
| Cmd+R shortcut reloads tab                       | PASS (code review) | `keybindings.ts` Cmd+R retrieves active tab and calls `reload`; native menu also wires `CmdOrCtrl+R` to `handlers.onReload`                                                                                                                     |
| Default workspace chip visible                   | FAIL               | Workspace chip would not render because the app cannot start (Issues 1 and 2)                                                                                                                                                                   |

---

## Build Results

```
vite v6.4.2 building for production...
transforming...
✓ 35 modules transformed.
dist/renderer/index.html                  0.50 kB
dist/renderer/assets/index-DPfbi5Jz.css  1.19 kB
dist/renderer/assets/index-C7gp_GC7.js  35.76 kB
✓ built in 132ms

tsc -p tsconfig.main.json: 0 errors
tsc -p tsconfig.renderer.json --noEmit: 0 errors
```

---

## Test Suite Results

No test files exist. The `tests/` directory has the correct subdirectories (`kernel/`, `ui/`, `e2e/`) but all are empty.

Additionally, `npm test` fails with exit code 1 and the message "No test files found" because vitest inherits the `vite.config.ts` `root: src/ui` setting and only scans that directory for test files. Even if test files were placed in `tests/`, vitest would not find them without a separate `vitest.config.ts` (Issue 5).

---

## Edge Cases Tested (Code Review)

- **Tab close with no remaining tabs**: `closeTab` sets `activeTabId = null` rather than crashing. PASS.
- **Tab close while active**: Activates the next or previous tab before removing. PASS.
- **Close last workspace**: `deleteWorkspace` returns early if `workspaces.size <= 1`. PASS.
- **Activating already-active tab**: `activateTab` returns early if `previousTabId === tabId`. PASS.
- **Activating already-active workspace**: `activateWorkspace` returns early if `prev === id`. PASS.
- **WebContentsView removal when not a child**: Wrapped in try/catch — will not crash. PASS.
- **Empty omnibar submission**: `bb-omnibar.ts` guards with `if (\!input) return`. PASS.
- **Tab with no title or URL**: `bb-tab-item.ts` falls back to "New Tab". PASS.
- **Broken favicon image**: `@error` handler hides the image element. PASS.
- **Tab created without workspaceId**: Defaults to `''`, which causes the tab to be invisible in any workspace's sidebar (Issue 3). WARNING.
- **findInPage promise never resolved**: If the `found-in-page` event never fires (e.g., empty query, already destroyed webContents), the promise in `ElectronTabManager.findInPage` will never settle. This is a potential memory/async leak (Issue 6).
- **Cmd+L shadow DOM query fragility**: `keybindings.ts` walks `bb-app > bb-toolbar > bb-omnibar` shadow roots. If component nesting changes, this silently fails.

---

## Issues Found

### Issue 1 — CRITICAL: Renderer HTML path resolves to wrong location

- **Severity**: critical
- **Description**: In `src/main/window.ts` line 36, the renderer HTML is loaded with:
  ```
  path.join(__dirname, '..', 'renderer', 'index.html')
  ```
  At runtime, `window.js` is at `dist/main/main/window.js`, so `__dirname` is `dist/main/main`. The resolved path becomes `dist/main/renderer/index.html`, which does not exist. The actual build output is at `dist/renderer/index.html`. The app window will show a blank/error screen instead of the UI.
- **Reproduction**: Run `node -e "const path = require('path'); console.log(path.join('dist/main/main', '..', 'renderer', 'index.html'))"` — outputs `dist/main/renderer/index.html`. The actual file is at `dist/renderer/index.html`.
- **Suggestion**: Change the path to `path.join(__dirname, '..', '..', 'renderer', 'index.html')` or use an app-relative path such as `path.join(app.getAppPath(), 'dist', 'renderer', 'index.html')`.

---

### Issue 2 — CRITICAL: Preload script path resolves to wrong location

- **Severity**: critical
- **Description**: In `src/main/window.ts` line 19, the preload is loaded with:
  ```
  path.join(__dirname, 'kernel', 'ipc', 'preload.js')
  ```
  With `__dirname` being `dist/main/main`, this resolves to `dist/main/main/kernel/ipc/preload.js`. The actual compiled preload is at `dist/main/kernel/ipc/preload.js`. The preload will fail to load, meaning `window.kernel` will be undefined in the renderer and the entire IPC bridge will be non-functional.
- **Reproduction**: Check `dist/main/main/kernel/` — directory does not exist.
- **Suggestion**: Change the path to `path.join(__dirname, '..', 'kernel', 'ipc', 'preload.js')`. This resolves to `dist/main/kernel/ipc/preload.js`, which is the correct location.

---

### Issue 3 — CRITICAL: New tabs created from UI have no workspaceId

- **Severity**: critical
- **Description**: Both `bb-new-tab-button.ts` and the Cmd+T keybinding in `keybindings.ts` call `window.kernel.tabs.createTab({ active: true })` without specifying a `workspaceId`. The `ElectronTabManager.createTab` defaults `workspaceId` to `''`. In `bb-app.ts` line 107, tabs are filtered to only display those whose `workspaceId === this.activeWorkspaceId`. Since the active workspace has a UUID as its ID, tabs with `workspaceId: ''` are filtered out and never appear in the sidebar.

  The native menu (Cmd+T shortcut via macOS menu bar) correctly passes the active workspace ID (line 71-73 in `index.ts`), so that path works. The renderer-side paths do not.

- **Reproduction**: Click "+ New Tab" or press Cmd+T — the tab will be created (WebContentsView starts loading) but will not appear in the sidebar.
- **Suggestion**: Both `bb-new-tab-button.ts` and `keybindings.ts` should first call `window.kernel.workspaces.getActiveWorkspace()` to retrieve the active workspace ID, then pass it to `createTab`. Alternatively, `ElectronTabManager.createTab` could be modified to accept a sentinel value (e.g., `workspaceId: 'active'`) that auto-resolves to the current active workspace, though this would require coupling the two managers.

---

### Issue 4 — WARNING: `kernel:focus-omnibar` IPC event has no renderer listener

- **Severity**: warning
- **Description**: `src/main/index.ts` line 84 sends `kernel:focus-omnibar` to the renderer when "Focus Address Bar" is triggered from the native macOS menu. No component in the renderer subscribes to this event. The channel is also not declared in `IPC_CHANNELS` or exposed through the preload. The menu item "Focus Address Bar" will silently do nothing.
- **Suggestion**: Add `kernel:focus-omnibar` to `IPC_CHANNELS`, expose an `onFocusOmnibar` event via the preload, and subscribe to it in `bb-app.ts` to forward focus to `bb-omnibar`. Alternatively, use the existing approach in `keybindings.ts` for consistency.

---

### Issue 5 — WARNING: Test runner misconfigured, no tests run

- **Severity**: warning
- **Description**: `npm test` always exits with code 1 ("No test files found"). This is because vitest reads `vite.config.ts` which sets `root: resolve(__dirname, 'src/ui')`. Vitest inherits this root and scans only `src/ui/` for test files. The `tests/` directory (which contains empty `kernel/`, `ui/`, and `e2e/` subdirectories) is outside this root and is never scanned. Additionally, no test files have been written yet.
- **Suggestion**: Create a `vitest.config.ts` at the project root that explicitly sets `root: '.'` and `include: ['tests/**/*.{test,spec}.ts']`. This decouples the test runner configuration from the renderer build configuration.

---

### Issue 6 — WARNING: `findInPage` promise can never settle

- **Severity**: warning
- **Description**: `ElectronTabManager.findInPage` creates a `Promise` that resolves inside a `webContents.once('found-in-page', ...)` handler. If `findInPage` is called with an empty string, Electron may not fire the `found-in-page` event, leaving the promise permanently unresolved. Similarly, if the WebContentsView is destroyed before the event fires, the handler is orphaned and the caller will await forever.
- **Suggestion**: Add a timeout fallback (e.g., `setTimeout(() => resolve({ matches: 0, activeMatch: 0 }), 5000)`) or validate the query string before calling `webContents.findInPage`. Guard against destroyed webContents before attaching the listener.

---

## Verdict

**FAIL**

Three critical issues prevent the application from running correctly:

1. **Issue 1** — The renderer HTML path is wrong: the UI will not load.
2. **Issue 2** — The preload script path is wrong: `window.kernel` will be undefined and all IPC will fail.
3. **Issue 3** — New tabs created from the renderer UI have no `workspaceId` and will not appear in the sidebar.

Issues 1 and 2 together mean the application cannot reach a usable state at all. All Week 1-2 capability criteria that require the app to actually run are therefore blocked.

**Required fixes before re-verification:**

- Fix the renderer HTML path in `src/main/window.ts` (one directory level up)
- Fix the preload script path in `src/main/window.ts` (one directory level up)
- Fix `bb-new-tab-button.ts` and `keybindings.ts` Cmd+T to pass the active workspace ID
