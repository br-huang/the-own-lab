import { Plugin, WorkspaceLeaf, FileSystemAdapter } from "obsidian";
import * as path from "path";
import { PluginSettings, DEFAULT_SETTINGS, ChatMessage, PluginData } from "./types";
import { OpenAIProvider } from "./llm/openai";
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
  private pluginData: PluginData = { settings: DEFAULT_SETTINGS, chatHistory: [] };

  get settings(): PluginSettings {
    return this.pluginData.settings;
  }
  set settings(val: PluginSettings) {
    this.pluginData.settings = val;
  }
  vectorStore!: VectorStore;
  vaultIndexer!: VaultIndexer;
  ragEngine!: RagEngine;
  private llmProvider!: OpenAIProvider;
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

    this.llmProvider = new OpenAIProvider(
      this.settings.openaiApiKey,
      this.settings.chatModel,
    );

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

    this.registerView(CHAT_VIEW_TYPE, (leaf: WorkspaceLeaf) => {
      return new ChatView(
        leaf,
        this.ragEngine,
        this.urlIngestor,
        this.app,
        () => this.loadChatHistory(),
        (msgs: ChatMessage[]) => this.saveChatHistory(msgs),
      );
    });

    this.addRibbonIcon("message-square", "Open KB Chat", () => {
      this.activateChatView();
    });

    this.addCommand({
      id: "open-kb-chat",
      name: "Open KB Chat",
      callback: () => {
        this.activateChatView();
      },
    });

    this.addCommand({
      id: "kb-ingest-url",
      name: "KB: Ingest URL",
      callback: () => {
        new IngestUrlModal(this.app, this.urlIngestor).open();
      },
    });

    this.addCommand({
      id: "kb-ingest-pdf",
      name: "KB: Ingest PDF",
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
    this.llmProvider = new OpenAIProvider(
      this.settings.openaiApiKey,
      this.settings.chatModel,
    );
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
      // New format: { settings: ..., chatHistory: ... }
      this.pluginData = {
        settings: Object.assign({}, DEFAULT_SETTINGS, raw.settings),
        chatHistory: Array.isArray(raw.chatHistory) ? raw.chatHistory : [],
      };
    } else if (raw && typeof raw === "object") {
      // Legacy format: settings at top level
      this.pluginData = {
        settings: Object.assign({}, DEFAULT_SETTINGS, raw),
        chatHistory: [],
      };
    } else {
      this.pluginData = { settings: { ...DEFAULT_SETTINGS }, chatHistory: [] };
    }
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.pluginData);
  }

  async loadChatHistory(): Promise<ChatMessage[]> {
    return this.pluginData.chatHistory ?? [];
  }

  async saveChatHistory(messages: ChatMessage[]): Promise<void> {
    this.pluginData.chatHistory = messages;
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
