import { Vault, TFile, EventRef } from "obsidian";
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { PluginSettings, FileHashManifest, VectorChunk } from "../types";
import { chunk as chunkText } from "./chunker";
import { VectorStore } from "./vector-store";
import { EmbeddingProvider } from "../llm/provider";

export class VaultIndexer {
  private vault: Vault;
  private vectorStore: VectorStore;
  private embeddingProvider: EmbeddingProvider;
  private settings: PluginSettings;
  private statusBarEl: HTMLElement;
  private manifest: FileHashManifest = {};
  private manifestPath: string;
  private eventRefs: EventRef[] = [];
  private debounceTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

  constructor(
    vault: Vault,
    vectorStore: VectorStore,
    embeddingProvider: EmbeddingProvider,
    settings: PluginSettings,
    statusBarEl: HTMLElement,
  ) {
    this.vault = vault;
    this.vectorStore = vectorStore;
    this.embeddingProvider = embeddingProvider;
    this.settings = settings;
    this.statusBarEl = statusBarEl;
    const vaultPath = (this.vault.adapter as any).basePath as string;
    this.manifestPath = path.join(vaultPath, ".obsidian-kb", "manifest.json");
  }

  async initialIndex(): Promise<void> {
    this.loadManifest();

    const files = this.vault.getMarkdownFiles().filter(f => this.shouldIndex(f));
    const changedFiles: { file: TFile; hash: string }[] = [];

    for (const file of files) {
      const content = await this.vault.cachedRead(file);
      const hash = this.hashContent(content);
      if (this.manifest[file.path] !== hash) {
        changedFiles.push({ file, hash });
      }
    }

    const totalCount = changedFiles.length;
    let processedCount = 0;

    for (let i = 0; i < changedFiles.length; i += this.settings.embeddingBatchSize) {
      const batch = changedFiles.slice(i, i + this.settings.embeddingBatchSize);
      const allChunkTexts: string[] = [];
      const batchChunks: { file: TFile; hash: string; chunks: ReturnType<typeof chunkText> }[] = [];

      for (const { file, hash } of batch) {
        const content = await this.vault.cachedRead(file);
        const chunks = chunkText(
          content,
          { filePath: file.path, fileTitle: file.basename },
          { chunkSize: this.settings.chunkSize, chunkOverlap: this.settings.chunkOverlap }
        );
        batchChunks.push({ file, hash, chunks });
        for (const c of chunks) {
          allChunkTexts.push(c.text);
        }
      }

      if (allChunkTexts.length > 0) {
        try {
          const embeddings = await this.embeddingProvider.embed(allChunkTexts);
          const vectorChunks: VectorChunk[] = [];
          let embeddingIdx = 0;

          for (const { chunks } of batchChunks) {
            for (const c of chunks) {
              vectorChunks.push({
                id: c.metadata.filePath + "::" + c.metadata.chunkIndex,
                text: c.text,
                filePath: c.metadata.filePath,
                fileTitle: c.metadata.fileTitle,
                chunkIndex: c.metadata.chunkIndex,
                vector: embeddings[embeddingIdx],
              });
              embeddingIdx++;
            }
          }

          await this.vectorStore.upsert(vectorChunks);
        } catch (err) {
          console.error("KB: Embedding batch failed, skipping batch", err);
          this.statusBarEl.setText("KB: Indexing error — check console");
          continue;
        }
      }

      for (const { file, hash } of batch) {
        this.manifest[file.path] = hash;
      }

      processedCount += batch.length;
      this.statusBarEl.setText("Indexing: " + processedCount + " / " + totalCount + " notes");
      await new Promise(r => setTimeout(r, 200));
    }

    // Detect deleted files
    const currentPaths = new Set(files.map(f => f.path));
    for (const filePath of Object.keys(this.manifest)) {
      if (!currentPaths.has(filePath)) {
        await this.vectorStore.delete(filePath);
        delete this.manifest[filePath];
      }
    }

    this.saveManifest();
    this.statusBarEl.setText("KB: " + Object.keys(this.manifest).length + " notes indexed");
  }

  watchForChanges(): void {
    const modifyRef = this.vault.on("modify", (file) => {
      if (file instanceof TFile && this.shouldIndex(file)) {
        this.debounceIndex(file);
      }
    });
    this.eventRefs.push(modifyRef);

    const createRef = this.vault.on("create", (file) => {
      if (file instanceof TFile && this.shouldIndex(file)) {
        this.debounceIndex(file);
      }
    });
    this.eventRefs.push(createRef);

    const deleteRef = this.vault.on("delete", (file) => {
      if (file instanceof TFile && this.shouldIndex(file)) {
        this.vectorStore.delete(file.path);
        delete this.manifest[file.path];
        this.saveManifest();
        this.statusBarEl.setText("KB: " + Object.keys(this.manifest).length + " notes indexed");
      }
    });
    this.eventRefs.push(deleteRef);
  }

  async destroy(): Promise<void> {
    this.debounceTimers.forEach(t => clearTimeout(t));
    this.debounceTimers.clear();
    this.eventRefs.forEach(ref => this.vault.offref(ref));
  }

  private debounceIndex(file: TFile): void {
    const existing = this.debounceTimers.get(file.path);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(() => {
      this.debounceTimers.delete(file.path);
      this.indexFile(file);
    }, 2000);
    this.debounceTimers.set(file.path, timer);
  }

  private async indexFile(file: TFile): Promise<void> {
    try {
      const content = await this.vault.cachedRead(file);
      const hash = this.hashContent(content);
      if (this.manifest[file.path] === hash) {
        return;
      }

      const chunks = chunkText(
        content,
        { filePath: file.path, fileTitle: file.basename },
        { chunkSize: this.settings.chunkSize, chunkOverlap: this.settings.chunkOverlap }
      );

      if (chunks.length === 0) {
        await this.vectorStore.delete(file.path);
        delete this.manifest[file.path];
        this.saveManifest();
        return;
      }

      const chunkTexts = chunks.map(c => c.text);
      const embeddings = await this.embeddingProvider.embed(chunkTexts);
      const vectorChunks: VectorChunk[] = chunks.map((c, i) => ({
        id: c.metadata.filePath + "::" + c.metadata.chunkIndex,
        text: c.text,
        filePath: c.metadata.filePath,
        fileTitle: c.metadata.fileTitle,
        chunkIndex: c.metadata.chunkIndex,
        vector: embeddings[i],
      }));

      await this.vectorStore.upsert(vectorChunks);
      this.manifest[file.path] = hash;
      this.saveManifest();
      this.statusBarEl.setText("KB: " + Object.keys(this.manifest).length + " notes indexed");
    } catch (err) {
      console.error("KB: Failed to index " + file.path, err);
    }
  }

  private loadManifest(): void {
    try {
      const data = fs.readFileSync(this.manifestPath, "utf-8");
      this.manifest = JSON.parse(data);
    } catch {
      this.manifest = {};
    }
  }

  private saveManifest(): void {
    fs.mkdirSync(path.dirname(this.manifestPath), { recursive: true });
    fs.writeFileSync(this.manifestPath, JSON.stringify(this.manifest, null, 2));
  }

  private hashContent(content: string): string {
    return crypto.createHash("md5").update(content).digest("hex");
  }

  private shouldIndex(file: TFile): boolean {
    return (
      file.extension === "md" &&
      !file.path.startsWith(".obsidian/") &&
      !file.path.startsWith(".obsidian-kb/")
    );
  }
}
