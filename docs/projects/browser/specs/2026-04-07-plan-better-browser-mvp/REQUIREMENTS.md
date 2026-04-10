# Better Browser MVP — Requirements

## 1. Project Overview

Build an open-source Browser Kernel with Arc-inspired UX, focused on vertical sidebar navigation and workspace-based tab management. The MVP validates the core browser experience before adding AI/Agent capabilities in later phases.

### Goals

- Prove that a custom browser shell with Arc-like UX is viable
- Deliver a usable daily-driver browser on macOS
- Establish a "UI Kernel" abstraction layer for future engine migration
- Achieve broad Chrome Extension compatibility

### Non-Goals (MVP)

- AI/Agent integration (deferred to Phase 2)
- Windows/Linux support (post-stabilization)
- Deep workspace isolation (post-MVP)
- Sync across devices

---

## 2. User Stories

| ID    | Story                                                                                                      | Priority |
| ----- | ---------------------------------------------------------------------------------------------------------- | -------- |
| US-01 | As a user, I can browse the web with a vertical sidebar instead of horizontal tabs                         | P0       |
| US-02 | As a user, I can create/rename/delete workspaces to organize my tabs by context (Work, Personal, Research) | P0       |
| US-03 | As a user, I can switch between workspaces and only see the tabs belonging to that workspace               | P0       |
| US-04 | As a user, I can pin frequently used tabs to the top of the sidebar                                        | P0       |
| US-05 | As a user, I can install Chrome extensions from the Chrome Web Store and they work correctly               | P0       |
| US-06 | As a user, I can use keyboard shortcuts (⌘+T new tab, ⌘+L address bar, ⌘+W close tab) as expected          | P0       |
| US-07 | As a user, I can use the address bar for both URL navigation and search                                    | P0       |
| US-08 | As a user, I can drag tabs to reorder them within the sidebar                                              | P1       |
| US-09 | As a user, I can split my view to see two pages side by side                                               | P1       |
| US-10 | As a user, I can use a command palette (⌘+K) to search tabs, bookmarks, and history                        | P1       |
| US-11 | As a user, I can customize the sidebar width and collapse it                                               | P1       |
| US-12 | As a user, I can import bookmarks and settings from Chrome                                                 | P2       |
| US-13 | As a user, I can use picture-in-picture for videos while browsing                                          | P2       |

---

## 3. Functional Requirements

### P0 — Must Have

#### FR-01: Vertical Sidebar Tab Management

- Tab list displayed vertically in a left sidebar
- Each tab shows: favicon, title (truncated), close button
- Active tab visually highlighted
- New tab button at sidebar top/bottom
- Tab count indicator per workspace

#### FR-02: Workspace System (Shallow Isolation)

- Create, rename, delete, reorder workspaces
- Each workspace maintains its own list of tabs
- Switching workspace shows only that workspace's tabs
- Visual indicator of current workspace (color/icon)
- Tabs share cookies/session/storage across workspaces (shallow model)
- Default workspace for new tabs

#### FR-03: Core Browser Navigation

- Address bar with URL input and search (Google/DuckDuckGo)
- Back, forward, reload, stop navigation controls
- HTTPS indicator and security status
- Page loading progress indicator
- Find in page (⌘+F)
- Zoom in/out (⌘+/⌘-)

#### FR-04: Chrome Extension Support

- Install extensions from Chrome Web Store
- Support Manifest V3 extensions
- Extension toolbar area with icons
- Extension popup windows
- Content scripts injection
- Background service workers
- Target: >90% of popular extensions work correctly

#### FR-05: Tab Features

- Pin tabs (persist across sessions)
- Duplicate tab
- Mute tab audio
- Close tab / close other tabs / close tabs to the right

#### FR-06: Keyboard Shortcuts

- Standard browser shortcuts (⌘+T, ⌘+W, ⌘+L, ⌘+R, etc.)
- Workspace switching (⌘+1-9 or custom)
- Tab navigation (⌘+Option+←/→)

### P1 — Should Have

#### FR-07: Command Palette

- ⌘+K to open
- Search across: open tabs, bookmarks, history
- Fuzzy matching
- Recent items prioritized

#### FR-08: Split View

- Drag tab to split horizontally or vertically
- Resize split panes
- Maximum 2 panes for MVP

#### FR-09: Tab Drag & Drop

- Reorder tabs within sidebar
- Move tabs between workspaces via drag
- Visual drop target indicators

#### FR-10: Sidebar Customization

- Adjustable sidebar width
- Collapse/expand sidebar (⌘+S or toggle)
- Compact mode (favicons only)

### P2 — Nice to Have

#### FR-11: Data Import

- Import bookmarks from Chrome/Safari
- Import history from Chrome

#### FR-12: Picture-in-Picture

- Float video from any tab
- Resize and reposition PiP window

#### FR-13: Tab Search

- Filter tabs by title/URL within sidebar

---

## 4. Non-Functional Requirements

### NFR-01: Performance

- Cold start to usable browser: < 3 seconds
- Tab switching latency: < 100ms
- Workspace switching: < 200ms
- Memory baseline (0 tabs): < 200MB
- Memory per tab: < 80MB average
- Smooth 60fps sidebar animations

### NFR-02: Architecture

- UI Kernel abstraction layer decoupling UI from engine
- Defined interfaces: TabManager, SessionManager, ExtensionHost, WindowManager
- UI built with Web Components (no React/Vue/Angular)
- CSS animations preferred over JS animations
- Modular component architecture

### NFR-03: Platform

- macOS 13+ (Ventura and later)
- Apple Silicon (arm64) and Intel (x64) builds
- Retina display support
- Native macOS menu bar integration
- System dark/light mode support

### NFR-04: Extension Compatibility

- > 90% of top 100 Chrome Web Store extensions functional
- Manifest V3 full support
- Critical extensions must work: uBlock Origin, 1Password/Bitwarden, React DevTools, Dark Reader

### NFR-05: Code Quality

- TypeScript strict mode
- Component-based architecture with clear boundaries
- Automated tests for core kernel interfaces
- CI pipeline for macOS builds

---

## 5. Success Criteria

The MVP is considered successful if:

1. **Usable as a secondary browser** — Can browse any website, manage tabs in sidebar, switch workspaces
2. **Extension compatibility** — uBlock Origin, a password manager, and 3+ other popular extensions work
3. **Performance** — Cold start < 3s, tab switch < 100ms, no janky animations
4. **Architecture validated** — UI Kernel interfaces are defined and the UI layer does not directly call Electron APIs
5. **Stable on macOS** — No crashes during normal 1-hour browsing sessions

---

## 6. Out of Scope (MVP)

- AI/Agent features (page summarization, Q&A, browser automation)
- Deep workspace isolation (separate cookies/sessions per workspace)
- Windows and Linux builds
- Cross-device sync
- Built-in ad blocking (rely on uBlock Origin extension)
- Tab sharing / collaboration features
- Custom themes / theme store
- Developer tools enhancements
- Mobile companion app

---

## 7. Dependencies & Risks

### Dependencies

| Dependency                 | Purpose                       | Risk Level                                 |
| -------------------------- | ----------------------------- | ------------------------------------------ |
| Electron                   | App shell and webview runtime | Low — mature, well-documented              |
| electron-chrome-extensions | Chrome Extension API bridge   | **HIGH** — may not meet >90% compat target |
| Chromium (via Electron)    | Rendering engine              | Low                                        |
| Web Components API         | UI framework                  | Low — native browser API                   |

### Risks

| Risk                                                  | Impact                        | Likelihood | Mitigation                                                                |
| ----------------------------------------------------- | ----------------------------- | ---------- | ------------------------------------------------------------------------- |
| Extension compatibility gap on Electron               | HIGH — core requirement unmet | HIGH       | Evaluate Chromium fork path in Design phase; define fallback criteria     |
| Electron memory overhead with many tabs               | MEDIUM                        | MEDIUM     | Implement tab suspension for background tabs; set 20-tab target for MVP   |
| Web Components developer experience slower than React | LOW                           | MEDIUM     | Build small component library with helpers; accept slower UI dev velocity |
| Chromium security updates lag                         | MEDIUM                        | LOW        | Track Electron stable releases; automate dependency updates               |

### Critical Decision Point

**Extension compatibility (NFR-04) vs Electron (tech choice) tension:**
The user requires >90% Chrome Web Store compatibility. Electron's `electron-chrome-extensions` achieves ~70-80%. This gap must be resolved in the Design phase — options include:

1. Accept reduced compatibility for MVP speed
2. Switch to Chromium fork (higher complexity, higher compatibility)
3. Hybrid: Electron shell + embedded Chromium for extension host

---

## 8. Phase Roadmap (High-Level)

```
Phase 1 (MVP):     Browser UI + Shallow Workspaces + Extensions  [This document]
Phase 2:           AI Side Panel + Page Summarization + Q&A
Phase 3:           Deep Workspace Isolation (per-workspace sessions)
Phase 4:           AI Agent (browser automation, multi-step workflows)
Phase 5:           Cross-platform (Windows, Linux)
Phase 6:           Sync + Collaboration
```
