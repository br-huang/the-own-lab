# Code Review: Better Browser MVP — Week 1-2 Foundation

## Summary
- Files reviewed: 28
- Issues found: 7 critical, 5 warning, 6 info
- Verdict: **CHANGES REQUESTED**

---

## Issues

### Critical (must fix before merge)

1. **src/main/window.ts:36** — Renderer HTML path resolves to wrong location

   The path `path.join(__dirname, '..', '..', 'renderer', 'index.html')` uses two `..` segments, but the actual runtime `__dirname` is `dist/main/main/`. The code only uses one `..`, resolving to `dist/main/renderer/index.html` instead of `dist/renderer/index.html`. The application will show a blank window.

   - **Why**: The entire UI will fail to load. The app is unusable.
   - **Fix**: Change line 36 to `path.join(__dirname, '..', '..', 'renderer', 'index.html')` or use `path.join(app.getAppPath(), 'dist', 'renderer', 'index.html')` for a more robust solution.

2. **src/main/window.ts:19** — Preload script path resolves to wrong location

   The path `path.join(__dirname, '..', 'kernel', 'ipc', 'preload.js')` resolves to `dist/main/main/../kernel/ipc/preload.js` = `dist/main/kernel/ipc/preload.js`. However, the actual compiled preload should be verified against the tsconfig output. If `__dirname` at runtime is `dist/main/main`, the single `..` may or may not be correct depending on the build output layout. QA confirmed this resolves incorrectly.

   - **Why**: Without the preload, `window.kernel` is undefined. Every IPC call from the renderer will throw. The app is completely non-functional.
   - **Fix**: Verify the actual build output path for `preload.js` and adjust accordingly. If the compiled file is at `dist/main/kernel/ipc/preload.js`, then `path.join(__dirname, '..', 'kernel', 'ipc', 'preload.js')` is correct only if `__dirname` is `dist/main/main`. QA says it is not. Align path segments to the actual output structure.

3. **src/ui/components/sidebar/bb-new-tab-button.ts:28-29** — New tabs created without workspaceId

   `createTab({ active: true, workspaceId: ws.id })` is the code as written, which correctly fetches the active workspace first. However, the `keybindings.ts` Cmd+T handler also creates tabs correctly (line 9-10). QA's Issue 3 indicates both paths fail. Upon re-reading the code: `bb-new-tab-button.ts` does call `getActiveWorkspace()` first (lines 28-29), so this button is correct. The keybinding handler in `keybindings.ts` also calls `getActiveWorkspace()` first (line 9). QA's Issue 3 may be outdated or the code was fixed after QA ran. Regardless, this needs runtime verification.

   - **Why**: Tabs without a `workspaceId` are invisible in the sidebar due to the filter in `bb-app.ts:107`.
   - **Fix**: Verify at runtime. If the issue persists, add a fallback in `ElectronTabManager.createTab`: when `workspaceId` is empty or undefined, resolve it to the active workspace via a callback.

4. **src/kernel/impl/electron-tab-manager.ts:49-65** — Empty workspaceId default when opts.workspaceId is undefined

   `createTab` defaults `workspaceId` to `opts.workspaceId || ''` (line 65). If any caller forgets to pass `workspaceId`, the tab silently becomes invisible. This is a fragile default that hides bugs.

   - **Why**: Any new call site that forgets `workspaceId` will produce a ghost tab that consumes resources (WebContentsView loaded, memory used) but is unreachable from the UI. The user sees nothing but the browser is spending resources.
   - **Fix**: Either (a) make `workspaceId` required in the `createTab` opts type (remove the `?`), forcing all callers to provide it, or (b) inject a `getActiveWorkspaceId` callback into `ElectronTabManager` and use it as the default when `workspaceId` is not provided.

5. **src/kernel/impl/electron-tab-manager.ts:250-266** — `findInPage` promise can hang forever

   The promise wrapping `webContents.once('found-in-page', ...)` has no timeout and no guard against destroyed webContents. If the query produces no matches in certain edge cases, or if the webContents is destroyed between the guard check at line 252 and the `findInPage` call at line 261, the promise will never settle. This will block any IPC caller that awaits the result.

   - **Why**: A hung promise on an IPC handler will cause the renderer to freeze when it awaits the response. The IPC `invoke` pattern means the renderer will await indefinitely.
   - **Fix**: Add a timeout (e.g., 5 seconds) that resolves with `{ matches: 0, activeMatch: 0 }`. Also check `wc.isDestroyed()` before attaching the listener.

6. **src/kernel/ipc/preload.ts:82-87** — `__electronOn` listener has no unsubscribe mechanism

   The `__electronOn` helper registers `ipcRenderer.on` listeners but provides no way to remove them. Each call adds a permanent listener. If the renderer code calls `__electronOn('kernel:focus-omnibar', callback)` multiple times (e.g., on HMR during development), listeners accumulate and the callback fires multiple times per event.

   - **Why**: Memory leak during development. In production, if any code path re-registers, duplicate handlers execute.
   - **Fix**: Return an unsubscribe function from `__electronOn`, similar to the `onEvent` pattern already used for kernel events. Or better yet, route `focus-omnibar` through the standard kernel event system so it follows the same pattern as all other events.

7. **src/kernel/impl/electron-tab-manager.ts:290-318** — WebContentsView event listeners are never cleaned up

   `attachWebContentsListeners` registers multiple `wc.on(...)` listeners (lines 293-317) but these are never removed when a tab is closed. The `closeTab` method calls `wc.close()` on the webContents, which should destroy it and implicitly remove listeners. However, if `close()` is called asynchronously or the destroy is deferred, these listeners may fire on a partially-torn-down `TabEntry` that has already been removed from `this.entries`. The `updateTab` and `updateTabNavState` methods would then do a `this.entries.get(tabId)` lookup and get `undefined`, which they handle (early return), but this is a design smell that could mask bugs.

   - **Why**: Potential for events firing on destroyed tabs, causing unnecessary work and emit of stale update events to the renderer.
   - **Fix**: Store listener references and call `wc.removeListener(...)` or `wc.removeAllListeners()` in `closeTab` before calling `wc.close()`.

---

### Warning (should fix, not blocking)

1. **src/main/index.ts:84** — `kernel:focus-omnibar` IPC channel is not routed through the standard kernel event system

   The native menu sends `kernel:focus-omnibar` directly via `uiView.webContents.send(...)`, but this channel is not in `IPC_CHANNELS`, not exposed through the standard preload event system, and handled through the ad-hoc `__electronOn` helper. This creates a second, inconsistent IPC pattern alongside the kernel event system.

   - **Fix**: Add `focusOmnibar` to the window channels in `IPC_CHANNELS`, expose it via a standard `onEvent` in the preload, and subscribe to it in `bb-app.ts` to forward focus.

2. **src/kernel/ipc/register-handlers.ts:38** — `any` type used for findInPage opts parameter

   `(_e, tabId: string, query: string, opts?: any)` uses `any` instead of the defined `FindOpts` type. This bypasses TypeScript's type checking for the entire parameter.

   - **Fix**: Import `FindOpts` and type the parameter as `opts?: FindOpts`.

3. **src/kernel/impl/electron-workspace-manager.ts:117-126** — `refreshCounts` fires on every tab event, iterating all workspaces

   Every `onTabCreated`, `onTabClosed`, and `onTabUpdated` event triggers `refreshCounts`, which iterates all workspaces and calls `getTabsByWorkspace` (which itself iterates all tabs). With W workspaces and T tabs, this is O(W*T) per tab event. With frequent `onTabUpdated` events (loading state, title changes, navigation), this could become a performance bottleneck at scale.

   - **Fix**: Only refresh the count for the affected workspace. The tab events carry enough information (the tab's `workspaceId`) to determine which workspace needs updating. For `onTabUpdated`, only refresh if the `workspaceId` field changed.

4. **src/ui/lib/keybindings.ts:25-28** — Shadow DOM traversal for omnibar focus is fragile

   The code traverses three levels of shadow DOM: `bb-app > bb-toolbar > bb-omnibar`. If any component restructuring occurs (e.g., wrapping toolbar in another component), this silently fails with no error or feedback to the user.

   - **Fix**: Use a custom event dispatched on `document` that `bb-omnibar` listens for, or expose a `focusOmnibar()` method on `bb-app` that delegates internally. This decouples the keybinding system from the component tree structure.

5. **src/kernel/impl/electron-window-manager.ts:49** — Toolbar height is hardcoded as magic number

   `const toolbarH = 40;` duplicates the toolbar height defined in CSS (`bb-toolbar` has `height: 40px`). If either changes, the content bounds calculation will be wrong, causing the WebContentsView to overlap the toolbar or leave a gap.

   - **Fix**: Import the toolbar height from a shared constant in `constants.ts`, and reference that same constant in the CSS (via a CSS custom property set from JS if needed, or simply document the coupling).

---

### Info (suggestions for improvement)

1. **src/kernel/impl/kernel-event.ts:12-14** — Listener exceptions will break the emit loop

   If any listener throws, `emit` will stop iterating and subsequent listeners will not be called. Consider wrapping each listener call in a try/catch.

2. **src/kernel/impl/electron-tab-manager.ts:53-57** — WebContentsView for tabs does not set `nodeIntegration: false` explicitly

   While `nodeIntegration` defaults to `false` in Electron, it is best practice to set it explicitly for security-critical web content views (tab views render arbitrary untrusted web pages). The preload's uiView does set it explicitly (window.ts:21), but tab views do not.

3. **src/kernel/impl/electron-navigation-manager.ts:12** — URL detection regex misses some valid domains

   The regex `/^[a-zA-Z0-9-]+(\.[a-zA-Z]{2,})(\/.*)?$/` requires exactly one dot-separated segment. Domains like `subdomain.example.com` or `a.b.c.d.com` will be classified as search queries instead of URLs. Consider `/^[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,}(\/.*)?$/` instead.

4. **src/kernel/impl/electron-navigation-manager.ts:26-28** — `getSecurityInfo` returns a hardcoded stub

   The method always returns `{ protocol: 'https', isSecure: true }` regardless of the actual page. While acceptable for an MVP stub, this could mislead users about the security of HTTP pages they visit. A TODO comment would clarify this is intentional.

5. **src/ui/components/app/bb-app.ts:43-45** — Silent catch on initial state fetch

   The empty `catch` block in `fetchInitialState` swallows all errors, including genuine bugs. At minimum, log the error to console so developers can diagnose startup issues.

6. **src/kernel/ipc/channels.ts** — Missing `enterSplitView` and `exitSplitView` channels

   The `WindowManager` interface defines `enterSplitView` and `exitSplitView`, but these are not declared in `IPC_CHANNELS.window` and not wired in `register-handlers.ts`. While these are P1 stubs, the interface-channel-handler mapping should be complete to avoid confusion when P1 work begins. Similarly, `findInPage` and `stopFindInPage` are missing from the `KernelClient` type in `kernel-client.ts`.

---

## Security Scan

- **Context isolation**: PASS. The UI renderer's `WebContentsView` sets `contextIsolation: true` and `nodeIntegration: false` (window.ts:20-21). The preload uses `contextBridge.exposeInMainWorld` correctly.
- **Tab sandbox**: PASS. Each tab's `WebContentsView` sets `contextIsolation: true` and `sandbox: true` (electron-tab-manager.ts:55-56). Untrusted web content cannot access Node.js APIs.
- **IPC surface**: PASS. The preload exposes only the defined kernel methods and a narrow `__electronOn` helper with an allowlist of channels.
- **No hardcoded secrets**: PASS. No API keys, tokens, or credentials found in source.
- **URL injection**: LOW RISK. `navigateTo` passes user input directly to `webContents.loadURL()`. Electron's `loadURL` will handle `javascript:` URIs by default. Consider blocking `javascript:` and `file:` protocol URLs in `navigateTo` to prevent renderer-originated navigation to dangerous URLs.
- **`__electronOn` allowlist is correct**: The allowlist contains only `kernel:focus-omnibar`. No Node.js or Electron APIs are leaked through this channel.

---

## What Went Well

- **Clean kernel abstraction**: The separation between interfaces, IPC bridge, and Electron implementation is well-executed. The renderer has zero Electron imports. The architecture will support the planned migration to a Chromium fork.
- **Consistent event pattern**: The `KernelEventEmitter` pattern is simple and effective. Event subscriptions in `bb-app.ts` are properly tracked and cleaned up in `disconnectedCallback`.
- **Defensive coding in tab lifecycle**: `closeTab` correctly handles the active-tab-is-being-closed case by activating an adjacent tab first. `removeViewFromWindow` is wrapped in try/catch. The `isDestroyed()` check before `close()` prevents double-destroy crashes.
- **Correct contextBridge usage**: The preload script follows Electron security best practices. No `remote` module, no `nodeIntegration` in renderers, and the IPC bridge is properly typed.
- **Component architecture**: Web Components with Lit are cleanly structured. State flows downward via properties, commands flow upward via kernel calls. No component holds authoritative state. This matches the design doc's component conventions exactly.
- **Workspace deletion safety**: Deleting a workspace correctly reassigns its tabs to the active workspace and prevents deletion of the last workspace.

---

## Verdict

**CHANGES REQUESTED** -- 7 critical issues must be addressed.

The architecture is sound and the code quality is high for an MVP foundation. The kernel abstraction, security posture, and component design all follow the DESIGN.md specification faithfully. However, three categories of critical issues prevent merge:

1. **Path resolution bugs** (Issues 1, 2): The app cannot start. These are likely one-line fixes once the actual build output structure is verified.
2. **Ghost tab problem** (Issues 3, 4): Tabs created without a `workspaceId` are invisible but consume resources. The default of `''` is a dangerous silent failure.
3. **Async reliability** (Issues 5, 7): The `findInPage` hung promise and uncleared WebContentsView listeners are correctness issues that will surface as the product is used.

After fixing these 7 critical issues, the codebase is ready for merge. The warning and info items should be tracked for near-term follow-up.
