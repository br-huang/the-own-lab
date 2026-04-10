# ADR-001: Better Browser MVP Architecture — Electron + Web Components with UI Kernel Abstraction

## Status

Proposed

## Context

We are building an open-source browser with Arc-inspired UX (vertical sidebar, workspaces) and future AI/Agent capabilities. The MVP must validate the UX concept on macOS within 6-8 weeks by a solo developer.

The central tension: the user requires >90% Chrome Extension compatibility, but wants rapid MVP delivery. These pull in opposite directions — full extension support requires Chromium-level integration (months of work), while fast delivery favors Electron (weeks).

Industry research shows browser UI can be built with:

1. Native C++/Swift (Arc, Brave, Safari) — best perf, slowest dev
2. React SPA (Vivaldi, Edge v1) — fastest dev, proven but Edge abandoned it for Web Components
3. Web Components (Edge v2, Opera One) — Edge proved 42-76% faster than React
4. Electron (Min Browser) — fastest to prototype, limited extension support

## Decision

**Use Electron with Web Components (Lit) for the MVP, with a UI Kernel abstraction layer that enables future migration to a Chromium fork.**

Specifically:

- **Runtime**: Electron 34+ (Chromium 134+)
- **UI framework**: Web Components via Lit 3.x (not React)
- **Extension support**: electron-chrome-extensions library (~70-80% compat)
- **Architecture**: UI Kernel interfaces in main process, exposed to renderer via typed IPC bridge
- **Workspaces**: Shallow isolation (UI-level tab filtering, shared cookies/sessions)
- **Platform**: macOS only for MVP

The UI Kernel is the key architectural bet: by defining engine-agnostic interfaces (TabManager, WorkspaceManager, SessionManager, ExtensionHost, WindowManager, NavigationManager), the entire UI layer can be reused when migrating to a Chromium fork in Phase 3+.

## Consequences

### Positive

- Working browser in 6-8 weeks to validate UX hypothesis
- Web Components + Lit gives modern DX with near-native performance (5KB runtime)
- UI Kernel abstraction future-proofs the UI investment — no throwaway code
- Electron ecosystem provides mature tooling (electron-builder, auto-update, DevTools)
- TypeScript strict mode + clear interface boundaries improve code quality from day one
- Edge's lesson applied: Web Components outperform React for browser UI
- Solo developer can maintain and iterate without C++/Mojo expertise

### Negative

- Extension compatibility capped at ~70-80% (vs 100% with Chromium fork)
- Memory baseline ~250-300MB (vs ~100-150MB for native Chromium browser)
- Electron's process model means each tab is a full renderer process with overhead
- Cannot do deep workspace isolation (separate sessions) without significant Electron partition work
- electron-chrome-extensions library may be unmaintained or have critical gaps

### Risks

- **Extension compatibility gap**: uBlock Origin or password managers may not work. **Mitigation**: Test critical extensions in week 1. Define "escape hatch" — headless Chrome for extension execution only, controlled via CDP.
- **Electron memory with many tabs**: 30+ tabs may consume >3GB. **Mitigation**: Implement tab suspension for background tabs. Set MVP target at 20 active tabs.
- **WebContentsView instability**: API is newer than deprecated BrowserView. **Mitigation**: Pin Electron version. WebContentsView is the official replacement with stable API surface.
- **Lit lock-in**: If Lit development stalls. **Mitigation**: Lit compiles to standard Web Components. Migration to vanilla or another library is straightforward.
- **electron-chrome-extensions library abandonment**: **Mitigation**: Fork and maintain. The library is ~5K LoC, manageable for a solo developer.

## Alternatives Considered

| Option                             | Pros                                                              | Cons                                                                                                                           | Rejected Because                                                            |
| ---------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| **Chromium fork + Web Components** | 100% extension compat, best perf, cleanest kernel boundary (Mojo) | 16-24 week timeline, C++ expertise required, 50GB+ build, complex rebase on updates                                            | Too slow for solo MVP; UX hypothesis untested for months                    |
| **Electron + Chrome via CDP**      | 100% extension compat, Electron DX for UI                         | Two processes (Electron + Chrome), display integration unsolved, double memory, CDP latency                                    | No viable solution for showing Chrome-rendered pages inside Electron window |
| **Electron + React**               | Fastest UI development, largest ecosystem                         | Edge proved React 42-76% slower than Web Components for browser UI; framework overhead unnecessary                             | Edge's lesson: React is wrong choice for browser UI                         |
| **Tauri v2 + WebView2/WebKit**     | Lighter than Electron (~10MB vs ~150MB), Rust backend             | No Chrome extension support at all, webview API too limited for browser building, Tauri maintainers explicitly warn against it | Extension support is non-negotiable; webview API insufficient               |
| **Firefox/Gecko fork (like Zen)**  | Firefox extension ecosystem, proven by Zen                        | Different extension ecosystem (not Chrome), XUL/CSS approach limits UI innovation, smaller community                           | User specifically wants Chrome Web Store compatibility                      |

## Implementation Roadmap

1. **Week 1-2: Foundation** — Electron shell, UI Kernel interfaces, IPC bridge, basic window with WebContentsView, Lit component setup, first tab renders a webpage
2. **Week 3-4: Core Browser** — Vertical sidebar, tab CRUD, omnibar with navigation + search, keyboard shortcuts, pinned tabs
3. **Week 5-6: Workspaces + Extensions** — Workspace create/switch/delete, tab filtering by workspace, electron-chrome-extensions integration, test critical extensions
4. **Week 7-8: Polish + Session** — Session persistence (save/restore tabs on restart), sidebar resize/collapse, find in page, macOS menu bar, bug fixes, performance tuning

## Dependencies

- **Electron 34+**: Stable, LTS. Provides WebContentsView API.
- **Lit 3.x**: Stable, Google-backed. Compiles to standard Web Components.
- **electron-chrome-extensions**: Community library. Risk: maintenance status. Mitigation: fork if needed.
- **Vite 6.x**: Build tool. Stable, fast HMR.
- **electron-builder**: Packaging for macOS .dmg. Mature.
- **TypeScript 5.x**: Language. Stable.
