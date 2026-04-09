# Implementation Plan: Multi LLM Provider Support

## Prerequisites

- Node.js and npm installed (already the case for this project).
- Familiarity with the `LLMProvider` interface in `src/llm/provider.ts`.
- Read DESIGN.md for architecture context.

---

## Steps

### Step 1: Install New Dependencies

- **Files**: `package.json`
- **Action**: Install `@anthropic-ai/sdk` and `@google/generative-ai`.
- **Command**:
  ```bash
  cd /Users/rong/Workspaces/1-Projects/11-Brian-Projects/110-Obsidian-RAG
  npm install @anthropic-ai/sdk @google/generative-ai
  ```
- **Do NOT**: Upgrade the existing `openai` package. Do NOT touch any other dependencies.
- **Verify**: `package.json` has both new deps. `node_modules/@anthropic-ai/sdk` and
  `node_modules/@google/generative-ai` exist. `npm ls @anthropic-ai/sdk` and
  `npm ls @google/generative-ai` show no errors.

---

### Step 2: Update Types — Add Provider Type, Model Lists, New Settings Fields

- **Files**: `src/types.ts`
- **Action**: Add the following at the top of the LLM section (after the Vector Store section):

```typescript
// ─── LLM Provider Config ───

export type ChatProviderType = "openai" | "claude" | "gemini" | "deepseek" | "ollama";

export const CHAT_PROVIDER_LABELS: Record<ChatProviderType, string> = {
  openai: "OpenAI",
  claude: "Claude (Anthropic)",
  gemini: "Gemini (Google)",
  deepseek: "DeepSeek",
  ollama: "Ollama (Local)",
};

export const CHAT_PROVIDER_MODELS: Record<ChatProviderType, string[]> = {
  openai: ["gpt-4o", "gpt-4o-mini"],
  claude: ["claude-sonnet-4-5", "claude-opus-4"],
  gemini: ["gemini-2.0-flash", "gemini-2.5-pro"],
  deepseek: ["deepseek-chat", "deepseek-reasoner"],
  ollama: [],  // free-text input, no predefined list
};

export const CHAT_PROVIDER_PLACEHOLDERS: Record<ChatProviderType, string> = {
  openai: "sk-...",
  claude: "sk-ant-...",
  gemini: "AIza...",
  deepseek: "sk-...",
  ollama: "",
};
```

- **Action**: Update `PluginSettings` interface to:

```typescript
export interface PluginSettings {
  chatProvider: ChatProviderType;
  chatModel: string;
  openaiApiKey: string;
  anthropicApiKey: string;
  geminiApiKey: string;
  deepseekApiKey: string;
  ollamaUrl: string;
  topK: number;
  embeddingBatchSize: number;
  chunkSize: number;
  chunkOverlap: number;
  ingestFolder: string;
  ytDlpCommand: string;
  bilibiliCookiesPath: string;
}
```

- **Action**: Update `DEFAULT_SETTINGS` to:

```typescript
export const DEFAULT_SETTINGS: PluginSettings = {
  chatProvider: "openai",
  chatModel: "gpt-4o",
  openaiApiKey: "",
  anthropicApiKey: "",
  geminiApiKey: "",
  deepseekApiKey: "",
  ollamaUrl: "http://localhost:11434",
  topK: 5,
  embeddingBatchSize: 20,
  chunkSize: 500,
  chunkOverlap: 50,
  ingestFolder: "Ingested",
  ytDlpCommand: "yt-dlp",
  bilibiliCookiesPath: "",
};
```

- **Do NOT**: Change the `Message`, `ChatOptions`, or any other existing type. Do NOT
  remove the `openaiApiKey` field (it is reused). Do NOT change anything below the
  `DEFAULT_SETTINGS` constant.
- **Verify**: `npx tsc --noEmit` passes (there will be errors in main.ts/settings.ts
  referencing old fields — that is expected and fixed in later steps).

---

### Step 3: Rename and Generalize OpenAI Provider → OpenAI-Compatible Provider

- **Files**: Rename `src/llm/openai.ts` → `src/llm/openai-compatible.ts`
- **Action**:
  1. Rename the file using `git mv src/llm/openai.ts src/llm/openai-compatible.ts`.
  2. Replace the entire file contents with:

```typescript
import OpenAI from "openai";
import { Message, ChatOptions } from "../types";
import { LLMProvider } from "./provider";

export interface OpenAICompatibleConfig {
  providerName: string;  // e.g. "OpenAI", "DeepSeek", "Ollama"
  apiKey: string;        // empty string for Ollama
  baseURL?: string;      // undefined = OpenAI default
  chatModel: string;
  maxTokens?: number;    // context window size, default 128000
}

export class OpenAICompatibleProvider implements LLMProvider {
  readonly name: string;
  readonly maxTokens: number;
  private client: OpenAI;
  private chatModel: string;
  private providerName: string;

  constructor(config: OpenAICompatibleConfig) {
    this.name = config.providerName.toLowerCase();
    this.providerName = config.providerName;
    this.chatModel = config.chatModel;
    this.maxTokens = config.maxTokens ?? 128_000;
    this.client = new OpenAI({
      apiKey: config.apiKey || "ollama",  // Ollama doesn't need a key but SDK requires non-empty
      baseURL: config.baseURL,
      dangerouslyAllowBrowser: true,
    });
  }

  async *chat(messages: Message[], options?: ChatOptions): AsyncIterable<string> {
    try {
      const stream = await this.client.chat.completions.create({
        model: this.chatModel,
        messages,
        stream: true,
        temperature: options?.temperature ?? 0.3,
        max_tokens: options?.maxTokens ?? 1024,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          yield content;
        }
      }
    } catch (error) {
      const status = (error as any).status;
      if (status === 401) {
        throw new Error(`Invalid ${this.providerName} API key. Please check your settings.`);
      }
      if (status === 429) {
        throw new Error(`${this.providerName} rate limit exceeded. Please wait a moment and try again.`);
      }
      // Ollama connection refused
      if ((error as any).code === "ECONNREFUSED" || (error as Error).message?.includes("ECONNREFUSED")) {
        const url = this.client.baseURL || "http://localhost:11434";
        throw new Error(`Cannot connect to Ollama at ${url}. Is Ollama running?`);
      }
      throw new Error(`${this.providerName} API error: ${(error as Error).message}`);
    }
  }
}
```

- **Do NOT**: Change `src/llm/provider.ts`. Do NOT change any constructor signature in
  ways that break the factory pattern (Step 6).
- **Verify**: The file exists at `src/llm/openai-compatible.ts`. The old
  `src/llm/openai.ts` no longer exists. `npx tsc --noEmit` will show import errors in
  `main.ts` — expected, fixed in Step 7.

---

### Step 4: Create Anthropic Provider

- **Files**: Create `src/llm/anthropic.ts`
- **Action**: Create a new file with:

```typescript
import Anthropic from "@anthropic-ai/sdk";
import { Message, ChatOptions } from "../types";
import { LLMProvider } from "./provider";

export class AnthropicProvider implements LLMProvider {
  readonly name = "claude";
  readonly maxTokens = 200_000;
  private client: Anthropic;
  private chatModel: string;

  constructor(apiKey: string, chatModel: string) {
    this.chatModel = chatModel;
    this.client = new Anthropic({
      apiKey,
      dangerouslyAllowBrowser: true,
    });
  }

  async *chat(messages: Message[], options?: ChatOptions): AsyncIterable<string> {
    // Anthropic requires system message as a separate parameter
    let systemPrompt: string | undefined;
    const chatMessages: Array<{ role: "user" | "assistant"; content: string }> = [];

    for (const msg of messages) {
      if (msg.role === "system") {
        systemPrompt = msg.content;
      } else {
        chatMessages.push({ role: msg.role, content: msg.content });
      }
    }

    try {
      const stream = this.client.messages.stream({
        model: this.chatModel,
        max_tokens: options?.maxTokens ?? 1024,
        temperature: options?.temperature ?? 0.3,
        system: systemPrompt,
        messages: chatMessages,
      });

      for await (const event of stream) {
        if (
          event.type === "content_block_delta" &&
          event.delta.type === "text_delta"
        ) {
          yield event.delta.text;
        }
      }
    } catch (error) {
      const status = (error as any).status;
      if (status === 401) {
        throw new Error("Invalid Anthropic API key. Please check your settings.");
      }
      if (status === 429) {
        throw new Error("Anthropic rate limit exceeded. Please wait a moment and try again.");
      }
      throw new Error("Anthropic API error: " + (error as Error).message);
    }
  }
}
```

- **Do NOT**: Import or modify any other files in this step.
- **Verify**: `src/llm/anthropic.ts` exists. `npx tsc --noEmit` shows no errors in this
  file specifically (run `npx tsc --noEmit 2>&1 | grep anthropic` — should be empty).

---

### Step 5: Create Gemini Provider

- **Files**: Create `src/llm/gemini.ts`
- **Action**: Create a new file with:

```typescript
import { GoogleGenerativeAI, Content } from "@google/generative-ai";
import { Message, ChatOptions } from "../types";
import { LLMProvider } from "./provider";

export class GeminiProvider implements LLMProvider {
  readonly name = "gemini";
  readonly maxTokens = 1_000_000;  // Gemini 2.0 supports up to 1M tokens
  private genAI: GoogleGenerativeAI;
  private chatModel: string;

  constructor(apiKey: string, chatModel: string) {
    this.chatModel = chatModel;
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async *chat(messages: Message[], options?: ChatOptions): AsyncIterable<string> {
    // Extract system instruction and convert messages to Gemini format
    let systemInstruction: string | undefined;
    const contents: Content[] = [];

    for (const msg of messages) {
      if (msg.role === "system") {
        systemInstruction = msg.content;
      } else {
        contents.push({
          role: msg.role === "assistant" ? "model" : "user",
          parts: [{ text: msg.content }],
        });
      }
    }

    try {
      const model = this.genAI.getGenerativeModel({
        model: this.chatModel,
        systemInstruction: systemInstruction,
        generationConfig: {
          temperature: options?.temperature ?? 0.3,
          maxOutputTokens: options?.maxTokens ?? 1024,
        },
      });

      const result = await model.generateContentStream({ contents });

      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) {
          yield text;
        }
      }
    } catch (error) {
      const message = (error as Error).message || String(error);
      if (message.includes("API_KEY_INVALID") || message.includes("401")) {
        throw new Error("Invalid Gemini API key. Please check your settings.");
      }
      if (message.includes("429") || message.includes("RATE_LIMIT")) {
        throw new Error("Gemini rate limit exceeded. Please wait a moment and try again.");
      }
      throw new Error("Gemini API error: " + message);
    }
  }
}
```

- **Do NOT**: Import or modify any other files in this step.
- **Verify**: `src/llm/gemini.ts` exists. `npx tsc --noEmit 2>&1 | grep gemini` shows
  no errors from this file.

---

### Step 6: Create Provider Factory

- **Files**: Create `src/llm/provider-factory.ts`
- **Action**: Create a new file with:

```typescript
import { PluginSettings } from "../types";
import { LLMProvider } from "./provider";
import { OpenAICompatibleProvider } from "./openai-compatible";
import { AnthropicProvider } from "./anthropic";
import { GeminiProvider } from "./gemini";

/**
 * Create an LLMProvider based on current plugin settings.
 * Called from main.ts on load and whenever settings change.
 */
export function createProvider(settings: PluginSettings): LLMProvider {
  switch (settings.chatProvider) {
    case "openai":
      return new OpenAICompatibleProvider({
        providerName: "OpenAI",
        apiKey: settings.openaiApiKey,
        chatModel: settings.chatModel,
        maxTokens: 128_000,
      });

    case "deepseek":
      return new OpenAICompatibleProvider({
        providerName: "DeepSeek",
        apiKey: settings.deepseekApiKey,
        baseURL: "https://api.deepseek.com",
        chatModel: settings.chatModel,
        maxTokens: 64_000,
      });

    case "ollama":
      return new OpenAICompatibleProvider({
        providerName: "Ollama",
        apiKey: "",
        baseURL: `${settings.ollamaUrl}/v1`,
        chatModel: settings.chatModel,
        maxTokens: 128_000,
      });

    case "claude":
      return new AnthropicProvider(
        settings.anthropicApiKey,
        settings.chatModel,
      );

    case "gemini":
      return new GeminiProvider(
        settings.geminiApiKey,
        settings.chatModel,
      );

    default: {
      // Exhaustiveness check — if a new provider is added to the union type
      // but not handled here, TypeScript will error.
      const _exhaustive: never = settings.chatProvider;
      throw new Error(`Unknown chat provider: ${_exhaustive}`);
    }
  }
}
```

- **Do NOT**: Add any side effects or state to this file. It is a pure factory.
- **Verify**: `npx tsc --noEmit 2>&1 | grep provider-factory` shows no errors.

---

### Step 7: Update main.ts — Use Factory and LLMProvider Interface

- **Files**: `src/main.ts`
- **Action**: Make these specific changes:

1. **Replace import** (line 5): Change
   ```typescript
   import { OpenAIProvider } from "./llm/openai";
   ```
   to:
   ```typescript
   import { LLMProvider } from "./llm/provider";
   import { createProvider } from "./llm/provider-factory";
   ```

2. **Change field type** (line 35): Change
   ```typescript
   private llmProvider\!: OpenAIProvider;
   ```
   to:
   ```typescript
   private llmProvider\!: LLMProvider;
   ```

3. **Replace constructor call in `onload()`** (lines 54-57): Change
   ```typescript
   this.llmProvider = new OpenAIProvider(
     this.settings.openaiApiKey,
     this.settings.chatModel,
   );
   ```
   to:
   ```typescript
   this.llmProvider = createProvider(this.settings);
   ```

4. **Replace `refreshProvider()` body** (lines 163-175): Change
   ```typescript
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
   ```
   to:
   ```typescript
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
   ```

- **Do NOT**: Change anything else in main.ts. Do NOT touch `loadSettings()`,
  `saveSettings()`, `activateChatView()`, or any command registrations. Do NOT change
  how `RagEngine` is constructed (it already accepts `LLMProvider` interface).
- **Verify**: `npx tsc --noEmit 2>&1 | grep main.ts` shows no errors.

---

### Step 8: Update settings.ts — Provider Dropdown, Conditional Fields

- **Files**: `src/settings.ts`
- **Action**: Replace the entire `display()` method's Chat (LLM) section. The full new
  `display()` method body for the Chat section should be:

```typescript
import { App, PluginSettingTab, Setting } from "obsidian";
import type ObsidianKBPlugin from "./main";
import {
  ChatProviderType,
  CHAT_PROVIDER_LABELS,
  CHAT_PROVIDER_MODELS,
  CHAT_PROVIDER_PLACEHOLDERS,
} from "./types";
```

Replace the Chat (LLM) section (between the `containerEl.createEl("h3", { text: "Chat (LLM)" })` line and the URL Ingestor section) with:

```typescript
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
    if (provider \!== "ollama") {
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
```

- **Do NOT**: Change the URL Ingestor section, the Advanced section, or the class
  constructor. Only the Chat (LLM) section and the imports are modified.
- **Verify**: `npx tsc --noEmit` passes with zero errors. Open the plugin settings in
  Obsidian and confirm:
  - Provider dropdown shows all 5 options.
  - Switching to Ollama hides the API Key and shows the Ollama URL field.
  - Switching to Claude shows the API Key with "sk-ant-..." placeholder.
  - Model dropdown updates per provider.

---

### Step 9: Build and End-to-End Verification

- **Files**: None (verification only)
- **Action**: Run the build and verify everything compiles.
- **Command**:
  ```bash
  cd /Users/rong/Workspaces/1-Projects/11-Brian-Projects/110-Obsidian-RAG
  npm run build
  ```
- **Verify**:
  1. `npm run build` completes without errors.
  2. `main.js` is generated in the project root.
  3. Open Obsidian, go to plugin settings:
     - Confirm provider dropdown works.
     - Confirm switching providers updates model list.
     - Confirm API key field hides for Ollama.
     - Confirm Ollama URL field shows only for Ollama.
  4. Test chat with OpenAI (existing setup) — should work as before.
  5. If you have an Anthropic key, test Claude streaming.
  6. If you have a Gemini key, test Gemini streaming.
  7. If Ollama is running locally, test Ollama chat.

---

## File Summary

| File | Action |
|------|--------|
| `package.json` | Add 2 dependencies |
| `src/types.ts` | Add provider types, model lists, new settings fields |
| `src/llm/openai.ts` → `src/llm/openai-compatible.ts` | Rename + generalize |
| `src/llm/anthropic.ts` | New file |
| `src/llm/gemini.ts` | New file |
| `src/llm/provider-factory.ts` | New file |
| `src/main.ts` | 4 targeted edits (import, type, onload, refreshProvider) |
| `src/settings.ts` | Replace Chat section + add imports |

**Total new/modified files: 8**
**Estimated implementation time: 30-45 minutes**
