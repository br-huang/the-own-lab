# Requirements: Multi LLM Provider Support

## Overview

Currently the Obsidian KB plugin only supports OpenAI for chat completions. Users want
the freedom to choose their preferred LLM provider without leaving the plugin. This
feature adds support for Anthropic Claude, Google Gemini, DeepSeek, and Ollama (local)
while keeping embedding local via Transformers.js (unchanged).

## User Stories

### US-1: Select a Chat Provider

**As a** plugin user,
**I want to** choose my chat LLM provider from a dropdown in Settings,
**so that** I can use whichever provider I already have an account with.

**Acceptance Criteria:**

- A "Provider" dropdown appears in the Chat (LLM) settings section.
- Options: OpenAI, Claude, Gemini, DeepSeek, Ollama.
- Selecting a provider immediately updates the Model dropdown to show that provider's models.
- The selected provider is persisted across plugin reloads.

### US-2: Enter a Provider-Specific API Key

**As a** plugin user,
**I want to** enter my API key for the selected provider,
**so that** the plugin can authenticate with that provider's API.

**Acceptance Criteria:**

- An "API Key" password field is shown for OpenAI, Claude, Gemini, and DeepSeek.
- The field placeholder changes to match the provider (e.g., "sk-ant-..." for Claude).
- The API Key field is hidden when Ollama is selected.
- Each provider stores its own API key independently (switching providers does not erase another provider's key).

### US-3: Select a Model

**As a** plugin user,
**I want to** choose from a list of models specific to my selected provider,
**so that** I can pick the model that suits my needs.

**Acceptance Criteria:**

- The Model dropdown is populated based on the selected provider:
  - OpenAI: gpt-4o, gpt-4o-mini
  - Claude: claude-sonnet-4-5, claude-opus-4
  - Gemini: gemini-2.0-flash, gemini-2.5-pro
  - DeepSeek: deepseek-chat, deepseek-reasoner
  - Ollama: text field for user to type model name (e.g., llama3, mistral)
- Switching providers resets the model to the first option for that provider.

### US-4: Configure Ollama Connection

**As a** user running Ollama locally,
**I want to** specify the Ollama server URL,
**so that** I can connect to a non-default host or port.

**Acceptance Criteria:**

- When Ollama is selected, an "Ollama URL" text field appears.
- Default value: `http://localhost:11434`.
- No API key field is shown for Ollama.
- The model field is a free-text input (not a dropdown) since Ollama models vary per install.

### US-5: Stream Chat Responses from Any Provider

**As a** plugin user,
**I want** chat responses to stream token-by-token regardless of which provider I choose,
**so that** I get the same responsive UX across all providers.

**Acceptance Criteria:**

- All five providers implement the existing `LLMProvider` interface with streaming `chat()`.
- Tokens arrive incrementally in the chat view (no waiting for full response).
- Existing RAG pipeline works unchanged with any provider.

### US-6: See Provider-Specific Error Messages

**As a** plugin user,
**I want** clear error messages when something goes wrong with my chosen provider,
**so that** I can diagnose and fix the issue.

**Acceptance Criteria:**

- Invalid API key: "Invalid {Provider} API key. Please check your settings."
- Rate limit: "{Provider} rate limit exceeded. Please wait a moment and try again."
- Ollama connection refused: "Cannot connect to Ollama at {url}. Is Ollama running?"
- Generic fallback: "{Provider} API error: {message}"

## Out of Scope

- Provider-specific features (tool use, vision, function calling).
- Switching embedding provider (stays local via Transformers.js).
- Provider health check / connectivity test in settings.
- Custom model lists (hardcoded per provider, except Ollama free-text).
- Token counting / cost estimation per provider.

## Non-Functional Requirements

- NFR-1: Switching provider in settings takes effect immediately (no restart needed).
- NFR-2: Unused provider SDKs should be tree-shakeable where possible.
- NFR-3: Bundle size impact from new SDKs should be documented.
- NFR-4: Backward compatibility — existing users with OpenAI settings should see no change after upgrade.
