import { App, PluginSettingTab, Setting } from "obsidian";
import type ObsidianKBPlugin from "./main";

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

    new Setting(containerEl)
      .setName("OpenAI API Key")
      .setDesc("Required for chat responses. Embedding runs locally — no API key needed for indexing.")
      .addText((text) =>
        text
          .setPlaceholder("sk-...")
          .setValue(this.plugin.settings.openaiApiKey)
          .onChange(async (value) => {
            this.plugin.settings.openaiApiKey = value;
            await this.plugin.saveSettings();
            this.plugin.refreshProvider();
          })
          .then((text) => { text.inputEl.type = "password"; })
      );

    new Setting(containerEl)
      .setName("Chat Model")
      .setDesc("OpenAI model for chat completions.")
      .addDropdown((dropdown) =>
        dropdown
          .addOption("gpt-4o", "gpt-4o")
          .addOption("gpt-4o-mini", "gpt-4o-mini")
          .setValue(this.plugin.settings.chatModel)
          .onChange(async (value) => {
            this.plugin.settings.chatModel = value;
            await this.plugin.saveSettings();
            this.plugin.refreshProvider();
          })
      );

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
