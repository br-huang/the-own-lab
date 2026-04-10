# Implementation Plan: PDF Ingestor

## Prerequisites

- Node.js and npm available
- Working dev build (`npm run dev` compiles without errors)
- Familiarity with the existing ingestor pattern (read `src/ingestor/url-ingestor.ts` and `src/ingestor/youtube-ingestor.ts`)

---

## Steps

### Step 1: Install pdfjs-dist and add to esbuild externals

- **Files**: `package.json`, `package-lock.json`, `esbuild.config.mjs`
- **Action**:
  1. Run `npm install pdfjs-dist` from the project root (`/Users/rong/Workspaces/1-Projects/11-Brian-Projects/110-Obsidian-RAG/`).
  2. Open `esbuild.config.mjs`. In the `external` array (line 9-26), add `"pdfjs-dist"` after `"sharp"` (the last current entry).
  3. After install, verify which entry point exists. Run: `ls node_modules/pdfjs-dist/legacy/build/` and `ls node_modules/pdfjs-dist/build/`. Note the available files (`.js`, `.mjs`, `.cjs`). The ingestor in Step 2 will use whichever path resolves — prefer `pdfjs-dist/legacy/build/pdf.mjs` if it exists, otherwise `pdfjs-dist/build/pdf.mjs`, otherwise `pdfjs-dist/build/pdf.js`.
- **Do NOT**: Modify any other esbuild settings (platform, format, target, etc.).
- **Verify**: `npm ls pdfjs-dist` shows the installed version. `esbuild.config.mjs` external array contains `"pdfjs-dist"`. Run `npm run dev` — build still succeeds (no import of pdfjs-dist yet, so no change in output).

---

### Step 2: Create src/ingestor/pdf-ingestor.ts

- **Files**: `src/ingestor/pdf-ingestor.ts` (NEW)
- **Action**: Create the `PdfIngestor` class. This is the core logic file.

**Imports:**

```typescript
import { Vault, TFile } from 'obsidian';
import * as path from 'path';
import { IngestPhase, IngestResult, OnProgress } from './url-ingestor';
```

**Class signature:**

```typescript
export class PdfIngestor {
  constructor(
    private vault: Vault,
    private getIngestFolder: () => string,
    private pluginDir: string,
  ) {}

  async ingest(
    file: TFile,
    onProgress?: OnProgress,
    onPageProgress?: (current: number, total: number) => void,
  ): Promise<IngestResult> { ... }
}
```

**`ingest()` method — implement in this exact order:**

1. **Read PDF binary:**

   ```typescript
   onProgress?.('fetching');
   let arrayBuffer: ArrayBuffer;
   try {
     arrayBuffer = await this.vault.readBinary(file);
   } catch (err) {
     throw new Error(`Failed to read PDF: ${(err as Error).message}`);
   }
   ```

2. **Load pdfjs-dist and parse document:**

   ```typescript
   onProgress?.('extracting');
   const pdfjsLib = this.loadPdfjs();

   let pdfDocument: any;
   try {
     const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
     pdfDocument = await loadingTask.promise;
   } catch (err: any) {
     if (err?.name === 'PasswordException') {
       throw new Error('This PDF is password-protected and cannot be ingested.');
     }
     throw new Error(`Failed to parse PDF: ${(err as Error).message}`);
   }
   ```

3. **Resolve title:**

   ```typescript
   let title: string;
   try {
     const metadata = await pdfDocument.getMetadata();
     title =
       metadata?.info?.Title &&
       typeof metadata.info.Title === 'string' &&
       metadata.info.Title.trim()
         ? metadata.info.Title.trim()
         : file.basename; // TFile.basename is filename without extension
   } catch {
     title = file.basename;
   }
   ```

4. **Extract text page by page:**

   ```typescript
   const totalPages: number = pdfDocument.numPages;
   const pages: Array<{ pageNum: number; text: string }> = [];

   for (let i = 1; i <= totalPages; i++) {
     onPageProgress?.(i, totalPages);
     const page = await pdfDocument.getPage(i);
     const content = await page.getTextContent();
     const text = content.items
       .map((item: any) => item.str)
       .join(' ')
       .trim();
     if (text.length > 0) {
       pages.push({ pageNum: i, text });
     }
   }

   if (pages.length === 0) {
     throw new Error(
       'No text content found. This PDF may be a scanned image and cannot be ingested without OCR.',
     );
   }
   ```

5. **Build markdown content:**

   ```typescript
   const frontmatter = this.buildFrontmatter({
     url: file.path, // vault-relative path
     title,
     sourceType: 'pdf',
     pages: totalPages,
     ingestedAt: new Date().toISOString(),
   });

   const body = pages.map((p) => `## Page ${p.pageNum}\n\n${p.text}`).join('\n\n');

   const fullContent = frontmatter + '\n' + body;
   ```

6. **Save note:**

   ```typescript
   onProgress?.('saving');
   const folder = this.getIngestFolder() || 'Ingested';
   await this.ensureFolder(folder);
   const slug = this.slugify(title);
   const filePath = await this.resolveFilePath(folder, slug);

   try {
     await this.vault.create(filePath, fullContent);
   } catch (err) {
     throw new Error(`Failed to save note: ${(err as Error).message}`);
   }

   return { title, filePath };
   ```

**Private helper: `loadPdfjs()`:**

```typescript
private loadPdfjs(): any {
  // Absolute path require — same pattern as LocalEmbeddingProvider for @xenova/transformers
  const modulePath = path.join(this.pluginDir, "node_modules", "pdfjs-dist", "legacy", "build", "pdf.mjs");
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const pdfjsLib = require(modulePath);
  pdfjsLib.GlobalWorkerOptions.workerSrc = "";
  return pdfjsLib;
}
```

**IMPORTANT**: The exact path (`legacy/build/pdf.mjs`) must match what was found in Step 1. If the file was `build/pdf.js` instead, use that path. Adjust accordingly.

**Private helpers — copy verbatim from `src/ingestor/youtube-ingestor.ts`:**

- `slugify(title: string): string` — lines 346-355, copy exactly
- `resolveFilePath(folder: string, slug: string): Promise<string>` — lines 357-365, copy exactly
- `ensureFolder(folderPath: string): Promise<void>` — lines 367-390, copy exactly

**Private helper: `buildFrontmatter()`:**

```typescript
private buildFrontmatter(meta: {
  url: string;
  title: string;
  sourceType: string;
  pages: number;
  ingestedAt: string;
}): string {
  const lines: string[] = ["---"];
  lines.push(`url: "${meta.url.replace(/"/g, '\\"')}"`);
  lines.push(`title: "${meta.title.replace(/"/g, '\\"')}"`);
  lines.push(`source_type: "${meta.sourceType}"`);
  lines.push(`pages: ${meta.pages}`);
  lines.push(`ingested_at: "${meta.ingestedAt}"`);
  lines.push("---");
  return lines.join("\n") + "\n";
}
```

Note: field order matches requirements: `url`, `title`, `source_type`, `pages`, `ingested_at`. The `pages` field is an unquoted integer.

- **Do NOT**: Modify `url-ingestor.ts`, `youtube-ingestor.ts`, or `types.ts`. Do NOT add `IngestPhase` values — reuse the existing ones.
- **Verify**: File compiles without TypeScript errors. Run `npm run dev` — build succeeds.

---

### Step 3: Create src/ui/ingest-pdf-modal.ts

- **Files**: `src/ui/ingest-pdf-modal.ts` (NEW)
- **Action**: Create the file picker modal.

**Imports:**

```typescript
import { App, Modal, TFile } from 'obsidian';
import { PdfIngestor } from '../ingestor/pdf-ingestor';
import { IngestPhase } from '../ingestor/url-ingestor';
```

**Class signature:**

```typescript
export class IngestPdfModal extends Modal {
  private searchInput\!: HTMLInputElement;
  private listEl\!: HTMLElement;
  private statusEl\!: HTMLElement;
  private pdfFiles: TFile[] = [];

  constructor(app: App, private ingestor: PdfIngestor) {
    super(app);
  }
}
```

**`onOpen()` method:**

1. Clear content: `contentEl.empty()`, add class `"kb-ingest-pdf-modal"`.
2. Add heading: `contentEl.createEl("h3", { text: "Ingest PDF" })`.
3. Get all PDF files:
   ```typescript
   this.pdfFiles = this.app.vault.getFiles().filter((f) => f.extension === 'pdf');
   ```
4. If no PDFs found, show message and return early:
   ```typescript
   if (this.pdfFiles.length === 0) {
     contentEl.createEl('p', { text: 'No PDF files found in your Vault.' });
     return;
   }
   ```
5. Create search input:
   ```typescript
   this.searchInput = contentEl.createEl('input', {
     type: 'text',
     placeholder: 'Search PDF files...',
     cls: 'kb-ingest-pdf-search',
   });
   this.searchInput.style.width = '100%';
   this.searchInput.style.marginBottom = '8px';
   this.searchInput.addEventListener('input', () => this.renderList());
   this.searchInput.focus();
   ```
6. Create scrollable list container:
   ```typescript
   this.listEl = contentEl.createDiv({ cls: 'kb-ingest-pdf-list' });
   this.listEl.style.maxHeight = '300px';
   this.listEl.style.overflowY = 'auto';
   this.listEl.style.border = '1px solid var(--background-modifier-border)';
   this.listEl.style.borderRadius = '4px';
   ```
7. Create status element (hidden initially):
   ```typescript
   this.statusEl = contentEl.createDiv({ cls: 'kb-ingest-status' });
   this.statusEl.style.marginTop = '12px';
   this.statusEl.hide();
   ```
8. Call `this.renderList()` to populate initially.

**`renderList()` method:**

```typescript
private renderList(): void {
  this.listEl.empty();
  const query = this.searchInput.value.toLowerCase();
  const filtered = this.pdfFiles.filter(
    (f) => f.path.toLowerCase().includes(query)
  );

  if (filtered.length === 0) {
    this.listEl.createEl("div", {
      text: "No matching PDF files.",
      cls: "kb-ingest-pdf-empty",
    });
    return;
  }

  for (const file of filtered) {
    const item = this.listEl.createEl("div", {
      text: file.path,
      cls: "kb-ingest-pdf-item",
    });
    item.style.padding = "6px 8px";
    item.style.cursor = "pointer";
    item.addEventListener("mouseenter", () => {
      item.style.backgroundColor = "var(--background-modifier-hover)";
    });
    item.addEventListener("mouseleave", () => {
      item.style.backgroundColor = "";
    });
    item.addEventListener("click", () => this.doIngest(file));
  }
}
```

**`onClose()` method:**

```typescript
onClose(): void {
  this.contentEl.empty();
}
```

**`doIngest(file: TFile)` method:**

```typescript
private async doIngest(file: TFile): Promise<void> {
  // Disable search and list
  this.searchInput.disabled = true;
  this.listEl.style.pointerEvents = "none";
  this.listEl.style.opacity = "0.5";
  this.statusEl.show();
  this.statusEl.setText("Starting...");
  this.statusEl.removeClass("kb-ingest-error");

  const phaseText: Record<IngestPhase, string> = {
    fetching: "Reading PDF...",
    extracting: "Extracting text...",
    saving: "Saving note...",
  };

  try {
    const result = await this.ingestor.ingest(
      file,
      (phase: IngestPhase) => {
        this.statusEl.setText(phaseText[phase]);
      },
      (current: number, total: number) => {
        this.statusEl.setText(`Extracting page ${current} / ${total}...`);
      },
    );

    this.statusEl.setText(`Saved: "${result.title}" → ${result.filePath}`);
    setTimeout(() => this.close(), 2000);
  } catch (err) {
    this.statusEl.addClass("kb-ingest-error");
    this.statusEl.setText((err as Error).message);
    // Re-enable for retry
    this.searchInput.disabled = false;
    this.listEl.style.pointerEvents = "";
    this.listEl.style.opacity = "";
  }
}
```

- **Do NOT**: Modify `ingest-url-modal.ts`. Do NOT add any CSS file — use inline styles matching the existing modal pattern.
- **Verify**: File compiles without TypeScript errors. Run `npm run dev` — build succeeds.

---

### Step 4: Update src/main.ts — register command and instantiate PdfIngestor

- **Files**: `src/main.ts`
- **Action**: Add imports, field, instantiation, and command registration.

1. **Add imports** (after line 12, the `IngestUrlModal` import):

   ```typescript
   import { PdfIngestor } from './ingestor/pdf-ingestor';
   import { IngestPdfModal } from './ui/ingest-pdf-modal';
   ```

2. **Add private field** (after line 22, the `private urlIngestor\!: UrlIngestor;` line):

   ```typescript
   private pdfIngestor\!: PdfIngestor;
   ```

3. **Instantiate PdfIngestor** in `onload()` (after the `this.urlIngestor = new UrlIngestor(...)` block, around line 73):

   ```typescript
   this.pdfIngestor = new PdfIngestor(this.app.vault, () => this.settings.ingestFolder, pluginDir);
   ```

   Note: `pluginDir` is already computed on lines 44-46. The new instantiation must come after that line.

4. **Register command** (after the `kb-ingest-url` command block, around line 97):
   ```typescript
   this.addCommand({
     id: 'kb-ingest-pdf',
     name: 'KB: Ingest PDF',
     callback: () => {
       new IngestPdfModal(this.app, this.pdfIngestor).open();
     },
   });
   ```

- **Do NOT**: Change any existing imports, fields, or commands. Do NOT modify the `pluginDir` computation. Do NOT change how `urlIngestor` is constructed.
- **Verify**: Run `npm run dev` — build succeeds with no errors. Open Obsidian, open the command palette, type "Ingest PDF" — the command should appear. Opening it should show the file picker modal.

---

### Step 5: Build and end-to-end verification

- **Files**: None (verification only)
- **Action**: Run a full build and manual test.

1. Run `npm run dev` and confirm zero errors.
2. In Obsidian, reload the plugin (Ctrl+Shift+I → console, or toggle plugin off/on in settings).
3. Open command palette → "KB: Ingest PDF".
4. **Test: No PDFs** — If no `.pdf` files in vault, modal should show "No PDF files found in your Vault."
5. **Test: With PDFs** — Add a small `.pdf` to the vault. Reopen modal. The file should appear in the list. Click it.
6. **Test: Progress** — Status should update: "Reading PDF..." → "Extracting page 1 / N..." → "Saving note..." → "Saved: ...".
7. **Test: Output** — Open the saved `.md` file. Verify:
   - Frontmatter has `url`, `title`, `source_type: "pdf"`, `pages`, `ingested_at` in that order.
   - Body has `## Page N` headings with extracted text.
   - Empty pages are not included.
8. **Test: Search filter** — Type part of a filename in the search box. List should filter in real time.
9. **Test: Error** — If `pdfjs-dist` fails to load (wrong path), the error should appear in the modal status. Adjust the path in `loadPdfjs()` if needed (see Step 2 notes about verifying the correct entry point path).

- **Do NOT**: Commit or push. This step is verification only.
- **Verify**: All 9 test scenarios pass. The ingested note is automatically indexed by `VaultIndexer` (check status bar or console logs for indexing activity).
