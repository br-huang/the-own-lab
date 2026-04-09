import { App, PluginSettingTab, Setting } from "obsidian";
import type ObsidianKBPlugin from "./main";
import {
  ChatProviderType,
  CHAT_PROVIDER_LABELS,
  CHAT_PROVIDER_MODELS,
  CHAT_PROVIDER_PLACEHOLDERS,
} from "./types";

export class KBSettingTab extends PluginSettingTab {
  plugin: ObsidianKBPlugin;

  constructor(app: App, plugin: ObsidianKBPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "Obsidian KB Settings" });

    // ─── Chat Section ───

    containerEl.createEl("h3", { text: "Chat (LLM)" });

    // ── Provider dropdown ──
    new Setting(containerEl)
      .setName("Provider")
      .setDesc("LLM provider for chat completions.")
      .addDropdown((dropdown) => {
        for (const [key, label] of Object.entries(CHAT_PROVIDER_LABELS)) {
          dropdown.addOption(key, label);
        }
        dropdown
          .setValue(this.plugin.settings.chatProvider)
          .onChange(async (value) => {
            const provider = value as ChatProviderType;
            this.plugin.settings.chatProvider = provider;
            // Reset model to first available for this provider
            const models = CHAT_PROVIDER_MODELS[provider];
            this.plugin.settings.chatModel = models.length > 0 ? models[0] : "";
            await this.plugin.saveSettings();
            this.plugin.refreshProvider();
            // Re-render to show/hide conditional fields
            this.display();
          });
      });

    // ── API Key (hidden for Ollama) ──
    const provider = this.plugin.settings.chatProvider;
    if (provider !== "ollama") {
      const apiKeyField = provider === "openai" ? "openaiApiKey"
        : provider === "claude" ? "anthropicApiKey"
        : provider === "gemini" ? "geminiApiKey"
        : "deepseekApiKey";

      new Setting(containerEl)
        .setName("API Key")
        .setDesc(`API key for ${CHAT_PROVIDER_LABELS[provider]}.`)
        .addText((text) =>
          text
            .setPlaceholder(CHAT_PROVIDER_PLACEHOLDERS[provider])
            .setValue(this.plugin.settings[apiKeyField])
            .onChange(async (value) => {
              (this.plugin.settings as any)[apiKeyField] = value;
              await this.plugin.saveSettings();
              this.plugin.refreshProvider();
            })
            .then((text) => { text.inputEl.type = "password"; })
        );
    }

    // ── Model selection ──
    const models = CHAT_PROVIDER_MODELS[provider];
    if (models.length > 0) {
      // Dropdown for providers with known model lists
      new Setting(containerEl)
        .setName("Model")
        .setDesc(`Chat model for ${CHAT_PROVIDER_LABELS[provider]}.`)
        .addDropdown((dropdown) => {
          for (const model of models) {
            dropdown.addOption(model, model);
          }
          dropdown
            .setValue(this.plugin.settings.chatModel)
            .onChange(async (value) => {
              this.plugin.settings.chatModel = value;
              await this.plugin.saveSettings();
              this.plugin.refreshProvider();
            });
        });
    } else {
      // Free-text for Ollama
      new Setting(containerEl)
        .setName("Model")
        .setDesc("Ollama model name (e.g., llama3, mistral, gemma).")
        .addText((text) =>
          text
            .setPlaceholder("llama3")
            .setValue(this.plugin.settings.chatModel)
            .onChange(async (value) => {
              this.plugin.settings.chatModel = value.trim();
              await this.plugin.saveSettings();
              this.plugin.refreshProvider();
            })
        );
    }

    // ── Ollama URL (shown only for Ollama) ──
    if (provider === "ollama") {
      new Setting(containerEl)
        .setName("Ollama URL")
        .setDesc("Base URL for the Ollama server.")
        .addText((text) =>
          text
            .setPlaceholder("http://localhost:11434")
            .setValue(this.plugin.settings.ollamaUrl)
            .onChange(async (value) => {
              this.plugin.settings.ollamaUrl = value.trim() || "http://localhost:11434";
              await this.plugin.saveSettings();
              this.plugin.refreshProvider();
            })
        );
    }

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

    new Setting(containerEl)
      .setName("yt-dlp Command")
      .setDesc("Command or absolute path used for Bilibili subtitle extraction. Default: yt-dlp")
      .addText((text) =>
        text
          .setPlaceholder("yt-dlp")
          .setValue(this.plugin.settings.ytDlpCommand)
          .onChange(async (value) => {
            this.plugin.settings.ytDlpCommand = value.trim() || "yt-dlp";
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Bilibili cookies.txt Path")
      .setDesc("Optional Netscape-format cookies.txt path. Used only if Bilibili requires login.")
      .addText((text) =>
        text
          .setPlaceholder("/absolute/path/to/cookies.txt")
          .setValue(this.plugin.settings.bilibiliCookiesPath)
          .onChange(async (value) => {
            this.plugin.settings.bilibiliCookiesPath = value.trim();
            await this.plugin.saveSettings();
          })
      );

    // ─── Advanced Section ───

    containerEl.createEl("h3", { text: "Advanced" });

    new Setting(containerEl)
      .setName("Top-K Results")
      .setDesc("Number of chunks to retrieve per query (1-20).")
      .addSlider((slider) =>
        slider
          .setLimits(1, 20, 1)
          .setValue(this.plugin.settings.topK)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.topK = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Embedding Batch Size")
      .setDesc("Number of files per embedding batch during indexing (5-50).")
      .addSlider((slider) =>
        slider
          .setLimits(5, 50, 5)
          .setValue(this.plugin.settings.embeddingBatchSize)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.embeddingBatchSize = value;
            await this.plugin.saveSettings();
          })
      );
  }
}
