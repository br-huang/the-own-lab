# Implementation Plan: URL Ingestor (Phase 2)

## Prerequisites

- The project is at `/Users/rong/Workspaces/1-Projects/11-Brian-Projects/110-Obsidian-RAG/`
- You have read REQUIREMENTS.md and DESIGN.md in `docs/specs/2026-04-08-url-ingestor/`
- Node.js and npm are available
- The project builds successfully before you start (`npm run build`)

---

## Steps

### Step 1: Install dependencies

- **File(s)**: `package.json` (modified by npm, do not edit manually)
- **What to do**: Run the following command from the project root:
  ```bash
  npm install @mozilla/readability turndown && npm install --save-dev @types/turndown
  ```
  This adds two runtime dependencies and one dev dependency. `@mozilla/readability` ships its own TypeScript types so no separate `@types/` package is needed for it.
- **Do NOT**: Add these packages to the `external` array in `esbuild.config.mjs`. They must be bundled into `main.js`, not treated as external. Do not modify `esbuild.config.mjs` at all.
- **Verification**: Run `npm ls @mozilla/readability turndown @types/turndown` — all three should appear without errors. Run `npm run build` — it should still succeed (no import of the new packages yet, so no change to output).

---

### Step 2: Update `src/types.ts` — add `ingestFolder` setting

- **File(s)**: `src/types.ts`
- **What to do**:
  1. Add `ingestFolder: string;` as the last field in the `PluginSettings` interface (after `chunkOverlap`).
  2. Add `ingestFolder: "Ingested",` as the last field in the `DEFAULT_SETTINGS` object (after `chunkOverlap: 50`).
- **Do NOT**: Change any existing fields, types, or interfaces. Do not reorder existing fields.
- **Verification**: Run `npx tsc --noEmit`. It should compile with zero errors. The existing code uses `Object.assign({}, DEFAULT_SETTINGS, await this.loadData())` in `loadSettings()`, so existing users without this field in their saved data will automatically get the `"Ingested"` default.

---

### Step 3: Create `src/ingestor/video-detector.ts`

- **File(s)**: `src/ingestor/video-detector.ts` (new file, new directory `src/ingestor/`)
- **What to do**: Create the directory `src/ingestor/` and the file with this exact implementation:

  ```typescript
  /**
   * Detects whether a URL points to a video platform that requires
   * specialized handling (not yet implemented).
   */
  export function detectVideoProvider(url: string): "youtube" | "bilibili" | null {
    let hostname: string;
    try {
      hostname = new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return null;
    }

    const youtubeHosts = ["youtube.com", "youtu.be"];
    if (youtubeHosts.includes(hostname)) {
      return "youtube";
    }

    const bilibiliHosts = ["bilibili.com", "b23.tv"];
    if (bilibiliHosts.includes(hostname)) {
      return "bilibili";
    }

    return null;
  }
  ```

  Key details:
  - Uses the `URL` constructor for reliable hostname parsing (not regex on the raw string).
  - Strips the `www.` prefix before matching.
  - Returns `null` for invalid URLs (caught by try/catch) — the caller will handle the URL error downstream.
  - Matches exactly: `youtube.com`, `youtu.be`, `bilibili.com`, `b23.tv` (with or without `www.` prefix).

- **Do NOT**: Import anything from `obsidian`. This is a pure utility function with no dependencies.
- **Verification**: Run `npx tsc --noEmit` — zero errors. Read the file and confirm the function signature is `detectVideoProvider(url: string): "youtube" | "bilibili" | null`.

---

### Step 4: Create `src/ingestor/url-ingestor.ts`

- **File(s)**: `src/ingestor/url-ingestor.ts` (new file)
- **What to do**: Create the core ingestion module. The file must export these types and the `UrlIngestor` class:

  ```typescript
  import { Vault, requestUrl } from "obsidian";
  import { Readability } from "@mozilla/readability";
  import TurndownService from "turndown";
  import { detectVideoProvider } from "./video-detector";

  /** Progress phases reported to the caller */
  export type IngestPhase = "fetching" | "extracting" | "saving";

  /** Successful ingestion result */
  export interface IngestResult {
    title: string;
    filePath: string;
  }

  /** Callback for progress updates */
  export type OnProgress = (phase: IngestPhase) => void;

  export class UrlIngestor {
    constructor(
      private vault: Vault,
      private getIngestFolder: () => string,
    ) {}

    async ingest(url: string, onProgress?: OnProgress): Promise<IngestResult> {
      // 1. Video provider check
      const videoProvider = detectVideoProvider(url);
      if (videoProvider) {
        throw new Error(
          "YouTube/Bilibili ingestion is not yet supported. This will be available in a future update."
        );
      }

      // 2. Fetch
      onProgress?.("fetching");
      const html = await this.fetchHtml(url);

      // 3. Extract
      onProgress?.("extracting");
      const article = this.extractArticle(html, url);

      // 4. Save
      onProgress?.("saving");
      const folder = this.getIngestFolder() || "Ingested";
      await this.ensureFolder(folder);

      const slug = this.slugify(article.title);
      const filePath = await this.resolveFilePath(folder, slug);

      const frontmatter = this.buildFrontmatter({
        url,
        title: article.title,
        author: article.byline,
        ingestedAt: new Date().toISOString(),
      });

      const markdown = this.htmlToMarkdown(article.content);
      const fullContent = frontmatter + "\n" + markdown;

      await this.vault.create(filePath, fullContent);

      return { title: article.title, filePath };
    }

    private async fetchHtml(url: string): Promise<string> {
      try {
        const response = await requestUrl({ url, method: "GET" });
        if (response.status < 200 || response.status >= 300) {
          throw new Error(`Failed to fetch URL: HTTP ${response.status}.`);
        }
        return response.text;
      } catch (err) {
        if (err instanceof Error && err.message.startsWith("Failed to fetch URL:")) {
          throw err;
        }
        throw new Error(`Failed to fetch URL: ${(err as Error).message}.`);
      }
    }

    private extractArticle(
      html: string,
      url: string,
    ): { title: string; content: string; byline: string | null } {
      const doc = new DOMParser().parseFromString(html, "text/html");
      const reader = new Readability(doc);
      const article = reader.parse();

      if (\!article) {
        throw new Error("Could not extract article content from this page.");
      }

      // Sanitize: strip img, iframe, script from extracted content
      const sanitizedContent = this.sanitizeHtml(article.content);

      const title = article.title || new URL(url).hostname;

      return {
        title,
        content: sanitizedContent,
        byline: article.byline || null,
      };
    }

    private sanitizeHtml(html: string): string {
      const doc = new DOMParser().parseFromString(html, "text/html");
      const tagsToRemove = ["img", "iframe", "script"];
      for (const tag of tagsToRemove) {
        doc.querySelectorAll(tag).forEach((el) => el.remove());
      }
      return doc.body.innerHTML;
    }

    private htmlToMarkdown(html: string): string {
      const turndown = new TurndownService({
        headingStyle: "atx",
        codeBlockStyle: "fenced",
      });
      return turndown.turndown(html);
    }

    private buildFrontmatter(meta: {
      url: string;
      title: string;
      author: string | null;
      ingestedAt: string;
    }): string {
      const lines: string[] = ["---"];
      lines.push(`url: "${meta.url}"`);
      lines.push(`title: "${meta.title.replace(/"/g, '\\"')}"`);
      if (meta.author) {
        lines.push(`author: "${meta.author.replace(/"/g, '\\"')}"`);
      }
      lines.push(`ingested_at: "${meta.ingestedAt}"`);
      lines.push(`source_type: "web"`);
      lines.push("---");
      return lines.join("\n") + "\n";
    }

    private slugify(title: string): string {
      let slug = title
        .toLowerCase()
        .replace(/[\s_]+/g, "-")       // spaces and underscores to hyphens
        .replace(/[^a-z0-9-]/g, "")    // strip non-alphanumeric except hyphens
        .replace(/-{2,}/g, "-")         // collapse consecutive hyphens
        .replace(/^-|-$/g, "");         // trim leading/trailing hyphens

      if (slug.length === 0) {
        slug = "ingested-page";
      }

      return slug.substring(0, 60);
    }

    private async resolveFilePath(folder: string, slug: string): Promise<string> {
      let candidate = `${folder}/${slug}.md`;
      if (\!this.vault.getAbstractFileByPath(candidate)) {
        return candidate;
      }

      for (let i = 2; i <= 100; i++) {
        candidate = `${folder}/${slug}-${i}.md`;
        if (\!this.vault.getAbstractFileByPath(candidate)) {
          return candidate;
        }
      }

      throw new Error("Failed to save note: too many files with the same name.");
    }

    private async ensureFolder(folderPath: string): Promise<void> {
      const existing = this.vault.getAbstractFileByPath(folderPath);
      if (existing) return;

      // Create nested folders if needed (e.g., "53-Knowledge/Ingested")
      const parts = folderPath.split("/");
      let current = "";
      for (const part of parts) {
        current = current ? `${current}/${part}` : part;
        if (\!this.vault.getAbstractFileByPath(current)) {
          try {
            await this.vault.createFolder(current);
          } catch {
            // Folder may have been created by another process; ignore
          }
        }
      }
    }
  }
  ```

  Key implementation details:
  - The constructor takes `vault: Vault` and `getIngestFolder: () => string` (a getter function so it always reads the current setting).
  - `fetchHtml` uses Obsidian's `requestUrl` (NOT Node `http` or browser `fetch`).
  - `extractArticle` uses Electron's native `DOMParser` (no jsdom needed) and `@mozilla/readability`.
  - `sanitizeHtml` strips `<img>`, `<iframe>`, `<script>` via a second DOMParser pass.
  - `htmlToMarkdown` uses Turndown with `atx` heading style and `fenced` code blocks.
  - `buildFrontmatter` omits the `author` line entirely when `author` is null (does NOT set it to empty string or null).
  - `slugify` lowercases, replaces spaces/underscores with hyphens, strips non-alphanumeric, collapses consecutive hyphens, trims, and truncates to 60 chars. Falls back to `"ingested-page"` if the slug is empty.
  - `resolveFilePath` checks for collisions with `vault.getAbstractFileByPath()` and appends `-2`, `-3`, etc. up to 100.
  - `ensureFolder` creates nested folders one level at a time (handles paths like `"53-Knowledge/Ingested"`).
  - All errors thrown use human-readable messages matching the spec.

- **Do NOT**: Use Node's `fs` module for file writes. Do not use browser `fetch()`. Do not add indexing code — the existing `VaultIndexer` watcher handles it via the `vault:create` event.
- **Verification**: Run `npx tsc --noEmit` — zero errors. Confirm the file exports `UrlIngestor`, `IngestResult`, `IngestPhase`, and `OnProgress`.

---

### Step 5: Create `src/ui/ingest-url-modal.ts`

- **File(s)**: `src/ui/ingest-url-modal.ts` (new file)
- **What to do**: Create the modal UI class:

  ```typescript
  import { App, Modal } from "obsidian";
  import { UrlIngestor, IngestPhase } from "../ingestor/url-ingestor";

  const PHASE_TEXT: Record<IngestPhase, string> = {
    fetching: "Fetching page...",
    extracting: "Extracting content...",
    saving: "Saving note...",
  };

  export class IngestUrlModal extends Modal {
    private urlInput\!: HTMLInputElement;
    private ingestBtn\!: HTMLButtonElement;
    private statusEl\!: HTMLElement;

    constructor(app: App, private ingestor: UrlIngestor) {
      super(app);
    }

    onOpen(): void {
      const { contentEl } = this;
      contentEl.empty();
      contentEl.addClass("kb-ingest-url-modal");

      contentEl.createEl("h3", { text: "Ingest URL" });

      this.urlInput = contentEl.createEl("input", {
        type: "url",
        placeholder: "https://example.com/article",
        cls: "kb-ingest-url-input",
      });
      this.urlInput.style.width = "100%";
      this.urlInput.style.marginBottom = "12px";
      this.urlInput.focus();

      this.urlInput.addEventListener("keydown", (e: KeyboardEvent) => {
        if (e.key === "Enter") {
          e.preventDefault();
          this.doIngest(this.urlInput.value);
        }
      });

      this.ingestBtn = contentEl.createEl("button", {
        text: "Ingest",
        cls: "mod-cta",
      });
      this.ingestBtn.addEventListener("click", () => {
        this.doIngest(this.urlInput.value);
      });

      this.statusEl = contentEl.createDiv({ cls: "kb-ingest-status" });
      this.statusEl.style.marginTop = "12px";
      this.statusEl.hide();
    }

    onClose(): void {
      this.contentEl.empty();
    }

    private async doIngest(url: string): Promise<void> {
      const trimmed = url.trim();
      if (\!trimmed) return;

      // Disable input and button during ingestion
      this.urlInput.disabled = true;
      this.ingestBtn.disabled = true;
      this.statusEl.show();
      this.statusEl.setText("Starting...");
      this.statusEl.removeClass("kb-ingest-error");

      try {
        const result = await this.ingestor.ingest(trimmed, (phase: IngestPhase) => {
          this.statusEl.setText(PHASE_TEXT[phase]);
        });

        this.statusEl.setText(`Saved: "${result.title}" → ${result.filePath}`);

        // Auto-close after 2 seconds
        setTimeout(() => {
          this.close();
        }, 2000);
      } catch (err) {
        this.statusEl.addClass("kb-ingest-error");
        this.statusEl.setText((err as Error).message);
        // Re-enable for retry
        this.urlInput.disabled = false;
        this.ingestBtn.disabled = false;
      }
    }
  }
  ```

  Key details:
  - Extends `obsidian.Modal` — Escape to close is built-in.
  - Input is auto-focused on open via `this.urlInput.focus()`.
  - Enter key on input triggers ingest (same as clicking the button).
  - During ingestion: input and button disabled, status shows phase text.
  - On success: shows title and file path, auto-closes after 2 seconds.
  - On failure: shows error (with `kb-ingest-error` CSS class for styling), re-enables input/button for retry.

- **Do NOT**: Add CSS styles in this step (the `kb-ingest-error` class can be styled later; it works without styles). Do not add any indexing logic.
- **Verification**: Run `npx tsc --noEmit` — zero errors.

---

### Step 6: Update `src/settings.ts` — add URL Ingestor section

- **File(s)**: `src/settings.ts`
- **What to do**: In the `display()` method, add a new "URL Ingestor" section **between** the "Chat (LLM)" section and the "Advanced" section. Find the line `containerEl.createEl("h3", { text: "Advanced" });` (currently line 54) and insert the following block **immediately before** that line:

  ```typescript
  // ─── URL Ingestor Section ───

  containerEl.createEl("h3", { text: "URL Ingestor" });

  new Setting(containerEl)
    .setName("Ingested Notes Folder")
    .setDesc("Vault folder where ingested web pages are saved.")
    .addText((text) =>
      text
        .setPlaceholder("Ingested")
        .setValue(this.plugin.settings.ingestFolder)
        .onChange(async (value) => {
          this.plugin.settings.ingestFolder = value;
          await this.plugin.saveSettings();
        })
    );
  ```

- **Do NOT**: Change any existing settings. Do not reorder sections. The "Chat (LLM)" section stays first, then "URL Ingestor", then "Advanced".
- **Verification**: Run `npx tsc --noEmit` — zero errors. The setting reads from and writes to `this.plugin.settings.ingestFolder`, which now exists thanks to Step 2.

---

### Step 7: Update `src/ui/chat-view.ts` — add URL detection and ingest handling

- **File(s)**: `src/ui/chat-view.ts`
- **What to do**: Make four changes to this file:

  **(7a)** Add an import at the top of the file (after the existing imports):
  ```typescript
  import { UrlIngestor, IngestPhase } from "../ingestor/url-ingestor";
  ```

  **(7b)** Add a new private field and update the constructor. The constructor currently has signature `constructor(leaf: WorkspaceLeaf, ragEngine: RagEngine)`. Change it to accept a third parameter:
  ```typescript
  private urlIngestor: UrlIngestor;

  constructor(leaf: WorkspaceLeaf, ragEngine: RagEngine, urlIngestor: UrlIngestor) {
    super(leaf);
    this.ragEngine = ragEngine;
    this.urlIngestor = urlIngestor;
  }
  ```

  **(7c)** Add URL detection at the top of `handleSubmit()`. Insert the following **after** the empty-check guard (`if (trimmed.length === 0) { return; }`) and **before** `this.inputEl.value = "";`:
  ```typescript
  // URL detection: if the entire message is a single URL, treat as ingest request
  if (/^https?:\/\/\S+$/.test(trimmed)) {
    this.inputEl.value = "";
    await this.handleUrlIngest(trimmed);
    return;
  }
  ```

  **(7d)** Add a new private method `handleUrlIngest` to the class (place it after `handleSubmit`):
  ```typescript
  private async handleUrlIngest(url: string): Promise<void> {
    this.setInputEnabled(false);
    this.addUserMessage(url);
    const bubbleEl = this.addAssistantMessage();

    const phaseText: Record<IngestPhase, string> = {
      fetching: "Fetching page...",
      extracting: "Extracting content...",
      saving: "Saving note...",
    };

    try {
      const contentEl = bubbleEl.querySelector(".kb-chat-content") as HTMLElement;

      const result = await this.urlIngestor.ingest(url, (phase: IngestPhase) => {
        if (contentEl) {
          contentEl.empty();
          contentEl.setText(phaseText[phase]);
          this.scrollToBottom();
        }
      });

      if (contentEl) {
        contentEl.empty();
        contentEl.setText(`Ingested: "${result.title}" → ${result.filePath}`);
      }
    } catch (err) {
      this.renderError(bubbleEl, (err as Error).message);
    } finally {
      this.setInputEnabled(true);
    }
  }
  ```

- **Do NOT**: Change the RAG query flow. The existing `for await (const response of this.ragEngine.query(trimmed))` block must remain untouched. Do not change the `CHAT_VIEW_TYPE` constant, `getViewType`, `getDisplayText`, `getIcon`, `onOpen`, `onClose`, `addUserMessage`, `addAssistantMessage`, `appendToken`, `renderMarkdown`, `renderSources`, `renderError`, `setInputEnabled`, or `scrollToBottom` methods.
- **Verification**: Run `npx tsc --noEmit`. It will fail at this point because `main.ts` still passes only 2 arguments to the `ChatView` constructor. That is expected and will be fixed in Step 8.

---

### Step 8: Update `src/main.ts` — wire everything together

- **File(s)**: `src/main.ts`
- **What to do**: Make four changes:

  **(8a)** Add imports at the top (after existing import lines):
  ```typescript
  import { UrlIngestor } from "./ingestor/url-ingestor";
  import { IngestUrlModal } from "./ui/ingest-url-modal";
  ```

  **(8b)** Add a new field to the `ObsidianKBPlugin` class (after the existing `private statusBarEl\!: HTMLElement;` line):
  ```typescript
  private urlIngestor\!: UrlIngestor;
  ```

  **(8c)** In the `onload()` method, **after** the `this.ragEngine = new RagEngine(...)` block (around line 65) and **before** the `this.registerView(...)` call, add:
  ```typescript
  this.urlIngestor = new UrlIngestor(
    this.app.vault,
    () => this.settings.ingestFolder,
  );
  ```

  **(8d)** Update the `registerView` callback to pass `urlIngestor` as the third argument to `ChatView`:
  ```typescript
  this.registerView(CHAT_VIEW_TYPE, (leaf: WorkspaceLeaf) => {
    return new ChatView(leaf, this.ragEngine, this.urlIngestor);
  });
  ```

  **(8e)** Register the `kb-ingest-url` command. Add this **after** the existing `this.addCommand({ id: "open-kb-chat", ... })` block:
  ```typescript
  this.addCommand({
    id: "kb-ingest-url",
    name: "KB: Ingest URL",
    callback: () => {
      new IngestUrlModal(this.app, this.urlIngestor).open();
    },
  });
  ```

- **Do NOT**: Change `loadSettings`, `saveSettings`, `refreshProvider`, `onunload`, `activateChatView`, or any existing command registrations. Do not change the `VaultIndexer` or `RagEngine` instantiation. Do not add any async work to the `UrlIngestor` construction — it is a synchronous constructor that stores two references.
- **Verification**: Run `npx tsc --noEmit` — zero errors. All type mismatches from Step 7 should now be resolved.

---

### Step 9: Build and verify

- **File(s)**: None (verification step only)
- **What to do**: Run the full build from the project root:
  ```bash
  npm run build
  ```
  This runs `node esbuild.config.mjs production`, which bundles everything into `main.js`.

- **Verification checklist**:
  1. `npx tsc --noEmit` exits with code 0 (zero type errors).
  2. `npm run build` exits with code 0 and produces `main.js` in the project root.
  3. `main.js` contains the string `"kb-ingest-url"` (the command ID is in the bundle).
  4. `main.js` does NOT list `@mozilla/readability` or `turndown` as external — they are bundled inline.
  5. Confirm the new files exist:
     - `src/ingestor/video-detector.ts`
     - `src/ingestor/url-ingestor.ts`
     - `src/ui/ingest-url-modal.ts`
  6. Confirm these existing files were modified (check `git diff --name-only`):
     - `src/types.ts`
     - `src/settings.ts`
     - `src/ui/chat-view.ts`
     - `src/main.ts`
     - `package.json`
     - `package-lock.json`

---

## Summary of All Changes

| File | Action | Description |
|---|---|---|
| `package.json` | MOD | Added `@mozilla/readability`, `turndown`, `@types/turndown` |
| `src/types.ts` | MOD | Added `ingestFolder: string` to `PluginSettings` and `DEFAULT_SETTINGS` |
| `src/ingestor/video-detector.ts` | NEW | `detectVideoProvider()` function — YouTube/Bilibili guard |
| `src/ingestor/url-ingestor.ts` | NEW | `UrlIngestor` class — fetch, extract, convert, save pipeline |
| `src/ui/ingest-url-modal.ts` | NEW | `IngestUrlModal` — command palette modal UI |
| `src/settings.ts` | MOD | Added "URL Ingestor" section with `ingestFolder` text input |
| `src/ui/chat-view.ts` | MOD | Added URL detection in `handleSubmit`, `handleUrlIngest` method, `urlIngestor` constructor param |
| `src/main.ts` | MOD | Instantiate `UrlIngestor`, register `kb-ingest-url` command, pass ingestor to `ChatView` |
