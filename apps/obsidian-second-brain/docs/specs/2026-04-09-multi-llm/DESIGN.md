# Design: Multi LLM Provider Support

## Codebase Analysis

### Current Architecture
- **`src/llm/provider.ts`** — defines `LLMProvider` interface with `name`, `maxTokens`, and
  `chat(messages, options): AsyncIterable<string>`. Also defines `EmbeddingProvider` (not affected).
- **`src/llm/openai.ts`** — `OpenAIProvider` implements `LLMProvider`. Uses `openai` SDK with
  `dangerouslyAllowBrowser: true`. Streams via `chat.completions.create({ stream: true })`.
  Error handling maps HTTP 401/429 to user-friendly messages.
- **`src/types.ts`** — `PluginSettings` has `openaiApiKey` and `chatModel` fields.
  `Message` type uses `{ role, content }` which maps directly to OpenAI format.
- **`src/settings.ts`** — `KBSettingTab.display()` renders the settings UI. Chat section has
  API key (password field) and model dropdown (hardcoded gpt-4o / gpt-4o-mini).
  Both call `this.plugin.refreshProvider()` on change.
- **`src/main.ts`** — `ObsidianKBPlugin` holds `llmProvider` typed as `OpenAIProvider`.
  `refreshProvider()` creates a new `OpenAIProvider` and rebuilds `RagEngine`.
  `RagEngine` accepts `LLMProvider` interface (not concrete class) — good.

### Key Observations
1. `RagEngine` already depends on the `LLMProvider` interface, not the concrete class.
   Swapping providers requires no changes to the RAG pipeline.
2. `main.ts` types `llmProvider` as `OpenAIProvider` — needs to change to `LLMProvider`.
3. The `Message` type (`{ role: "system" | "user" | "assistant", content: string }`) is
   compatible with OpenAI, DeepSeek, Ollama, and Anthropic (after mapping). Gemini uses
   a different format but we can adapt in the Gemini provider.
4. `refreshProvider()` already exists and is called by settings — the factory pattern slots in naturally.

## Proposed Approach

### Provider Architecture

Three implementation classes covering five providers:

```
LLMProvider (interface)
  ├── OpenAICompatibleProvider  — OpenAI, DeepSeek, Ollama
  ├── AnthropicProvider         — Claude
  └── GeminiProvider            — Gemini
```

**OpenAICompatibleProvider** replaces the current `OpenAIProvider`. It accepts `baseURL` and
optional `apiKey` parameters. This single class serves OpenAI (default base URL), DeepSeek
(`https://api.deepseek.com`), and Ollama (`http://{host}/v1`, no API key).

**AnthropicProvider** uses `@anthropic-ai/sdk` with `messages.stream()`. It maps the
`Message[]` format to Anthropic's format (system message extracted, role mapping).

**GeminiProvider** uses `@google/generative-ai` with `generateContentStream()`. It maps
`Message[]` to Gemini's `Content[]` format (role: "user"/"model", parts: [{ text }]).

### Provider Factory

A pure function in `src/llm/provider-factory.ts`:

```typescript
function createProvider(settings: PluginSettings): LLMProvider
```

Reads `settings.chatProvider` and returns the appropriate instance. Called from
`refreshProvider()` in `main.ts`.

### Settings Schema

New fields in `PluginSettings`:

```typescript
chatProvider: ChatProviderType;  // "openai" | "claude" | "gemini" | "deepseek" | "ollama"
chatModel: string;               // already exists, reused
// Per-provider API keys (independent storage)
openaiApiKey: string;            // already exists
anthropicApiKey: string;         // new
geminiApiKey: string;            // new
deepseekApiKey: string;          // new
ollamaUrl: string;               // new, default "http://localhost:11434"
```

The `chatModel` field is shared — its value changes when the provider changes.

### Settings UI Flow

```
Provider dropdown change →
  1. Save new chatProvider value
  2. Set chatModel to first model of new provider
  3. Re-render settings section (show/hide API key, change model options)
  4. Call refreshProvider()
```

The settings tab uses `display()` re-render to show/hide conditional fields. This is the
standard Obsidian pattern — call `this.display()` to rebuild the entire settings pane.

### Alternatives Considered

| Approach | Pros | Cons |
|----------|------|------|
| A: Three classes (OpenAICompatible, Anthropic, Gemini) | Minimal code, reuses openai SDK for 3 providers | Less explicit per-provider customization |
| B: Five separate classes (one per provider) | Each provider fully independent | Duplicated code for OpenAI/DeepSeek/Ollama |
| C: Single adapter with strategy pattern | Maximum DRY | Over-abstraction, harder to debug |

**Chosen: Approach A.** DeepSeek and Ollama are documented as OpenAI-compatible APIs.
Using the same SDK with different baseURL is the intended integration path. This avoids
code duplication while keeping Anthropic and Gemini implementations clean and independent.

## Key Decisions

- **Rename openai.ts to openai-compatible.ts**: The class serves three providers. The name
  should reflect this. Existing imports in main.ts are updated in the same step.
- **Per-provider API key storage**: Switching providers should not erase another provider's
  key. Users may switch back and forth. Cost: 3 extra string fields in settings.
- **Ollama model as free text**: Unlike cloud providers with known model lists, Ollama
  models vary per installation. A text input is more practical than a dropdown.
- **Re-render settings on provider change**: Calling `this.display()` rebuilds the entire
  settings pane. This is simpler than trying to show/hide individual DOM elements and
  matches what other Obsidian plugins do.
- **System message handling for Anthropic**: Anthropic API takes system as a separate
  parameter, not in the messages array. The AnthropicProvider extracts it before sending.
- **Gemini role mapping**: Gemini uses "model" instead of "assistant". The GeminiProvider
  maps roles in its `chat()` method.

## Dependencies and Risks

- **Risk: Anthropic SDK bundle size.** Mitigation: `@anthropic-ai/sdk` is ~50KB minified.
  Acceptable for a plugin. Mark as external in esbuild if needed.
- **Risk: Gemini SDK browser compatibility.** `@google/generative-ai` is designed for
  browser use. Low risk.
- **Risk: Anthropic SDK uses fetch.** Must ensure `dangerouslyAllowBrowser` or equivalent
  is set. The Anthropic SDK has a similar flag.
- **Risk: Breaking existing users.** Mitigation: Default `chatProvider` is "openai" and
  existing `openaiApiKey` / `chatModel` fields are preserved. `Object.assign` in
  `loadSettings` handles missing new fields gracefully.
- **Risk: Ollama CORS.** Ollama's default config allows localhost CORS. If users change
  the host, they may hit CORS. Document in error message.

## Files Affected

- `package.json` — add `@anthropic-ai/sdk` and `@google/generative-ai` dependencies.
- `src/types.ts` — add `ChatProviderType`, new API key fields, `ollamaUrl`, model lists constant.
- `src/llm/openai.ts` → renamed to `src/llm/openai-compatible.ts` — generalized constructor
  (accepts baseURL, provider name), class renamed to `OpenAICompatibleProvider`.
- `src/llm/anthropic.ts` — new file, `AnthropicProvider` class.
- `src/llm/gemini.ts` — new file, `GeminiProvider` class.
- `src/llm/provider-factory.ts` — new file, `createProvider()` factory function.
- `src/settings.ts` — provider dropdown, conditional API key / model / Ollama URL fields.
- `src/main.ts` — change `llmProvider` type to `LLMProvider`, use `createProvider()` in
  `onload()` and `refreshProvider()`.
