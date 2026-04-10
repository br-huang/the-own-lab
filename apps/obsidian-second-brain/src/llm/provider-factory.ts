import { PluginSettings } from '../types';
import { LLMProvider } from './provider';
import { OpenAICompatibleProvider } from './openai-compatible';
import { AnthropicProvider } from './anthropic';
import { GeminiProvider } from './gemini';

/**
 * Create an LLMProvider based on current plugin settings.
 * Called from main.ts on load and whenever settings change.
 */
export function createProvider(settings: PluginSettings): LLMProvider {
  switch (settings.chatProvider) {
    case 'openai':
      return new OpenAICompatibleProvider({
        providerName: 'OpenAI',
        apiKey: settings.openaiApiKey,
        chatModel: settings.chatModel,
        maxTokens: 128_000,
      });

    case 'deepseek':
      return new OpenAICompatibleProvider({
        providerName: 'DeepSeek',
        apiKey: settings.deepseekApiKey,
        baseURL: 'https://api.deepseek.com',
        chatModel: settings.chatModel,
        maxTokens: 64_000,
      });

    case 'ollama':
      return new OpenAICompatibleProvider({
        providerName: 'Ollama',
        apiKey: '',
        baseURL: `${settings.ollamaUrl}/v1`,
        chatModel: settings.chatModel,
        maxTokens: 128_000,
      });

    case 'claude':
      return new AnthropicProvider(settings.anthropicApiKey, settings.chatModel);

    case 'gemini':
      return new GeminiProvider(settings.geminiApiKey, settings.chatModel);

    default: {
      // Exhaustiveness check — if a new provider is added to the union type
      // but not handled here, TypeScript will error.
      const _exhaustive: never = settings.chatProvider;
      throw new Error(`Unknown chat provider: ${_exhaustive}`);
    }
  }
}
