import { Plugin, WorkspaceLeaf } from "obsidian";
import { PluginSettings, DEFAULT_SETTINGS } from "./types";
import { OpenAIProvider } from "./llm/openai";
import { VectorStore } from "./core/vector-store";
import { VaultIndexer } from "./core/vault-indexer";
import { RagEngine } from "./core/rag-engine";
import { ChatView, CHAT_VIEW_TYPE } from "./ui/chat-view";
import { KBSettingTab } from "./settings";

export default class ObsidianKBPlugin extends Plugin {
  settings: PluginSettings = DEFAULT_SETTINGS;
  private vectorStore!: VectorStore;
  private vaultIndexer!: VaultIndexer;
  private ragEngine!: RagEngine;

  async onload(): Promise<void> {
    await this.loadSettings();

    const vaultPath = (this.app.vault.adapter as any).basePath as string;

    const llmProvider = new OpenAIProvider(
      this.settings.openaiApiKey,
      this.settings.chatModel,
      this.settings.embeddingModel,
    );

    this.vectorStore = new VectorStore(vaultPath);
    await this.vectorStore.initialize();

    const statusBarEl = this.addStatusBarItem();
    statusBarEl.setText("KB: Initializing...");

    this.vaultIndexer = new VaultIndexer(
      this.app.vault,
      this.vectorStore,
      llmProvider,
      this.settings,
      statusBarEl,
    );

    this.ragEngine = new RagEngine(
      this.vectorStore,
      llmProvider,
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

    this.app.workspace.onLayoutReady(async () => {
      if (this.settings.openaiApiKey) {
        await this.vaultIndexer.initialIndex();
        this.vaultIndexer.watchForChanges();
      } else {
        statusBarEl.setText("KB: Set API key in settings");
      }
    });
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
