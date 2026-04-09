import { Plugin, WorkspaceLeaf, FileSystemAdapter } from "obsidian";
import * as path from "path";
import { PluginSettings, DEFAULT_SETTINGS, PluginData } from "./types";
import { SessionStore } from "./core/session-store";
import { LLMProvider } from "./llm/provider";
import { createProvider } from "./llm/provider-factory";
import { LocalEmbeddingProvider } from "./llm/local-embeddings";
import { VectorStore } from "./core/vector-store";
import { VaultIndexer } from "./core/vault-indexer";
import { RagEngine } from "./core/rag-engine";
import { ChatView, CHAT_VIEW_TYPE } from "./ui/chat-view";
import { KBSettingTab } from "./settings";
import { UrlIngestor } from "./ingestor/url-ingestor";
import { IngestUrlModal } from "./ui/ingest-url-modal";
import { PdfIngestor } from "./ingestor/pdf-ingestor";
import { IngestPdfModal } from "./ui/ingest-pdf-modal";

export default class ObsidianKBPlugin extends Plugin {
  private pluginData: PluginData = {
    settings: DEFAULT_SETTINGS,
    chatHistory: [],
    sessionIndex: [],
    activeSessionId: null,
  };
  private sessionStore!: SessionStore;

  get settings(): PluginSettings {
    return this.pluginData.settings;
  }
  set settings(val: PluginSettings) {
    this.pluginData.settings = val;
  }
  vectorStore!: VectorStore;
  vaultIndexer!: VaultIndexer;
  ragEngine!: RagEngine;
  private llmProvider!: LLMProvider;
  private embeddingProvider!: LocalEmbeddingProvider;
  private statusBarEl!: HTMLElement;
  private urlIngestor!: UrlIngestor;
  private pdfIngestor!: PdfIngestor;

  private getVaultPath(): string {
    const adapter = this.app.vault.adapter;
    if (adapter instanceof FileSystemAdapter) {
      return adapter.getBasePath();
    }
    throw new Error("KB: Unsupported vault adapter. This plugin requires a local filesystem vault.");
  }

  async onload(): Promise<void> {
    await this.loadSettings();

    const vaultPath = this.getVaultPath();

    this.llmProvider = createProvider(this.settings);

    // Embedding always runs locally — no API key needed
    // Pass plugin directory so it can resolve @xenova/transformers via absolute path
    const pluginDir = (this.manifest as any).dir
      ? path.join(vaultPath, (this.manifest as any).dir)
      : path.join(vaultPath, ".obsidian", "plugins", this.manifest.id);
    this.embeddingProvider = new LocalEmbeddingProvider(pluginDir);

    this.vectorStore = new VectorStore(vaultPath);
    await this.vectorStore.initialize();

    this.statusBarEl = this.addStatusBarItem();
    this.statusBarEl.setText("KB: Initializing...");

    this.vaultIndexer = new VaultIndexer(
      this.app.vault,
      this.vectorStore,
      this.embeddingProvider,
      this.settings,
      this.statusBarEl,
    );

    this.ragEngine = new RagEngine(
      this.app.vault,
      this.vectorStore,
      this.llmProvider,
      this.embeddingProvider,
      this.settings,
    );

    this.urlIngestor = new UrlIngestor(
      this.app.vault,
      () => this.settings.ingestFolder,
      () => ({
        ytDlpCommand: this.settings.ytDlpCommand,
        cookiesPath: this.settings.bilibiliCookiesPath,
      }),
    );

    this.pdfIngestor = new PdfIngestor(
      this.app.vault,
      () => this.settings.ingestFolder,
      pluginDir,
    );

    this.sessionStore = new SessionStore(
      vaultPath,
      this.pluginData,
      () => this.saveSettings(),
    );
    await this.sessionStore.initialize();

    this.registerView(CHAT_VIEW_TYPE, (leaf: WorkspaceLeaf) => {
      return new ChatView(
        leaf,
        this.ragEngine,
        this.urlIngestor,
        this.app,
        this.sessionStore,
      );
    });

    this.addRibbonIcon("message-square", "Second Brain: Chat", () => {
      this.activateChatView();
    });

    this.addCommand({
      id: "open-second-brain-chat",
      name: "Second Brain: Chat",
      callback: () => {
        this.activateChatView();
      },
    });

    this.addCommand({
      id: "second-brain-ingest-url",
      name: "Second Brain: Ingest URL",
      callback: () => {
        new IngestUrlModal(this.app, this.urlIngestor).open();
      },
    });

    this.addCommand({
      id: "second-brain-ingest-pdf",
      name: "Second Brain: Ingest PDF",
      callback: () => {
        new IngestPdfModal(this.app, this.pdfIngestor).open();
      },
    });

    this.addSettingTab(new KBSettingTab(this.app, this));

    // Local embedding needs no API key — always start indexing
    this.app.workspace.onLayoutReady(async () => {
      try {
        await this.vaultIndexer.initialIndex();
        this.vaultIndexer.watchForChanges();
      } catch (err) {
        console.error("KB: Failed during initial indexing", err);
        this.statusBarEl.setText("KB: Indexing failed — check console");
      }
    });
  }

  /** Rebuild LLM provider with current settings (called after settings change) */
  refreshProvider(): void {
    this.llmProvider = createProvider(this.settings);
    this.ragEngine = new RagEngine(
      this.app.vault,
      this.vectorStore,
      this.llmProvider,
      this.embeddingProvider,
      this.settings,
    );
  }

  async onunload(): Promise<void> {
    await this.vaultIndexer?.destroy();
  }

  async loadSettings(): Promise<void> {
    const raw = await this.loadData();
    if (raw && raw.settings) {
      this.pluginData = {
        settings: Object.assign({}, DEFAULT_SETTINGS, raw.settings),
        chatHistory: Array.isArray(raw.chatHistory) ? raw.chatHistory : [],
        sessionIndex: Array.isArray(raw.sessionIndex) ? raw.sessionIndex : [],
        activeSessionId: raw.activeSessionId ?? null,
      };
    } else if (raw && typeof raw === "object") {
      // Legacy format: settings at top level
      this.pluginData = {
        settings: Object.assign({}, DEFAULT_SETTINGS, raw),
        chatHistory: [],
        sessionIndex: [],
        activeSessionId: null,
      };
    } else {
      this.pluginData = {
        settings: { ...DEFAULT_SETTINGS },
        chatHistory: [],
        sessionIndex: [],
        activeSessionId: null,
      };
    }
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.pluginData);
  }

  private async activateChatView(): Promise<void> {
    const { workspace } = this.app;

    let leaf = workspace.getLeavesOfType(CHAT_VIEW_TYPE)[0];

    if (!leaf) {
      const rightLeaf = workspace.getRightLeaf(false);
      if (rightLeaf) {
        await rightLeaf.setViewState({
          type: CHAT_VIEW_TYPE,
          active: true,
        });
        leaf = rightLeaf;
      }
    }

    if (leaf) {
      workspace.revealLeaf(leaf);
    }
  }
}
