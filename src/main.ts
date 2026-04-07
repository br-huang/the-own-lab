import { Plugin, WorkspaceLeaf, FileSystemAdapter } from "obsidian";
import { PluginSettings, DEFAULT_SETTINGS } from "./types";
import { OpenAIProvider } from "./llm/openai";
import { LocalEmbeddingProvider } from "./llm/local-embeddings";
import { VectorStore } from "./core/vector-store";
import { VaultIndexer } from "./core/vault-indexer";
import { RagEngine } from "./core/rag-engine";
import { ChatView, CHAT_VIEW_TYPE } from "./ui/chat-view";
import { KBSettingTab } from "./settings";

export default class ObsidianKBPlugin extends Plugin {
  settings: PluginSettings = DEFAULT_SETTINGS;
  vectorStore!: VectorStore;
  vaultIndexer!: VaultIndexer;
  ragEngine!: RagEngine;
  private llmProvider!: OpenAIProvider;
  private embeddingProvider!: LocalEmbeddingProvider;
  private statusBarEl!: HTMLElement;

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
    this.embeddingProvider = new LocalEmbeddingProvider();

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
      this.vectorStore,
      this.llmProvider,
      this.embeddingProvider,
      this.settings,
    );

    this.registerView(CHAT_VIEW_TYPE, (leaf: WorkspaceLeaf) => {
      return new ChatView(leaf, this.ragEngine);
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
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
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
