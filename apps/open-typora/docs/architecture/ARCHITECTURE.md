# Open Typora -- Architecture Document

> Version 0.1.0 | 2026-04-09
> Status: **Draft -- Approved for Implementation**

---

## Table of Contents

1. [Project Structure](#1-project-structure)
2. [Core Architecture](#2-core-architecture)
3. [Editor Architecture](#3-editor-architecture)
4. [File Management](#4-file-management)
5. [Theme System](#5-theme-system)
6. [State Management](#6-state-management)
7. [IPC Design](#7-ipc-design)
8. [Phase Plan](#8-phase-plan)

---

## 1. Project Structure

```
open-typora/
├── src-tauri/                    # Rust / Tauri 2 backend
│   ├── Cargo.toml
│   ├── tauri.conf.json           # Tauri configuration
│   ├── capabilities/             # Tauri 2 permission capabilities
│   │   └── default.json
│   ├── icons/                    # App icons
│   ├── src/
│   │   ├── main.rs               # Entry point (setup, plugin registration)
│   │   ├── lib.rs                 # Library root, module declarations
│   │   ├── commands/              # Tauri IPC command handlers
│   │   │   ├── mod.rs
│   │   │   ├── file.rs            # File CRUD, read, write, rename, delete
│   │   │   ├── folder.rs          # Folder operations, directory tree
│   │   │   ├── markdown.rs        # MD parse/serialize (comrak)
│   │   │   ├── export.rs          # PDF, HTML, Word export
│   │   │   └── theme.rs           # Theme list, load, save
│   │   ├── markdown/              # Markdown processing core
│   │   │   ├── mod.rs
│   │   │   ├── parser.rs          # comrak -> intermediate AST
│   │   │   ├── serializer.rs      # intermediate AST -> markdown string
│   │   │   └── prosemirror.rs     # AST <-> ProseMirror JSON conversion
│   │   ├── watcher/               # File system watcher (notify crate)
│   │   │   ├── mod.rs
│   │   │   └── debounce.rs
│   │   ├── export/                # Export engines
│   │   │   ├── mod.rs
│   │   │   ├── pdf.rs
│   │   │   ├── html.rs
│   │   │   └── docx.rs
│   │   ├── state.rs               # Tauri managed state (AppState)
│   │   └── error.rs               # Unified error type, Result alias
│   └── tests/
│       ├── markdown_roundtrip.rs
│       └── file_operations.rs
│
├── src/                           # React / TypeScript frontend
│   ├── main.tsx                   # React entry point
│   ├── App.tsx                    # Root component, layout shell
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppShell.tsx       # Top-level layout: sidebar + editor
│   │   │   ├── Sidebar.tsx        # File tree sidebar
│   │   │   ├── TitleBar.tsx       # Custom title bar (frameless window)
│   │   │   └── StatusBar.tsx      # Word count, line info, encoding
│   │   ├── editor/
│   │   │   ├── Editor.tsx         # Main editor component (TipTap host)
│   │   │   ├── EditorToolbar.tsx  # Formatting toolbar (optional, hover)
│   │   │   ├── SourceEditor.tsx   # Source code mode (CodeMirror 6)
│   │   │   └── EditorSwitcher.tsx # Toggle between WYSIWYG and source
│   │   ├── sidebar/
│   │   │   ├── FileTree.tsx       # Recursive file/folder tree
│   │   │   ├── FileTreeItem.tsx   # Individual tree node
│   │   │   └── FileTreeContext.tsx # Right-click context menu
│   │   └── common/
│   │       ├── Modal.tsx
│   │       ├── ContextMenu.tsx
│   │       └── Tooltip.tsx
│   ├── editor/                    # TipTap editor configuration
│   │   ├── index.ts               # createEditor factory
│   │   ├── extensions/            # Custom TipTap extensions
│   │   │   ├── index.ts           # Extension bundle export
│   │   │   ├── markdown-heading.ts
│   │   │   ├── markdown-paragraph.ts
│   │   │   ├── markdown-code-block.ts
│   │   │   ├── markdown-math-block.ts
│   │   │   ├── markdown-math-inline.ts
│   │   │   ├── markdown-image.ts
│   │   │   ├── markdown-table.ts
│   │   │   ├── markdown-task-list.ts
│   │   │   ├── markdown-blockquote.ts
│   │   │   ├── markdown-horizontal-rule.ts
│   │   │   ├── markdown-link.ts
│   │   │   ├── markdown-frontmatter.ts
│   │   │   └── markdown-footnote.ts
│   │   ├── serialization/         # ProseMirror JSON <-> Markdown
│   │   │   ├── index.ts
│   │   │   ├── markdown-to-doc.ts   # Calls Rust, transforms result
│   │   │   └── doc-to-markdown.ts   # Calls Rust, transforms result
│   │   ├── input-rules/           # Markdown-style input shortcuts
│   │   │   └── index.ts            # # -> h1, ``` -> code block, etc.
│   │   └── keymaps/
│   │       └── index.ts            # Keyboard shortcuts
│   ├── stores/                    # Zustand state stores
│   │   ├── editor-store.ts        # Current doc, dirty flag, mode
│   │   ├── file-store.ts          # File tree, open files, active file
│   │   ├── theme-store.ts         # Current theme, dark/light mode
│   │   └── app-store.ts           # Sidebar open, window state
│   ├── hooks/
│   │   ├── useEditor.ts           # Editor lifecycle hook
│   │   ├── useFileTree.ts         # File tree data + operations
│   │   ├── useTheme.ts            # Theme application hook
│   │   ├── useFileWatcher.ts      # Listen to Tauri file-change events
│   │   ├── useAutoSave.ts         # Debounced auto-save
│   │   └── useKeyboardShortcuts.ts
│   ├── services/                  # Tauri IPC wrappers (typed)
│   │   ├── file-service.ts        # invoke('read_file', ...) etc.
│   │   ├── markdown-service.ts    # invoke('parse_markdown', ...)
│   │   ├── export-service.ts      # invoke('export_pdf', ...)
│   │   └── theme-service.ts       # invoke('list_themes', ...)
│   ├── types/
│   │   ├── editor.ts              # ProseMirror doc types, editor mode
│   │   ├── file.ts                # FileNode, FolderNode, FileTree
│   │   └── theme.ts               # ThemeConfig, ThemeVariables
│   ├── styles/
│   │   ├── globals.css            # Tailwind directives, CSS variables
│   │   ├── editor.css             # Editor-specific (ProseMirror overrides)
│   │   └── themes/
│   │       ├── light.css          # Default light theme variables
│   │       ├── dark.css           # Default dark theme variables
│   │       └── sepia.css          # Example custom theme
│   └── lib/
│       ├── utils.ts               # General utilities
│       ├── constants.ts           # App-wide constants
│       └── platform.ts            # OS detection helpers
│
├── public/
│   └── index.html
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── vite.config.ts
├── docs/
│   └── architecture/
│       └── ARCHITECTURE.md        # This document
├── LICENSE                        # Apache 2.0
└── README.md
```

### Key Dependency Choices

| Category | Package | Reason |
|----------|---------|--------|
| Editor | `@tiptap/core`, `@tiptap/react`, `@tiptap/pm` | ProseMirror wrapper with React integration |
| Editor extensions | `@tiptap/starter-kit` | Base set (bold, italic, lists, etc.) |
| Source editor | `@codemirror/view`, `codemirror` | Lightweight source mode with MD highlighting |
| Math rendering | `katex` | Client-side LaTeX rendering |
| Code highlighting | `@tiptap/extension-code-block-lowlight`, `lowlight` | Syntax highlighting in code blocks |
| State | `zustand` | Minimal, TypeScript-friendly, no boilerplate |
| Styling | `tailwindcss` | Utility-first, works with CSS variables |
| Rust MD parser | `comrak` | GFM-compatible, mature, configurable |
| File watcher | `notify` (Rust crate) | Cross-platform fs event watcher |
| PDF export | `headless_chrome` or `wkhtmltopdf` via CLI | HTML-to-PDF conversion |
| DOCX export | `docx-rs` (Rust crate) | Pure Rust Word generation |

---

## 2. Core Architecture

### 2.1 High-Level Data Flow

```
┌─────────────────────────────────────────────────────┐
│                    Tauri Window                       │
│                                                       │
│  ┌──────────────┐    IPC (invoke)    ┌─────────────┐ │
│  │   React UI   │ ◄──────────────► │  Rust Core  │ │
│  │              │                    │             │ │
│  │  ┌────────┐  │   Tauri Events     │ ┌─────────┐ │ │
│  │  │ TipTap │  │ ◄──────────────── │ │ Watcher │ │ │
│  │  │ Editor │  │                    │ └─────────┘ │ │
│  │  └────────┘  │                    │             │ │
│  │  ┌────────┐  │                    │ ┌─────────┐ │ │
│  │  │Zustand │  │                    │ │ comrak  │ │ │
│  │  │ Stores │  │                    │ └─────────┘ │ │
│  │  └────────┘  │                    │             │ │
│  └──────────────┘                    │ ┌─────────┐ │ │
│                                      │ │ Export  │ │ │
│                                      │ └─────────┘ │ │
│                                      └─────────────┘ │
└─────────────────────────────────────────────────────┘
           │                               │
           │ webview                       │ native fs
           ▼                               ▼
     Browser Engine                   File System
```

### 2.2 Communication Model

All communication between frontend and backend uses two mechanisms:

1. **Tauri `invoke`** (request/response): Frontend calls Rust commands and awaits results. Used for file I/O, markdown parsing, export, theme loading.

2. **Tauri Events** (push): Rust backend emits events to the frontend. Used for file system change notifications, long-running export progress, and error notifications.

### 2.3 Document Lifecycle

```
User opens file
    │
    ▼
Frontend: invoke('read_file', { path })
    │
    ▼
Rust: reads file from disk, returns raw markdown string
    │
    ▼
Frontend: invoke('parse_markdown', { markdown })
    │
    ▼
Rust: comrak parses markdown -> AST -> ProseMirror JSON
    │
    ▼
Frontend: loads ProseMirror JSON into TipTap editor
    │
    ▼
User edits document (all edits happen in ProseMirror state)
    │
    ▼
Auto-save triggers (debounced, every 1s of inactivity)
    │
    ▼
Frontend: invoke('serialize_markdown', { doc_json })
    │
    ▼
Rust: ProseMirror JSON -> AST -> markdown string
    │
    ▼
Frontend: invoke('write_file', { path, content: markdown_string })
    │
    ▼
Rust: writes to disk (atomic write via temp file + rename)
```

### 2.4 Why Rust-Side Markdown Processing?

The decision to do markdown parsing and serialization in Rust rather than in JavaScript is deliberate:

- **Single source of truth**: comrak handles GFM, footnotes, tables, math, front matter consistently. No JS/Rust discrepancy.
- **Performance**: Large documents parse faster in native code.
- **Export reuse**: The same AST powers PDF/HTML/DOCX export.
- **Roundtrip fidelity**: Controlling both parse and serialize in one language avoids cross-boundary format drift.

The cost is one IPC round-trip on each save and load. For a typical document (<100KB), this adds <5ms latency, which is imperceptible.

---

## 3. Editor Architecture

### 3.1 Typora-Like WYSIWYG Philosophy

Typora's key UX insight: the document always looks like rendered markdown, but when the cursor enters a block, that block reveals its markdown syntax for editing. This is **not** a standard rich-text editor.

Our approach to achieve this:

1. The editor is always in WYSIWYG mode (ProseMirror rendering).
2. Each block node has two visual states: **rendered** (default) and **editing** (cursor inside). CSS and node views handle the transition.
3. A separate full-document **source mode** uses CodeMirror 6 showing raw markdown text.

### 3.2 TipTap Extension Architecture

We use TipTap's extension system. Each markdown construct gets a custom extension.

#### 3.2.1 Extension Registry

```typescript
// src/editor/extensions/index.ts

import { StarterKit } from '@tiptap/starter-kit'
import { MarkdownHeading } from './markdown-heading'
import { MarkdownCodeBlock } from './markdown-code-block'
import { MarkdownMathBlock } from './markdown-math-block'
import { MarkdownMathInline } from './markdown-math-inline'
import { MarkdownImage } from './markdown-image'
import { MarkdownTable } from './markdown-table'
import { MarkdownTaskList } from './markdown-task-list'
import { MarkdownBlockquote } from './markdown-blockquote'
import { MarkdownHorizontalRule } from './markdown-horizontal-rule'
import { MarkdownLink } from './markdown-link'
import { MarkdownFrontmatter } from './markdown-frontmatter'
import { MarkdownFootnote } from './markdown-footnote'

export function createExtensions() {
  return [
    StarterKit.configure({
      // Disable nodes we replace with custom versions
      heading: false,
      codeBlock: false,
      blockquote: false,
      horizontalRule: false,
    }),
    MarkdownHeading,
    MarkdownCodeBlock,     // lowlight syntax highlighting
    MarkdownMathBlock,     // KaTeX block rendering
    MarkdownMathInline,    // KaTeX inline rendering
    MarkdownImage,         // Local + remote image handling
    MarkdownTable,         // GFM tables
    MarkdownTaskList,      // - [x] style checkboxes
    MarkdownBlockquote,    // Nested blockquotes
    MarkdownHorizontalRule,
    MarkdownLink,          // Click-to-follow, edit-on-select
    MarkdownFrontmatter,   // YAML front matter (collapsed by default)
    MarkdownFootnote,      // [^1] footnote references
  ]
}
```

#### 3.2.2 Custom Node View Pattern (Typora-Style Reveal)

Every block node that has "reveal markdown on focus" behavior follows this pattern:

```typescript
// Pattern used by heading, code block, math block, image, etc.

import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { NodeViewWrapper, NodeViewContent } from '@tiptap/react'

// React component for the node view
function HeadingNodeView({ node, editor, getPos, selected }) {
  const isFocused = /* check if cursor is inside this node */
  
  return (
    <NodeViewWrapper>
      {isFocused && (
        <span className="md-syntax text-muted"># </span>
      )}
      <NodeViewContent as={`h${node.attrs.level}`} />
    </NodeViewWrapper>
  )
}

export const MarkdownHeading = Node.create({
  name: 'heading',
  // ... schema definition ...
  addNodeView() {
    return ReactNodeViewRenderer(HeadingNodeView)
  },
})
```

The key CSS classes:

```css
/* src/styles/editor.css */

/* Markdown syntax tokens shown during editing */
.md-syntax {
  font-family: var(--font-mono);
  color: var(--color-syntax);
  opacity: 0.5;
  user-select: none;
}

/* When a block is not focused, syntax is hidden */
.ProseMirror .node-view:not(.is-focused) .md-syntax {
  display: none;
}
```

#### 3.2.3 Specific Extension Details

**Code Block** (`markdown-code-block.ts`):
- Uses `lowlight` for syntax highlighting in rendered state.
- When focused, shows ``` delimiters and language selector.
- Stores `language` attribute on the node.
- Tab key inserts spaces (not focus change).

**Math Block** (`markdown-math-block.ts`):
- Node type: `mathBlock` (block-level) with `content: "text*"`.
- Rendered state: KaTeX renders the LaTeX string.
- Focused state: Shows raw LaTeX in a monospace textarea.
- Uses `katex.renderToString()` for the preview.

**Math Inline** (`markdown-math-inline.ts`):
- Node type: `mathInline` (inline, `inline: true, group: "inline"`).
- Same KaTeX approach but inline.
- Delimited by single `$...$` in markdown.

**Image** (`markdown-image.ts`):
- Stores: `src`, `alt`, `title` attributes.
- Local images: `src` is relative path; resolved to absolute via Tauri asset protocol (`asset://localhost/...`).
- Drag-and-drop / paste: Frontend sends binary to Rust which saves to `./assets/` relative to the document, returns the relative path.
- Focused state: Shows a popover to edit alt text and path.

**Table** (`markdown-table.ts`):
- Extends `@tiptap/extension-table` + `table-row` + `table-cell` + `table-header`.
- Adds GFM alignment support (`:---`, `:---:`, `---:`).
- Toolbar buttons for add/remove row/column.

**Frontmatter** (`markdown-frontmatter.ts`):
- Custom node, `atom: true` (opaque to ProseMirror).
- Always first node in document.
- Rendered as collapsed gray bar; click to expand YAML editor.
- Stored as raw YAML string in node attrs.

#### 3.2.4 Input Rules (Markdown Shortcuts)

```typescript
// src/editor/input-rules/index.ts

// These let users type markdown syntax and have it auto-convert:
// "# "      -> Heading 1
// "## "     -> Heading 2  (up to ######)
// "```lang" -> Code block with language
// "> "      -> Blockquote
// "- "      -> Bullet list
// "1. "     -> Ordered list
// "- [ ] "  -> Task list
// "---"     -> Horizontal rule
// "$$"      -> Math block
// "$...$"   -> Math inline (on closing $)
// "| ... |" -> Table (on Enter after header row)
```

These are implemented using TipTap's `addInputRules()` method on each extension.

#### 3.2.5 Source Code Mode Toggle

Two completely separate editor instances, only one mounted at a time:

```
┌────────────────────────────┐
│      EditorSwitcher        │
│                            │
│  mode === 'wysiwyg'        │
│    ? <Editor />            │  ← TipTap (ProseMirror)
│    : <SourceEditor />      │  ← CodeMirror 6
│                            │
└────────────────────────────┘
```

**Toggle flow** (WYSIWYG -> Source):
1. Serialize current ProseMirror doc to markdown (Rust IPC).
2. Unmount TipTap.
3. Mount CodeMirror with the markdown string.

**Toggle flow** (Source -> WYSIWYG):
1. Get raw markdown string from CodeMirror.
2. Parse markdown to ProseMirror JSON (Rust IPC).
3. Unmount CodeMirror.
4. Mount TipTap with the ProseMirror JSON.

The cursor position is **not** preserved across toggles (doing so is extremely complex for minimal benefit). The scroll position is approximately preserved by calculating the percentage offset.

### 3.3 Markdown Serialization (Bidirectional)

This is the most critical piece. Rust handles both directions.

#### 3.3.1 Rust-Side AST Intermediate Representation

```rust
// src-tauri/src/markdown/mod.rs

/// Intermediate AST that bridges comrak's AST and ProseMirror's JSON.
/// This is NOT exposed to the frontend; only ProseMirror JSON crosses IPC.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MdNode {
    pub node_type: MdNodeType,
    pub attrs: HashMap<String, serde_json::Value>,
    pub content: Vec<MdNode>,      // child nodes
    pub text: Option<String>,       // for text nodes
    pub marks: Vec<MdMark>,         // inline marks (bold, italic, etc.)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum MdNodeType {
    Doc,
    Paragraph,
    Heading,
    CodeBlock,
    MathBlock,
    MathInline,
    Blockquote,
    BulletList,
    OrderedList,
    ListItem,
    TaskList,
    TaskItem,
    Table,
    TableRow,
    TableCell,
    TableHeader,
    Image,
    HorizontalRule,
    Frontmatter,
    Footnote,
    Text,
    HardBreak,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MdMark {
    pub mark_type: MdMarkType,
    pub attrs: HashMap<String, serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum MdMarkType {
    Bold,
    Italic,
    Strikethrough,
    Code,
    Link,
    Highlight,
}
```

#### 3.3.2 Parse Pipeline

```rust
// src-tauri/src/markdown/parser.rs

use comrak::{parse_document, Arena, Options};
use comrak::nodes::AstNode;

pub fn parse_markdown(markdown: &str) -> MdNode {
    let arena = Arena::new();
    let options = comrak_options(); // GFM, footnotes, math, frontmatter ON
    let root = parse_document(&arena, markdown, &options);
    comrak_ast_to_mdnode(root)
}

fn comrak_options() -> Options {
    let mut opts = Options::default();
    opts.extension.strikethrough = true;
    opts.extension.table = true;
    opts.extension.tasklist = true;
    opts.extension.footnotes = true;
    opts.extension.math_dollars = true;
    opts.extension.front_matter_delimiter = Some("---".to_string());
    opts.render.unsafe_ = true; // allow raw HTML pass-through
    opts
}
```

#### 3.3.3 ProseMirror JSON Conversion

```rust
// src-tauri/src/markdown/prosemirror.rs

use serde_json::json;

/// Convert our intermediate AST to ProseMirror-compatible JSON.
/// This JSON is what TipTap's editor.commands.setContent() accepts.
pub fn mdnode_to_prosemirror(node: &MdNode) -> serde_json::Value {
    // Recursive conversion.
    // MdNodeType::Heading { level: 2 } ->
    //   { "type": "heading", "attrs": { "level": 2 }, "content": [...] }
    // MdNodeType::Text with marks ->
    //   { "type": "text", "text": "hello", "marks": [{ "type": "bold" }] }
    // ... etc.
}

/// Convert ProseMirror JSON back to our intermediate AST.
pub fn prosemirror_to_mdnode(json: &serde_json::Value) -> MdNode {
    // Reverse of above.
}
```

#### 3.3.4 Serialize Pipeline

```rust
// src-tauri/src/markdown/serializer.rs

/// Convert intermediate AST back to a markdown string.
/// This is a custom serializer (not comrak's renderer) to preserve formatting.
pub fn serialize_markdown(node: &MdNode) -> String {
    let mut output = String::new();
    serialize_node(node, &mut output, 0);
    output
}

fn serialize_node(node: &MdNode, out: &mut String, indent: usize) {
    match node.node_type {
        MdNodeType::Heading => {
            let level = node.attrs.get("level").unwrap().as_u64().unwrap();
            out.push_str(&"#".repeat(level as usize));
            out.push(' ');
            serialize_inline_content(&node.content, out);
            out.push_str("\n\n");
        },
        MdNodeType::CodeBlock => {
            let lang = node.attrs.get("language")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            out.push_str(&format\!("```{}\n", lang));
            if let Some(text) = &node.text {
                out.push_str(text);
            }
            out.push_str("\n```\n\n");
        },
        // ... all other node types ...
    }
}
```

### 3.4 Roundtrip Fidelity Strategy

Perfect roundtrip (parse then serialize yields identical markdown) is **not guaranteed** and **not a goal**. Instead we target:

1. **Semantic equivalence**: The meaning is preserved (same HTML rendering).
2. **Normalized formatting**: Output uses consistent style (ATX headings, `-` for bullets, etc.).
3. **Content preservation**: No user text is lost.
4. **Whitespace normalization**: Trailing spaces, blank line counts may change.

A comprehensive roundtrip test suite (`src-tauri/tests/markdown_roundtrip.rs`) validates that parse-then-serialize-then-parse produces the same AST.

---

## 4. File Management

### 4.1 Data Model

```typescript
// src/types/file.ts

export interface FileNode {
  id: string           // SHA-256 of absolute path (stable identifier)
  name: string         // "README.md"
  path: string         // Absolute path on disk
  extension: string    // "md"
  isDirectory: false
  size: number         // bytes
  modifiedAt: number   // Unix timestamp ms
}

export interface FolderNode {
  id: string
  name: string
  path: string
  isDirectory: true
  children: TreeNode[]
  expanded: boolean    // UI state only (not persisted in Rust)
}

export type TreeNode = FileNode | FolderNode

export interface OpenFile {
  path: string
  isDirty: boolean
  lastSavedContent: string   // markdown string at last save
}
```

### 4.2 Folder Opening and Tree Building

```
User: "Open Folder" (via menu or drag-and-drop)
    │
    ▼
Frontend: invoke('open_folder', { path })
    │
    ▼
Rust:
  1. Recursively reads directory (max depth: 10)
  2. Filters: only .md, .markdown, .txt, .mdx files shown (folders always shown)
  3. Sorts: folders first, then alphabetical
  4. Returns: Vec<TreeNode> (serialized as JSON)
  5. Starts file watcher on the folder
    │
    ▼
Frontend: stores tree in file-store, renders sidebar
```

### 4.3 File Watcher

```rust
// src-tauri/src/watcher/mod.rs

use notify::{Watcher, RecursiveMode, Event, EventKind};
use tauri::Emitter;

pub fn start_watcher(
    app_handle: tauri::AppHandle,
    path: &Path,
) -> notify::Result<()> {
    let (tx, rx) = std::sync::mpsc::channel();
    let mut watcher = notify::recommended_watcher(tx)?;
    watcher.watch(path, RecursiveMode::Recursive)?;

    std::thread::spawn(move || {
        // Debounce: collect events for 200ms before emitting
        for event in rx {
            match event {
                Ok(Event { kind: EventKind::Modify(_), paths, .. }) => {
                    app_handle.emit("file-changed", &paths).ok();
                },
                Ok(Event { kind: EventKind::Create(_), paths, .. }) => {
                    app_handle.emit("file-created", &paths).ok();
                },
                Ok(Event { kind: EventKind::Remove(_), paths, .. }) => {
                    app_handle.emit("file-deleted", &paths).ok();
                },
                _ => {}
            }
        }
    });

    Ok(())
}
```

Frontend listens via `useFileWatcher` hook:

```typescript
// src/hooks/useFileWatcher.ts
import { listen } from '@tauri-apps/api/event'

export function useFileWatcher() {
  useEffect(() => {
    const unlisten = listen<string[]>('file-changed', (event) => {
      const paths = event.payload
      // If the currently open file changed externally:
      //   -> Show "file changed on disk" banner
      //   -> Offer to reload
      // If a file in the tree was added/removed:
      //   -> Refresh the file tree
    })
    return () => { unlisten.then(fn => fn()) }
  }, [])
}
```

### 4.4 File Operations

| Operation | Frontend Action | Rust Command | Notes |
|-----------|----------------|--------------|-------|
| Open file | Click in sidebar | `read_file` | Returns raw markdown string |
| Save file | Ctrl+S / auto-save | `write_file` | Atomic write (temp + rename) |
| New file | Ctrl+N | `create_file` | Creates on disk immediately |
| Delete file | Context menu | `delete_file` | Moves to OS trash (not permanent) |
| Rename file | Context menu / F2 | `rename_file` | Also updates watcher |
| New folder | Context menu | `create_folder` | |
| Move file | Drag in sidebar | `move_file` | fs::rename |

### 4.5 Auto-Save

```typescript
// src/hooks/useAutoSave.ts

const DEBOUNCE_MS = 1000

export function useAutoSave(editor: Editor | null) {
  const { activeFile, markClean } = useFileStore()
  const timeoutRef = useRef<number>()

  useEffect(() => {
    if (\!editor || \!activeFile) return

    const handler = () => {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = window.setTimeout(async () => {
        const docJson = editor.getJSON()
        const markdown = await serializeMarkdown(docJson)
        await writeFile(activeFile.path, markdown)
        markClean(activeFile.path)
      }, DEBOUNCE_MS)
    }

    editor.on('update', handler)
    return () => {
      editor.off('update', handler)
      clearTimeout(timeoutRef.current)
    }
  }, [editor, activeFile])
}
```

---

## 5. Theme System

### 5.1 Architecture

Themes are pure CSS variable overrides. No JavaScript theme objects.

```
Theme loading:
  1. User selects theme (or app loads saved preference)
  2. Frontend calls invoke('load_theme', { name })
  3. Rust reads theme.css from themes directory
  4. Frontend injects CSS into a <style id="theme-vars"> element
  5. All UI components reference CSS variables
```

### 5.2 CSS Variable Contract

```css
/* src/styles/globals.css */

:root {
  /* -- Surface colors -- */
  --bg-primary: #ffffff;
  --bg-secondary: #f8f9fa;
  --bg-tertiary: #e9ecef;
  --bg-sidebar: #f1f3f5;

  /* -- Text colors -- */
  --text-primary: #212529;
  --text-secondary: #495057;
  --text-muted: #868e96;
  --text-link: #228be6;

  /* -- Editor-specific -- */
  --editor-bg: #ffffff;
  --editor-text: #212529;
  --editor-heading: #212529;
  --editor-code-bg: #f1f3f5;
  --editor-code-text: #e03131;
  --editor-blockquote-border: #ced4da;
  --editor-blockquote-text: #495057;
  --editor-hr: #dee2e6;
  --editor-syntax: #868e96;       /* markdown syntax tokens */
  --editor-selection: #d0ebff;
  --editor-cursor: #212529;
  --editor-line-height: 1.75;

  /* -- Typography -- */
  --font-sans: 'Inter', -apple-system, sans-serif;
  --font-serif: 'Georgia', serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
  --font-size-base: 16px;

  /* -- Borders & Shadows -- */
  --border-color: #dee2e6;
  --border-radius: 6px;
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);

  /* -- Sidebar -- */
  --sidebar-width: 260px;
  --sidebar-item-hover: #e9ecef;
  --sidebar-item-active: #d0ebff;

  /* -- Status bar -- */
  --statusbar-bg: #f1f3f5;
  --statusbar-text: #495057;
}
```

### 5.3 Theme File Format

```css
/* themes/dark.css */
/* Open Typora Theme: Dark */
/* Version: 1.0 */

:root[data-theme="dark"] {
  --bg-primary: #1a1b1e;
  --bg-secondary: #25262b;
  --bg-tertiary: #2c2e33;
  --bg-sidebar: #1a1b1e;
  --text-primary: #c1c2c5;
  --text-secondary: #909296;
  --text-muted: #5c5f66;
  --text-link: #4dabf7;
  --editor-bg: #1a1b1e;
  --editor-text: #c1c2c5;
  /* ... all variables overridden ... */
}
```

### 5.4 Theme Discovery

Themes are stored in a well-known directory:
- macOS: `~/Library/Application Support/com.open-typora.app/themes/`
- Linux: `~/.config/open-typora/themes/`
- Windows: `%APPDATA%\open-typora\themes\`

Built-in themes (`light.css`, `dark.css`, `sepia.css`) are bundled in the app and copied to the themes directory on first launch if not already present. Users can add custom `.css` files to this directory and they appear in the theme picker.

### 5.5 Dark/Light Mode

The app respects the OS preference by default (`prefers-color-scheme` media query), but users can override in settings. The `data-theme` attribute on `<html>` determines which theme CSS variables apply.

---

## 6. State Management

### 6.1 State Ownership Map

| State | Owner | Persistence | Reason |
|-------|-------|-------------|--------|
| Document content (ProseMirror doc) | TipTap Editor instance | Auto-saved to disk as markdown | ProseMirror manages its own state; we do not duplicate it |
| Editor mode (wysiwyg/source) | `editor-store` (Zustand) | Not persisted | Resets to WYSIWYG on file open |
| Cursor position, selection | TipTap Editor instance | Not persisted | Ephemeral |
| Undo/redo history | TipTap Editor instance | Not persisted | ProseMirror's built-in history |
| File tree structure | `file-store` (Zustand) | Refreshed from disk | Source of truth is filesystem |
| Open files list, active file | `file-store` (Zustand) | Persisted to local config | Restored on app relaunch |
| Dirty flags per file | `file-store` (Zustand) | Not persisted | Computed from content comparison |
| Current theme | `theme-store` (Zustand) | Persisted to local config | User preference |
| Sidebar open/closed | `app-store` (Zustand) | Persisted to local config | UI preference |
| Sidebar width | `app-store` (Zustand) | Persisted to local config | UI preference |
| Window size/position | Tauri (Rust) | Tauri persists automatically | Built-in Tauri feature |
| Recent files/folders | Rust `AppState` | Persisted to config file | Shown in welcome/menu |

### 6.2 Zustand Store Definitions

```typescript
// src/stores/editor-store.ts
interface EditorState {
  mode: 'wysiwyg' | 'source'
  setMode: (mode: 'wysiwyg' | 'source') => void
  wordCount: number
  charCount: number
  updateCounts: (wc: number, cc: number) => void
}

// src/stores/file-store.ts
interface FileState {
  rootPath: string | null
  tree: TreeNode[]
  openFiles: Map<string, OpenFile>  // path -> OpenFile
  activeFilePath: string | null

  setRootPath: (path: string) => void
  setTree: (tree: TreeNode[]) => void
  openFile: (path: string) => void
  closeFile: (path: string) => void
  setActiveFile: (path: string) => void
  markDirty: (path: string) => void
  markClean: (path: string) => void
}

// src/stores/theme-store.ts
interface ThemeState {
  currentTheme: string       // "light" | "dark" | "sepia" | custom name
  availableThemes: string[]
  setTheme: (name: string) => void
  loadThemeList: () => Promise<void>
}

// src/stores/app-store.ts
interface AppState {
  sidebarOpen: boolean
  sidebarWidth: number
  toggleSidebar: () => void
  setSidebarWidth: (w: number) => void
}
```

### 6.3 Persistence Layer

User preferences are stored in a JSON config file managed by Rust:

```
// Config path (same directory as themes):
// macOS: ~/Library/Application Support/com.open-typora.app/config.json

{
  "theme": "dark",
  "sidebarOpen": true,
  "sidebarWidth": 280,
  "recentFolders": ["/Users/rong/notes", "/Users/rong/blog"],
  "recentFiles": ["/Users/rong/notes/todo.md"],
  "lastOpenFolder": "/Users/rong/notes",
  "lastOpenFiles": ["/Users/rong/notes/todo.md"],
  "autoSave": true,
  "autoSaveDelay": 1000,
  "fontSize": 16,
  "fontFamily": "default"
}
```

---

## 7. IPC Design

### 7.1 Tauri Command Definitions

All commands follow a consistent pattern: they return `Result<T, AppError>` which serializes to `{ data: T } | { error: string }` across the IPC boundary.

```rust
// src-tauri/src/error.rs

use serde::Serialize;

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("File not found: {0}")]
    FileNotFound(String),

    #[error("Parse error: {0}")]
    ParseError(String),

    #[error("Serialization error: {0}")]
    SerializationError(String),

    #[error("Export error: {0}")]
    ExportError(String),
}

// Tauri 2 requires Serialize for error types in commands
impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where S: serde::Serializer {
        serializer.serialize_str(&self.to_string())
    }
}

pub type AppResult<T> = Result<T, AppError>;
```

### 7.2 Command Catalog

#### File Commands (`src-tauri/src/commands/file.rs`)

```rust
#[tauri::command]
pub async fn read_file(path: String) -> AppResult<String>
// Returns: raw file content as UTF-8 string

#[tauri::command]
pub async fn write_file(path: String, content: String) -> AppResult<()>
// Atomic write: writes to .tmp, then renames

#[tauri::command]
pub async fn create_file(path: String) -> AppResult<()>
// Creates empty file, errors if exists

#[tauri::command]
pub async fn delete_file(path: String) -> AppResult<()>
// Moves to OS trash (trash crate)

#[tauri::command]
pub async fn rename_file(old_path: String, new_path: String) -> AppResult<()>

#[tauri::command]
pub async fn move_file(source: String, destination: String) -> AppResult<()>

#[tauri::command]
pub async fn file_exists(path: String) -> AppResult<bool>

#[tauri::command]
pub async fn get_file_meta(path: String) -> AppResult<FileMeta>
// Returns: { size, modified_at, created_at }
```

#### Folder Commands (`src-tauri/src/commands/folder.rs`)

```rust
#[tauri::command]
pub async fn open_folder(
    app_handle: tauri::AppHandle,
    path: String
) -> AppResult<Vec<TreeNode>>
// Reads directory tree AND starts file watcher

#[tauri::command]
pub async fn create_folder(path: String) -> AppResult<()>

#[tauri::command]
pub async fn list_directory(path: String) -> AppResult<Vec<TreeNode>>
// Reads single directory level (for lazy-loading deep trees)

#[tauri::command]
pub async fn select_folder_dialog() -> AppResult<Option<String>>
// Opens native OS folder picker dialog
```

#### Markdown Commands (`src-tauri/src/commands/markdown.rs`)

```rust
#[tauri::command]
pub async fn parse_markdown(markdown: String) -> AppResult<serde_json::Value>
// Input: raw markdown string
// Output: ProseMirror-compatible JSON document

#[tauri::command]
pub async fn serialize_markdown(doc_json: serde_json::Value) -> AppResult<String>
// Input: ProseMirror JSON document
// Output: markdown string
```

#### Export Commands (`src-tauri/src/commands/export.rs`)

```rust
#[tauri::command]
pub async fn export_html(
    markdown: String,
    theme: String,
    standalone: bool,     // include full HTML document with CSS
) -> AppResult<String>

#[tauri::command]
pub async fn export_pdf(
    app_handle: tauri::AppHandle,
    markdown: String,
    output_path: String,
    theme: String,
) -> AppResult<()>
// Strategy: render HTML with theme CSS, then use headless browser to print to PDF

#[tauri::command]
pub async fn export_docx(
    markdown: String,
    output_path: String,
) -> AppResult<()>

#[tauri::command]
pub async fn select_save_dialog(
    default_name: String,
    filters: Vec<DialogFilter>,
) -> AppResult<Option<String>>
// Opens native "Save As" dialog
```

#### Theme Commands (`src-tauri/src/commands/theme.rs`)

```rust
#[tauri::command]
pub async fn list_themes() -> AppResult<Vec<ThemeInfo>>
// Scans themes directory, returns list of { name, path, is_builtin }

#[tauri::command]
pub async fn load_theme(name: String) -> AppResult<String>
// Returns: CSS content of the theme file

#[tauri::command]
pub async fn save_config(config: AppConfig) -> AppResult<()>

#[tauri::command]
pub async fn load_config() -> AppResult<AppConfig>
```

### 7.3 Event Catalog (Rust -> Frontend)

| Event Name | Payload | Trigger |
|------------|---------|---------|
| `file-changed` | `string[]` (paths) | File modified on disk |
| `file-created` | `string[]` (paths) | New file detected in watched folder |
| `file-deleted` | `string[]` (paths) | File removed from watched folder |
| `export-progress` | `{ percent: number, stage: string }` | During PDF/DOCX export |
| `menu-action` | `string` (action name) | Native menu item clicked |

### 7.4 Frontend Service Layer

```typescript
// src/services/file-service.ts
import { invoke } from '@tauri-apps/api/core'

export const fileService = {
  readFile: (path: string): Promise<string> =>
    invoke('read_file', { path }),

  writeFile: (path: string, content: string): Promise<void> =>
    invoke('write_file', { path, content }),

  createFile: (path: string): Promise<void> =>
    invoke('create_file', { path }),

  deleteFile: (path: string): Promise<void> =>
    invoke('delete_file', { path }),

  renameFile: (oldPath: string, newPath: string): Promise<void> =>
    invoke('rename_file', { oldPath, newPath }),
}
```

```typescript
// src/services/markdown-service.ts
export const markdownService = {
  parse: (markdown: string): Promise<ProseMirrorDoc> =>
    invoke('parse_markdown', { markdown }),

  serialize: (docJson: ProseMirrorDoc): Promise<string> =>
    invoke('serialize_markdown', { docJson }),
}
```

---

## 8. Phase Plan

### Phase 0: Project Scaffolding (Week 1)

**Milestone**: App launches, shows empty window with custom title bar.

- Initialize Tauri 2 project with React + TypeScript + Vite template
- Configure Tailwind CSS
- Set up project directory structure as specified in Section 1
- Create `AppShell` layout component (sidebar placeholder + editor placeholder)
- Custom frameless window with title bar (drag region, traffic lights / window controls)
- Set up Zustand stores (empty shells with type definitions)
- Set up Rust module structure with `mod.rs` files
- Configure `tauri.conf.json` (window settings, app ID, permissions)
- Set up `capabilities/default.json` for Tauri 2 permissions
- Basic CI: `cargo check`, `tsc --noEmit`, `npm run build`

**Deliverable**: `npm run tauri dev` opens a frameless window with a split layout.

---

### Phase 1: Basic Editor + File Open/Save (Weeks 2-3)

**Milestone**: Open a `.md` file, edit it in WYSIWYG mode, save it.

#### Phase 1a: Rust Markdown Pipeline
- Add `comrak` dependency, implement `parser.rs` (markdown string -> MdNode AST)
- Implement `prosemirror.rs` (MdNode -> ProseMirror JSON, and reverse)
- Implement `serializer.rs` (MdNode -> markdown string)
- Implement `parse_markdown` and `serialize_markdown` Tauri commands
- Write roundtrip tests for: headings, paragraphs, bold/italic, links, lists, code blocks, blockquotes, images, horizontal rules
- **Do NOT implement** math, footnotes, front matter, or tables yet

#### Phase 1b: TipTap Editor Setup
- Install TipTap packages, create `createEditor` factory
- Configure StarterKit (paragraphs, bold, italic, lists, hard break)
- Create custom `MarkdownHeading` extension with Typora-style reveal (show `#` on focus)
- Create custom `MarkdownCodeBlock` extension with lowlight highlighting
- Create custom `MarkdownBlockquote` extension
- Create custom `MarkdownLink` extension (clickable, editable on selection)
- Create custom `MarkdownImage` extension (basic: render `<img>`, no upload yet)
- Create custom `MarkdownHorizontalRule` extension
- Implement input rules: `# `, `## `, `> `, `- `, `1. `, `---`, triple backtick
- Write `editor.css` with base ProseMirror styling

#### Phase 1c: File Open/Save Integration
- Implement `read_file` and `write_file` Rust commands (atomic write)
- Implement frontend `file-service.ts` and `markdown-service.ts`
- Wire up: menu "Open File" -> native dialog -> read file -> parse -> load into TipTap
- Wire up: Ctrl+S -> serialize TipTap doc -> write file
- Implement `useAutoSave` hook (debounced 1s)
- Show file name in title bar
- Show dirty indicator (dot/bullet) when unsaved changes exist

**Deliverable**: Open `README.md`, see it rendered as WYSIWYG. Edit headings (see `#` when focused). Save with Ctrl+S. Auto-save works.

---

### Phase 2: Source Mode + File Sidebar (Weeks 4-5)

**Milestone**: Toggle between WYSIWYG and source mode. Browse and manage files in sidebar.

#### Phase 2a: Source Code Mode
- Install CodeMirror 6 packages (`@codemirror/view`, `@codemirror/lang-markdown`)
- Create `SourceEditor.tsx` component
- Create `EditorSwitcher.tsx` with mode toggle button (Ctrl+/)
- Implement toggle flow: WYSIWYG -> serialize -> source, source -> parse -> WYSIWYG
- Preserve approximate scroll position across toggle

#### Phase 2b: File Tree Sidebar
- Implement `open_folder` and `list_directory` Rust commands
- Implement `select_folder_dialog` Rust command
- Build `FileTree.tsx`, `FileTreeItem.tsx` recursive components
- File tree features: click to open, folder expand/collapse, file icons by type
- Implement `create_file`, `create_folder`, `delete_file`, `rename_file` Rust commands
- Build `FileTreeContext.tsx` right-click menu (New File, New Folder, Rename, Delete)
- Implement sidebar resize (draggable divider)
- Implement sidebar toggle (Ctrl+B)

#### Phase 2c: File Watcher
- Add `notify` crate, implement watcher module
- Emit Tauri events on file changes
- Frontend `useFileWatcher` hook: refresh tree on create/delete, show banner on external edit of open file

#### Phase 2d: Multi-File Tab Bar (Stretch)
- Tab bar component showing open files
- Click tab to switch, middle-click to close
- Dirty dot on unsaved tabs
- Tab overflow scrolling

**Deliverable**: Full editing workflow -- browse files in sidebar, open them, edit in WYSIWYG or source mode, auto-save, see external changes reflected.

---

### Phase 3: Theme System (Week 6)

**Milestone**: Switch between light, dark, and sepia themes. Custom themes loadable.

- Define CSS variable contract in `globals.css` (all variables from Section 5.2)
- Create `light.css`, `dark.css`, `sepia.css` built-in themes
- Implement `list_themes` and `load_theme` Rust commands
- Implement `theme-store.ts` with Zustand
- Create theme picker UI (settings panel or dropdown in status bar)
- Implement `useTheme` hook: loads CSS, injects into DOM, sets `data-theme` attribute
- Respect OS dark mode preference by default (`prefers-color-scheme`)
- Implement `save_config` / `load_config` for persisting theme choice
- Apply theme to editor content, sidebar, title bar, and status bar

**Deliverable**: User can switch themes. Dark mode works. Closing and reopening the app remembers the theme.

---

### Phase 4: Image Management + Export (Weeks 7-8)

**Milestone**: Paste/drag images into editor. Export to PDF, HTML, Word.

#### Phase 4a: Image Management
- Enhance `MarkdownImage` extension: drag-and-drop handler, paste handler
- Rust command `save_image`: receives binary data, saves to `./assets/` relative to doc
- Tauri asset protocol configuration for serving local images in webview
- Image resize handles in editor (optional: width attribute in markdown as HTML comment)
- Image popover on click: alt text, path display, open in system viewer

#### Phase 4b: Export
- Implement `export_html` Rust command: comrak render with theme CSS wrapping
- Implement `export_pdf` Rust command: HTML -> PDF via headless chromium (`headless_chrome` crate) or print-to-PDF API
- Implement `export_docx` Rust command via `docx-rs` crate
- Export dialog UI: format picker, theme selection for PDF, output path
- Progress events during export

**Deliverable**: User can paste images, they are saved alongside the document. Export to PDF/HTML/DOCX works from menu.

---

### Phase 5: Math + Code Blocks + Polish (Weeks 9-10)

**Milestone**: LaTeX math rendering. Full syntax highlighting. Table editing.

#### Phase 5a: Math Formulas
- Install `katex` npm package
- Implement `MarkdownMathBlock` extension: `$$...$$` blocks, KaTeX rendering when not focused, LaTeX textarea when focused
- Implement `MarkdownMathInline` extension: `$...$` inline, KaTeX rendering
- Add math support to comrak options and roundtrip tests
- Input rules: `$$` + Enter creates math block

#### Phase 5b: Enhanced Code Blocks
- Full language selector dropdown for code blocks
- Copy button on code blocks
- Line numbers (optional, CSS-based)
- Expand lowlight language list

#### Phase 5c: Table Editing
- Implement `MarkdownTable` extension using `@tiptap/extension-table`
- Add GFM alignment support
- Table toolbar: add/remove row/column, alignment buttons
- Tab key navigation between cells

#### Phase 5d: Remaining Extensions
- `MarkdownFrontmatter`: collapsible YAML block
- `MarkdownFootnote`: footnote references and definitions
- `MarkdownTaskList`: checkbox toggling

#### Phase 5e: Polish
- Status bar: word count, character count, line count, cursor position
- Keyboard shortcuts help dialog
- Welcome screen when no file is open
- Recent files list
- Drag-and-drop `.md` file onto window to open
- Window title: `filename.md - Open Typora`
- Native menu bar (File, Edit, View, Format, Help)

**Deliverable**: Feature-complete MVP. All five priority features implemented.

---

### Phase Summary

| Phase | Duration | Key Milestone |
|-------|----------|---------------|
| 0 - Scaffolding | 1 week | App launches with layout shell |
| 1 - Editor + File I/O | 2 weeks | Open, edit, save markdown files in WYSIWYG mode |
| 2 - Source Mode + Sidebar | 2 weeks | Full editing workflow with file management |
| 3 - Themes | 1 week | Light/dark/custom themes |
| 4 - Images + Export | 2 weeks | Image paste/drag, PDF/HTML/DOCX export |
| 5 - Math + Polish | 2 weeks | Feature-complete MVP |
| **Total** | **10 weeks** | |

---

## Appendix A: Key Design Decisions

### ADR-001: Rust-Side Markdown Processing
- **Decision**: Markdown parsing and serialization happen in Rust (comrak), not JavaScript.
- **Rationale**: Single source of truth for parsing rules. The same AST feeds both the editor (via ProseMirror JSON) and export (via HTML/PDF renderers). Avoids maintaining two parsers in two languages.
- **Trade-off**: Each save/load requires an IPC round-trip. Benchmarks show <5ms for a 100KB document, which is acceptable.

### ADR-002: Two Separate Editor Instances for WYSIWYG/Source
- **Decision**: WYSIWYG (TipTap) and source mode (CodeMirror 6) are separate components, only one mounted at a time.
- **Alternative considered**: Single ProseMirror editor with a "raw text" decoration mode. Rejected because ProseMirror's schema enforcement makes raw text editing extremely awkward.
- **Trade-off**: Cursor position is not preserved across toggles. Scroll position is approximately preserved.

### ADR-003: Zustand over Redux/Jotai/Context
- **Decision**: Zustand for all frontend state management.
- **Rationale**: Minimal boilerplate, excellent TypeScript support, no provider wrapping, works well with React 18+ concurrent features. TipTap editor state is NOT in Zustand (TipTap manages its own state); Zustand only holds UI state and file metadata.

### ADR-004: CSS Variables for Theming (No JS Theme Objects)
- **Decision**: Themes are pure CSS files that override CSS custom properties.
- **Rationale**: Zero runtime cost for theme switching (no re-render). Users can create themes with just CSS knowledge. Editor content inherits theme via CSS cascade naturally. Third-party theme ecosystem is easy (just drop a `.css` file).

### ADR-005: Atomic File Writes
- **Decision**: All file saves use write-to-temp-then-rename.
- **Rationale**: Prevents data loss from crashes or power failure during write. The rename operation is atomic on all target platforms.

### ADR-006: File Watcher with Debounce
- **Decision**: Use `notify` crate with 200ms debounce.
- **Rationale**: Detects external edits (e.g., git pull, other editors) without polling. Debounce prevents event flood during batch operations (e.g., git checkout).

---

## Appendix B: Technology Version Targets

| Technology | Version | Notes |
|------------|---------|-------|
| Tauri | 2.x (latest stable) | Tauri 2 for mobile readiness |
| React | 19.x | Latest stable |
| TypeScript | 5.x | Strict mode enabled |
| TipTap | 2.x | ProseMirror wrapper |
| CodeMirror | 6.x | Source mode editor |
| Vite | 6.x | Build tool |
| Tailwind CSS | 4.x | Utility CSS |
| comrak | 0.x (latest) | GFM markdown parser |
| notify | 7.x | File system watcher |
| Rust | 1.8x+ (stable) | Latest stable toolchain |
| Node.js | 22.x LTS | Build-time only |

---

## Appendix C: Future Considerations (Post-MVP)

These are explicitly out of scope for the MVP but should not be architecturally blocked:

- **Mobile (iOS/Android)**: Tauri 2 supports mobile targets. The React frontend and Rust backend are reusable. Touch-friendly toolbar will be needed.
- **Plugin system**: TipTap's extension architecture naturally supports plugins. A plugin API can expose extension registration + theme registration.
- **Collaboration**: ProseMirror supports collaborative editing via OT or CRDT. This would require a network layer (WebSocket server or peer-to-peer). The architecture does not preclude this.
- **Vim/Emacs keybindings**: CodeMirror 6 has vim mode. TipTap can have custom keymaps.
- **Spell check**: Tauri webview provides OS-level spell check on macOS/Windows. Linux may need hunspell integration.
- **i18n**: All user-facing strings should be externalized from Phase 3 onward.
- **Cloud sync**: Could be added as a Rust module that syncs the file system directory (e.g., via rclone or custom S3 integration).
