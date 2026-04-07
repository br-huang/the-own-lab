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

    new Setting(containerEl)
      .setName("OpenAI API Key")
      .setDesc("Your OpenAI API key for embeddings and chat.")
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

    new Setting(containerEl)
      .setName("Embedding Model")
      .setDesc("OpenAI model for generating embeddings.")
      .addDropdown((dropdown) =>
        dropdown
          .addOption("text-embedding-3-small", "text-embedding-3-small")
          .addOption("text-embedding-3-large", "text-embedding-3-large")
          .setValue(this.plugin.settings.embeddingModel)
          .onChange(async (value) => {
            this.plugin.settings.embeddingModel = value;
            await this.plugin.saveSettings();
            this.plugin.refreshProvider();
          })
      );

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
