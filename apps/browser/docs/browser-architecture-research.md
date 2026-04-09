# Browser Architecture Research: How Browsers Layer UI on Top of Engines

Comprehensive technical research on how modern browsers implement their UI and features on top of their base rendering engines.

---

## Table of Contents

1. [Chromium Internals: WebUI & Views Framework](#1-chromium-internals)
2. [Arc Browser](#2-arc-browser)
3. [Vivaldi](#3-vivaldi)
4. [Brave](#4-brave)
5. [Opera](#5-opera)
6. [Microsoft Edge](#6-microsoft-edge)
7. [Zen Browser](#7-zen-browser)
8. [Dia Browser](#8-dia-browser)
9. [SigmaOS](#9-sigmaos)
10. [Safari](#10-safari)
11. [Min Browser](#11-min-browser)
12. [Comparative Analysis: HTML/CSS vs Native UI](#12-comparative-analysis)

---

## 1. Chromium Internals: WebUI System & Views Framework {#1-chromium-internals}

Understanding Chromium's two UI systems is foundational, as most browsers in this research are Chromium forks.

### Views Framework (Native C++ UI)

Views is Chromium's **native C++ UI toolkit**, analogous to a mini rendering system like WebKit or Gecko but for browser chrome (not web content).

- **Architecture**: The UI is a tree of `View` objects responsible for rendering, layout, and event handling. At the root is a `Widget`, which wraps a native OS window that receives platform messages, converts them, and passes them to a `RootView`.
- **Usage**: The address bar (Omnibox), tab strip, menus, toolbar buttons, and window frame on Windows/Linux/ChromeOS are all rendered via Views in C++.
- **Platform specifics**: On macOS, some chrome UI uses Cocoa/AppKit natively. On Windows/Linux/ChromeOS, Views is the primary toolkit.

### WebUI System (HTML/CSS/JS Pages)

WebUI is Chromium's system for building **internal pages** (like `chrome://settings`, `chrome://history`, `chrome://downloads`) using web technologies.

- **Architecture**: A high-level `WebUI` class lives in the browser process, owned by a `RenderFrameHost`. Each WebUI page has a `WebUIController` set based on the hostname of the `chrome://` URL.
- **Frontend stack**: WebUI pages are Polymer or Lit single-page applications built with HTML, CSS, and TypeScript (transpiled to JS). They communicate with C++ backend controllers.
- **IPC mechanism**: Communication between the web frontend and C++ backend happens via **Mojo IPC** -- a typed, versioned interface definition language. The frontend calls Mojo endpoints, which route to C++ handler methods.
- **Security model**: WebUI pages run in a trusted renderer process with elevated privileges compared to normal web content. They can call browser-process APIs that normal web pages cannot.

### How Forks Use These Systems

Chromium forks can:
1. **Modify Views C++ code** to change native UI (toolbar, tabs, etc.)
2. **Add new WebUI pages** for custom settings or features
3. **Replace the entire UI layer** (as Vivaldi does) with their own HTML/CSS/JS
4. **Patch either system** to inject custom behavior

---

## 2. Arc Browser {#2-arc-browser}

> **Status**: Maintenance mode since May 2025. The Browser Company was acquired by Atlassian for $610M in September 2025.

### Base Engine
- **Chromium** (standard Chromium engine for web rendering)

### UI Technology: Native Swift/SwiftUI (NOT HTML/CSS)

Arc is notable for **completely replacing Chromium's native C++ UI** with a custom Swift/SwiftUI layer on macOS:

- **macOS**: Written in **Swift and SwiftUI**, giving it fluid, native animations and Apple-native look/feel. The sidebar, Spaces switcher, command bar, and all browser chrome are SwiftUI views, not Chromium Views or WebUI.
- **Windows**: Arc for Windows was the **first Windows app built using Apple's Swift language**. The Browser Company engineered a custom development bridge allowing Swift apps to communicate with Windows APIs. Mac and Windows versions share ~80% of the same Swift codebase.
- **ADK (Arc Development Kit)**: An internal SDK/framework for building browser UIs with "imaginative interfaces." ADK lets ex-iOS engineers prototype native browser UI rapidly without touching Chromium C++ code. ADK is also the foundation of Dia.

### How Features Are Built

- **Sidebar**: A SwiftUI view that replaces the traditional horizontal tab bar. It contains vertical tabs, pinned favorites, folders, and the search bar -- all native Swift views, not web content.
- **Spaces (profile isolation)**: Each Space maintains its own set of tabs, folders, and pinned items. Spaces are a UI-level organizational layer built in SwiftUI. They can optionally use different browser profiles (separate cookies/sessions) by mapping to Chromium's profile system underneath.
- **Boosts/Easels**: Custom web-based features (Boosts for custom CSS injection, Easels for collaborative whiteboards) use web content rendered inside the Chromium engine, while the surrounding UI chrome is native Swift.

### Memory/Performance

- SwiftUI provides native rendering performance for browser chrome, avoiding the overhead of rendering UI through a web engine.
- However, The Browser Company later found **SwiftUI had performance limitations on macOS** (the gap between SwiftUI and AppKit is more pronounced than between SwiftUI and UIKit on iOS), contributing to their decision to move away from SwiftUI for Dia.
- The Composable Architecture (TCA) was used for state management but was also sunsetted due to performance concerns.

---

## 3. Vivaldi {#3-vivaldi}

### Base Engine
- **Chromium** (rendering engine only; UI is entirely custom)

### UI Technology: React.js (HTML/CSS/JS)

Vivaldi is the most prominent example of a **fully web-technology-based browser UI**:

- **React.js frontend**: The entire browser UI -- tab bar, panels, address bar, settings, mail client, calendar, feed reader -- is a **React single-page application** rendered in a special browser window.
- **Tech stack**: HTML5, CSS, JavaScript (React.js), Node.js, and numerous NPM modules.
- **How it works**: Vivaldi strips out Chromium's native Views-based UI (tab strip, toolbar, etc.) and replaces it with a custom web page that acts as the browser chrome. This React app runs in a privileged renderer process and communicates with the C++ browser backend via custom APIs.

### Portal Windows Architecture (Since v6.2)

This is Vivaldi's most significant architectural innovation:

- **Before Portal Windows**: Each browser window had its own separate HTML document and separate JavaScript context running the React UI. This meant duplicated code, duplicated state, and high memory usage per window.
- **After Portal Windows**: All windows of the same profile share **one UI document and one script context**. Individual windows are rendered using **React Portals** -- React's mechanism for rendering a component's output into a different DOM subtree (in this case, a different OS window).
- **Benefits**:
  - 37% faster window opening vs. previous version
  - 64% faster vs. 2018 version
  - Significantly reduced memory and CPU usage
  - Enabled new features like dragging Mail tabs between windows
- **Private windows** still run in a separate context for isolation.

### How Features Are Added

- **All UI features** (tab stacking, web panels, speed dial, mail, calendar, etc.) are React components.
- **Customization**: Because the UI is HTML/CSS, users can inspect and modify it with developer tools. CSS variables allow extensive theming.
- The Chromium engine is used purely for rendering web content; the browser chrome is an independent React app.

### Performance Considerations

- **PageStore optimization**: Vivaldi's state management system (PageStore) was optimized to ignore redundant state change notifications, preventing unnecessary React re-renders.
- Tabs open 2x faster after these optimizations; new windows open 26% faster on M1 Macs.
- The web-based UI does add overhead compared to native C++, but Vivaldi has aggressively optimized to minimize this.

---

## 4. Brave {#4-brave}

### Base Engine
- **Chromium** (keeps the full Chromium UI; patches on top)

### UI Technology: Chromium's Native Views (C++) + Patching

Brave takes the most conservative approach of all Chromium forks -- it **keeps Chromium's existing UI** and modifies it through a sophisticated patching system:

### Patching Architecture (Ordered by Preference)

1. **brave-core only code**: New features written entirely within `src/brave/` that don't touch upstream Chromium. This is the preferred approach.

2. **Subclassing and virtual methods**: Brave subclasses Chromium C++ classes and overrides methods. Minimal upstream patches needed (just making methods `virtual`, adding `friend` declarations, or swapping instantiation).

3. **Preprocessor-based replacement**: Header-level `#define` macros rename Chromium functions (e.g., `#define DoSomething DoSomething_ChromiumImpl`), allowing Brave to provide its own implementation that can call the original.

4. **Complete file overrides via `chromium_src/`**: An entire override directory where files take compilation priority over upstream Chromium files. `#include "chrome/browser/profiles/profile.h"` will load from `src/brave/chromium_src/chrome/browser/profiles/profile.h` if it exists.

5. **Direct `.patch` files (last resort)**: Actual unified diff patches applied to Chromium source. Stored in `src/brave/patches/`. Generated via `npm run update_patches`. Policy: patches should be "trivial changes, not nested logic changes."

### How Features Are Built

- **Shields (ad/tracker blocking)**: Implemented natively in C++/Rust within the browser core, not as an extension. This bypasses extension API limitations and gives deeper network-level control.
- **Brave Rewards/BAT**: Custom C++ code in brave-core.
- **Tor Private Tabs**: Integrates Tor proxy at the network level via brave-core.
- **Mojom extensions**: Uses `[BraveAdd]` and `[BraveExtend]` attributes to extend Chromium's Mojo interfaces without overwriting them.
- **TypeScript/JS overrides**: `chromium_src` support for JS/TS files, allowing imports like `import './filename-chromium.js'` to access and modify upstream WebUI code. Works with both Polymer and Lit.

### Memory/Performance

- Brave's approach adds minimal overhead since it uses Chromium's native UI. Performance is essentially identical to Chrome minus Google services plus Brave's native ad-blocking (which actually improves page load performance).

---

## 5. Opera (Opera One) {#5-opera}

### Base Engine
- **Chromium**

### UI Technology: Hybrid (Chromium native + custom compositor + web components)

Opera One introduced a novel approach with its **Modular Design** architecture:

### Multi-Threaded Compositor

Opera One is the **first major Chromium-based browser to implement a multi-threaded compositor for its browser UI**:

- **Problem solved**: Traditional Chromium browser UI runs everything on one UI thread. When the thread is busy (e.g., processing JavaScript, handling complex layout), animations stutter.
- **Solution**: Opera introduced a **compositor thread for the UI layer**, separate from the main UI thread. This mirrors how Chromium already renders web pages (main thread + compositor thread) but applies it to the browser chrome itself.
- **How it works**: Layer-based animations run exclusively in the compositor thread without UI thread involvement. Instead of redrawing each frame, affine transformations are applied to pre-rendered layers. This means animations continue smoothly even when the UI thread stalls.

### Feature Implementation

- **Tab Islands**: A grouping mechanism enabled by the modular architecture. Tabs automatically cluster into "islands" based on browsing context.
- **Workspaces**: Located at the top of the sidebar for quick switching. Each workspace maintains its own set of open tabs. Implementation is UI-level organization (not separate profiles).
- **Sidebar messengers**: Web panels loaded as lightweight webviews in the sidebar. Each messenger (Telegram, WhatsApp, etc.) runs in its own contained webview.
- **Flow**: A cross-device sharing feature using Opera's cloud sync infrastructure.

### Architecture Principles

- **Modular Design**: Each UI component (sidebar, tab bar, address bar) is defined as a separate module.
- **Web Components**: Opera uses a web UI toolkit (open-sourced at `github.com/operasoftware/toolkit`) that is native to the platform, modular with each component as a separate module, and uses unidirectional data flow with Web Components encapsulation.

### Memory/Performance

- The multi-threaded compositor provides smoother UI animations than standard Chromium forks.
- Sidebar web panels (messengers) consume additional memory as they are live webviews.

---

## 6. Microsoft Edge {#6-microsoft-edge}

### Base Engine
- **Chromium**

### UI Technology: WebUI 2.0 (HTML-first Web Components, replacing React)

Edge has undergone a fascinating UI architecture evolution:

### Phase 1: React-based differentiation
When Microsoft ported Edge to Chromium, the team decided to differentiate from Chrome by converting internal UI pages to **React**. This added UI polish but introduced significant JavaScript overhead.

### Phase 2: WebUI 2.0 (Current)
Microsoft built an entirely new **markup-first architecture** called WebUI 2.0:

- **Core principle**: Minimize JavaScript bundle sizes and the amount of JS that runs during UI initialization. Prioritize HTML markup that renders immediately.
- **Technology**: Replaced React with **native Web Components** (Custom Elements, Shadow DOM) tuned for performance on modern web engines.
- **Repository**: A shared library of performance-optimized web components used across Edge's UI surfaces.
- **Migration status**: ~15% of UI surfaces fully converted (as of late 2025), with the effort ongoing "surface-by-surface."

### Performance Improvements from WebUI 2.0

- **42% faster** for general Edge users
- **76% faster** on low-RAM or HDD PCs
- **40% faster** favorites menu
- 14+ UI surfaces now use WebUI 2.0 instead of React

### How Features Are Built

- **Vertical tabs**: Implemented as a WebUI component. The tab strip is rendered as an HTML-based panel on the side of the window, replacing the default horizontal tab strip.
- **Copilot sidebar**: A WebView panel docked to the right side of the browser, loading Microsoft's Copilot web interface. Recent Canary builds experiment with mounting Copilot affordances on both sides of the browser.
- **Collections, Browser Essentials, etc.**: WebUI pages using the new Web Components architecture.
- **A/B testing infrastructure**: Server-side templates, feature flags, and UI toggles enable rapid experimentation without full releases.

### Memory/Performance

- WebUI 2.0 dramatically reduces JS overhead compared to the React era.
- Edge tends to consume more memory than Chrome due to additional features (sidebar, Copilot, etc.) running as persistent web processes.

---

## 7. Zen Browser {#7-zen-browser}

### Base Engine
- **Firefox/Gecko** (the only major non-Chromium entry besides Safari/SigmaOS)

### UI Technology: CSS/XUL Modifications on Firefox

Zen takes a **"minimal patching, maximum extension"** approach to modifying Firefox:

### Architecture: Strategic Patching + CSS Transformation

Rather than forking the entire Firefox codebase, Zen applies targeted unified diff patches to essential Firefox components:

**Patched Firefox files:**
- `tabbrowser.js` and `tabs.js` -- Tab lifecycle and metadata
- `SessionStore.sys.mjs` and `TabState.sys.mjs` -- State persistence
- `CustomizableUI.sys.mjs` -- Toolbar widget management
- `browser.xhtml` -- Main window structure (XUL document)

These patches inject behavior hooks without replacing entire modules.

### XUL Document Restructuring

Zen injects custom container elements into Firefox's XUL layout:
- `#zen-main-app-wrapper` -- Root horizontal box wrapping the entire interface
- `#zen-appcontent-wrapper` -- Main content area container
- `#zen-tabs-wrapper` -- Workspace tabs container
- `#zen-essentials` -- Essential tabs section
- `#zen-sidebar-top-buttons` -- Sidebar control buttons

### How Features Are Implemented

**Vertical Tabs:**
- CSS `flex-direction: column` applied to `#tabbrowser-tabs` transforms the horizontal tab strip to vertical
- Standard Firefox tab markup remains largely unchanged; rendering is transformed through CSS
- Custom drag-and-drop handlers for vertical orientation
- Workspace-aware tab positioning through patched `insertTabAtIndex()`

**Workspaces:**
- Each tab receives a `zen-workspace-id` attribute during creation
- Workspace switching filters visible tabs via CSS and a parallel data model -- tabs are hidden, not destroyed
- Optional mapping to Firefox containers (`zen.workspaces.force-container-workspace`) for cookie/session isolation
- User containers can map to workspaces for separate login sessions

**Split View:**
- `gZenViewSplitter` manager controls pane lifecycle
- Leverages Firefox's existing multi-tab-box capability with custom layout logic
- Session store integration persists split configuration

**Zen Mods (Theming Engine):**
- Built on Firefox's `userChrome.css` mechanism
- `ZenThemeModifier` applies accent colors via `--zen-primary-color` CSS variable
- Marketplace for community themes via `gZenMarketplaceManager`
- Layers additional CSS variable management on top of Firefox's standard theme engine

**Compact Mode:**
- Pure CSS implementation using `:root[zen-compact-mode="true"]` selectors
- Auto-hides sidebar to icons, reduces toolbar elements

### Preference System

- YAML-based preference definitions compiled into Firefox's default preference set
- Files: `prefs/zen/zen.yaml`, `prefs/zen/view.yaml`, `prefs/zen/glance.yaml`
- Observer patterns trigger real-time UI updates through `ZenThemeModifier`
- Platform-specific conditional activation

### Startup Sequence
1. Pre-loaded scripts (`zen-sets.js`, `ZenSpace.mjs`)
2. CSS and core modules loaded
3. `ZenStartup.init()` on `MozBeforeInitialXULLayout`
4. Navbar relocated to custom container
5. Sidebar repositioned, workspaces initialized
6. `delayedStartupFinished()` completes advanced features

### Memory/Performance

- Inherits Gecko's memory characteristics
- Uses Betterfox `user.js` configuration for performance optimization
- CSS-based UI transformations add negligible overhead
- Tab hibernation via workspace hiding reduces memory vs. keeping all tabs rendered

---

## 8. Dia Browser {#8-dia-browser}

### Base Engine
- **Chromium**

### UI Technology: Native (Post-SwiftUI, likely AppKit/UIKit)

Dia represents a **deliberate architectural pivot** from Arc:

### What Changed from Arc

- Arc used **Swift + SwiftUI + TCA (The Composable Architecture)** for its UI
- Dia explicitly **sunsetted TCA and SwiftUI** "to make Dia lightweight, snappy, and responsive"
- The specific replacement frameworks have not been publicly disclosed, but the move away from SwiftUI toward something more performant strongly suggests **AppKit on macOS** (possibly with some Objective-C/C++ bridging)
- ADK (Arc Development Kit) remains the foundation for Dia's UI layer

### Rationale for the Change

- SwiftUI's performance gap vs. AppKit on macOS is more pronounced than SwiftUI vs. UIKit on iOS
- Reactive frameworks (TCA) have inherent performance overhead vs. imperative frameworks
- Arc used "an early, specialized branch of TCA" that differed from the officially released version
- Dia prioritizes performance from the start; Arc was "bloated with too many features"

### AI-Native Architecture

- **Memory**: Retains user context across sessions, built into the architecture
- **Skills/Agents**: Automated assistants for daily tasks
- **Third-party integrations** (March 2026): Slack, Notion, Google Calendar, Gmail, Amplitude -- the AI assistant can retrieve context across services

### Current Status

- Beta launched June 2025
- Atlassian acquisition completed October 2025
- Adding Arc's "greatest hits" features (Spaces-like organization, sidebar)

---

## 9. SigmaOS {#9-sigmaos}

### Base Engine
- **WebKit** (via Apple's WKWebView)

### UI Technology: Native SwiftUI

SigmaOS is a **macOS-only browser** built entirely in Apple's native stack:

- **SwiftUI** for the entire browser UI (sidebar, workspace switcher, tab management)
- **WebKit/WKWebView** for web content rendering (same engine as Safari)
- First WebKit-powered browser to also support **Chromium extensions**

### How Features Are Built

**Workspaces:**
- Each workspace is a completely separate browsing context
- "Separate profiles" option gives each workspace its own cookie jar/session -- different workspaces can be logged into different accounts on the same service
- Workspace state is preserved exactly when switching (tabs, scroll positions, etc.)

**Tab Management:**
- Locked tabs can be pinned to workspaces with auto-renaming
- Pages unused for a while are **automatically unloaded** to preserve RAM
- Temporary data is cached for quick restoration

**Privacy:**
- Per-workspace private browsing toggle
- Per-workspace separate cookie settings

### Memory/Performance

- WebKit is notably more memory-efficient than Chromium's Blink
- SwiftUI provides native macOS rendering performance
- Optimized for Apple Silicon (M1/M2/M3)
- Automatic tab unloading is a key memory management strategy
- Battery life benefits from WebKit's power efficiency

---

## 10. Safari {#10-safari}

### Base Engine
- **WebKit** (Apple develops both Safari and WebKit)

### UI Technology: Fully Native (AppKit/UIKit + Objective-C/C++)

Safari's UI is entirely native platform code:

### Architecture

- **macOS**: Browser chrome (toolbar, tab bar, sidebar, preferences) is built with **AppKit** (Cocoa), Apple's native macOS UI framework, using `NSWindow`, `NSView`, `NSToolbar`, and other AppKit classes.
- **iOS/iPadOS**: Browser chrome uses **UIKit** with `UIViewController`, `UINavigationController`, etc.
- **WebKit integration**: Safari uses `WKWebView` (the public API to WebKit's rendering engine) for web content. Each tab is essentially a `WKWebView` instance managed by the native UI layer.

### Multi-Process Architecture

- **UI Process**: The Safari application itself (AppKit/UIKit). Handles all browser chrome rendering, user input, and UI state.
- **WebContent Process**: Each tab typically gets its own WebContent process via WebKit's multi-process architecture. These processes render HTML/CSS and execute JavaScript in isolation.
- **Networking Process**: A single networking process handles all HTTP requests and storage management, shared across all WebContent processes in a session.

### How Features Are Built

- **Tab management**: macOS uses `NSWindow` tab groups (since macOS Sierra) and custom tab bar implementations. Safari's tab bar, tab groups, and profiles are all native AppKit views.
- **Sidebar**: Native `NSSplitView`-based layout with AppKit views for bookmarks, reading list, etc.
- **Extensions**: Safari extensions use a hybrid model -- native app container (Swift/AppKit) with web extension content (HTML/CSS/JS).
- **Content blockers**: Run as compiled JSON rule sets in the WebKit networking process, not as injected scripts.

### Memory/Performance

- Fully native UI means minimal overhead for browser chrome.
- WebKit's multi-process model with aggressive process management (automatic tab suspension) keeps memory usage lower than Chromium-based browsers.
- Deep OS integration allows Safari to leverage macOS power management APIs for battery efficiency.

---

## 11. Min Browser {#11-min-browser}

### Base Engine
- **Electron** (which embeds Chromium + Node.js)

### UI Technology: HTML/CSS/JS (Electron renderer)

Min demonstrates how a browser can be built entirely with web technologies using Electron:

### Process Architecture

**Main Process:**
- Opens windows, creates app menu, handles IPC routing
- Filters network requests (content blocking)
- Forwards notifications for downloads and permission prompts
- Has Node.js API access but displays no UI

**UI Process (per window):**
- A renderer process displaying `index.html` from the repository root
- Runs code from the `js/` directory
- Full Node.js access (privileged, does not display untrusted content)
- Renders the tab bar, task overlay, download manager, and all browser chrome

**Places Window:**
- A hidden renderer process managing the places database (history + bookmarks)
- Performs search operations and bookmark suggestions
- Communicates via IPC with UI processes

**Tab Processes:**
- Each tab runs in its own **BrowserView** (sandboxed, no Node.js access)
- BrowserView instances are held in the main process

### Communication Pattern

- Tab and UI processes **never communicate directly**
- All messages route through the main process, which forwards to destinations
- Preload scripts in tab processes have access to Electron's IPC module for sending data back (text extraction for full-text search, reader mode detection, password input detection)

### Multi-Window Architecture

- Each window runs in its own isolated process
- `windowSync.js` replicates data changes across windows
- Global `tasks` object maintained consistently across windows (with small propagation delays)

### How Features Are Built

- **Settings**: `get()`, `set()`, `listen()` methods accessible across all processes via IPC
- **Tabs**: Managed as `BrowserView` instances. State moves automatically between windows without page reloads.
- **Localization**: Language strings in `localization/languages/` compiled to a buildable script

### Memory/Performance

- Electron's overhead is significant: each window runs a full Chromium renderer for UI
- BrowserView per tab adds Chromium's per-process overhead
- Overall memory footprint is higher per-feature than native browsers
- Tradeoff: extremely rapid development with full web technology stack

---

## 12. Comparative Analysis {#12-comparative-analysis}

### UI Technology Spectrum

| Browser | Engine | UI Technology | UI Rendering |
|---------|--------|--------------|-------------|
| **Arc** | Chromium | Swift/SwiftUI (native) | Native GPU-accelerated |
| **Vivaldi** | Chromium | React.js (HTML/CSS/JS) | Web renderer (Blink) |
| **Brave** | Chromium | Chromium Views (C++) | Native Views framework |
| **Opera** | Chromium | Hybrid (native + web components + custom compositor) | Multi-threaded compositor |
| **Edge** | Chromium | WebUI 2.0 (Web Components, was React) | Web renderer (Blink) |
| **Zen** | Gecko | CSS/XUL modifications | Gecko (CSS transforms) |
| **Dia** | Chromium | Native (post-SwiftUI, likely AppKit) | Native GPU-accelerated |
| **SigmaOS** | WebKit | SwiftUI (native) | Native GPU-accelerated |
| **Safari** | WebKit | AppKit/UIKit (native) | Native GPU-accelerated |
| **Min** | Electron/Chromium | HTML/CSS/JS | Web renderer (Blink) |

### Performance Overhead (Estimated, Relative)

| Approach | UI Rendering Overhead | Memory Per Window | Development Speed |
|----------|----------------------|-------------------|-------------------|
| Native C++/Views | Lowest | Lowest | Slowest |
| Native Swift/AppKit | Very Low | Very Low | Medium |
| SwiftUI | Low | Low | Fast |
| Web Components (Edge WebUI 2.0) | Medium-Low | Medium | Fast |
| React (Vivaldi/old Edge) | Medium | Medium-High | Very Fast |
| Electron (Min) | High | High | Very Fast |

### Key Architectural Patterns

**1. "Keep the Chrome, Patch It" (Brave)**
- Lowest risk, easiest to rebase on new Chromium versions
- Limited UI differentiation
- Best for privacy/security-focused browsers that want Chromium's UI

**2. "Replace the Chrome with Web Tech" (Vivaldi, Edge)**
- Maximum UI flexibility and rapid feature development
- Performance overhead from web rendering of browser chrome
- Vivaldi's Portal Windows and Edge's WebUI 2.0 show how to optimize this approach

**3. "Replace the Chrome with Native Code" (Arc, SigmaOS, Safari)**
- Best performance for browser chrome
- Most expensive to develop and maintain
- Platform-specific (or requires bridges like Arc's Swift-to-Windows)

**4. "Transform Existing UI via CSS/XUL" (Zen)**
- Clever low-overhead approach for Firefox forks
- Maintains upstream compatibility with minimal patches
- Limited by what CSS transformation can achieve

**5. "Custom Compositor" (Opera)**
- Addresses animation performance specifically
- Requires deep engine knowledge
- Unique differentiator for smooth UI feel

### HTML/CSS UI vs Native UI: The Real-World Tradeoff

**Where web-based UI suffers:**
- Initial render/startup time (parsing HTML, loading JS, React hydration)
- Memory footprint per window (each window needs a renderer)
- Animation smoothness under load (single-threaded without Opera's compositor approach)
- Low-end hardware performance (Edge saw 76% improvement moving from React to Web Components)

**Where web-based UI excels:**
- Development velocity (HTML/CSS/JS skills are common)
- Customizability (users can modify UI with CSS)
- Cross-platform consistency (same React code renders identically)
- Feature richness (easier to build complex UIs with web technologies)

**Vivaldi's pragmatic answer:** Accept the overhead, optimize aggressively (Portal Windows, PageStore), and leverage the massive development speed advantage of React.

**Edge's answer:** Keep the web-technology approach but eliminate framework overhead. WebUI 2.0's markup-first architecture with raw Web Components eliminates React's runtime cost while keeping HTML/CSS flexibility.

**Opera's answer:** Keep the web approach but fix the animation problem at the compositor level with a dedicated multi-threaded compositor for browser UI.

---

## Sources

### Arc Browser
- [Arc (web browser) - Wikipedia](https://en.wikipedia.org/wiki/Arc_(web_browser))
- [Arc, Dia, TCA and SwiftUI -- Fatbobman's Swift Weekly #86](https://fatbobman.com/en/weekly/issue-086/)
- [Letter to Arc members 2025](https://browsercompany.substack.com/p/letter-to-arc-members-2025)
- [Arc Browser: A Compelling But Controversial Newcomer - DEV Community](https://dev.to/therabbithole/arc-browser-a-compelling-but-controversial-newcomer-59oa)

### Vivaldi
- [Built using Chromium, but different from Chrome | Vivaldi](https://vivaldi.com/blog/vivaldi-different-from-chrome/)
- [Massive code refactoring brings speed to Vivaldi browser](https://vivaldi.com/blog/vivaldi-on-desktop-6-2/)
- [How we made Vivaldi faster independent of Chromium](https://vivaldi.com/blog/how-we-made-vivaldi-faster-independent-of-chromium/)
- [Vivaldi Refactored its Chromium Web Browser - Thurrott.com](https://www.thurrott.com/cloud/web-browsers/287859/vivaldi-refactored-its-chromium-web-browser-and-youre-never-going-to-believe-what-happened-next)
- [Technologies behind Vivaldi browser | Vivaldi Forum](https://forum.vivaldi.net/topic/5347/technologies-behind-vivaldi-browser)

### Brave
- [Patching Chromium - brave/brave-browser Wiki](https://github.com/brave/brave-browser/wiki/Patching-Chromium)
- [brave-core patching_and_chromium_src.md](https://github.com/brave/brave-core/blob/master/docs/patching_and_chromium_src.md)
- [Deviations from Chromium - brave/brave-browser Wiki](https://github.com/brave/brave-browser/wiki/Deviations-from-Chromium-(features-we-disable-or-remove))

### Opera
- [Opera One Multithreaded Compositor Blog](https://blogs.opera.com/desktop/2023/04/opera-one-multithreaded-compositor/)
- [Opera One Developer Preview](https://blogs.opera.com/news/2023/04/opera-one-developer/)
- [Opera Web UI Toolkit](https://github.com/operasoftware/toolkit)

### Microsoft Edge
- [How Microsoft Edge Is Replacing React With Web Components - The New Stack](https://thenewstack.io/how-microsoft-edge-is-replacing-react-with-web-components/)
- [From React to HTML-First: Microsoft Edge Debuts 'WebUI 2.0' - The New Stack](https://thenewstack.io/from-react-to-html-first-microsoft-edge-debuts-webui-2-0/)
- [Microsoft Edge WebUI 2.0 Performance - NotebookCheck](https://www.notebookcheck.net/Microsoft-tackles-poor-Edge-browser-user-interface-performance-by-replacing-React-UI-with-WebUI-2-0.842391.0.html)

### Zen Browser
- [Zen Browser - Wikipedia](https://en.wikipedia.org/wiki/Zen_Browser)
- [Zen Browser Preferences System - DeepWiki](https://deepwiki.com/zen-browser/desktop/5.1-preferences-system)
- [Zen Browser Theme Components - DeepWiki](https://deepwiki.com/zen-browser/theme-components)

### Dia Browser
- [Dia (web browser) - Wikipedia](https://en.wikipedia.org/wiki/Dia_(web_browser))
- [The Browser Company Discusses the Future - Thurrott.com](https://www.thurrott.com/cloud/web-browsers/321435/the-browser-company-discusses-the-future-of-arc-dia-and-the-web)
- [Dia AI browser inherits Arc's features - TechBuzz](https://www.techbuzz.ai/articles/dia-ai-browser-inherits-arc-s-winning-features-after-610m-buyout)

### SigmaOS
- [SigmaOS](https://sigmaos.com/)
- [SigmaOS Common Questions](https://docs.sigmaos.com/common-questions)
- [SigmaOS raises $4M - TechCrunch](https://techcrunch.com/2022/11/16/sigmaos-raises-4-million-to-build-a-browser-for-productivity-nerds/)

### Safari / WebKit
- [Architecture of Apple Safari Browser - GeeksforGeeks](https://www.geeksforgeeks.org/computer-networks/architecture-of-apple-safari-browser/)
- [Introduction to WebKit - WebKit Documentation](https://docs.webkit.org/Getting%20Started/Introduction.html)
- [WebKit GitHub](https://github.com/WebKit/WebKit)

### Min Browser
- [Min Browser Architecture Wiki](https://github.com/minbrowser/min/wiki/Architecture)
- [Min Browser DeepWiki](https://deepwiki.com/minbrowser/min)

### Chromium Internals
- [Chromium WebUI Explainer](https://chromium.googlesource.com/chromium/src/+/main/docs/webui/webui_explainer.md)
- [Views (Chromium UI Framework)](https://www.chromium.org/chromium-os/developer-library/guides/views/intro/)
- [ChromeViews Design Documents](https://www.chromium.org/developers/design-documents/chromeviews/)
- [UI Development Practices](https://www.chromium.org/developers/design-documents/ui-development-practices/)
