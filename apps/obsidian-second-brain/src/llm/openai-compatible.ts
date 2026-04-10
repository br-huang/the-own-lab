import OpenAI from 'openai';
import { Message, ChatOptions } from '../types';
import { LLMProvider } from './provider';

export interface OpenAICompatibleConfig {
  providerName: string; // e.g. "OpenAI", "DeepSeek", "Ollama"
  apiKey: string; // empty string for Ollama
  baseURL?: string; // undefined = OpenAI default
  chatModel: string;
  maxTokens?: number; // context window size, default 128000
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
      apiKey: config.apiKey || 'ollama', // Ollama doesn't need a key but SDK requires non-empty
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
        throw new Error(
          `${this.providerName} rate limit exceeded. Please wait a moment and try again.`,
        );
      }
      // Ollama connection refused
      if (
        (error as any).code === 'ECONNREFUSED' ||
        (error as Error).message?.includes('ECONNREFUSED')
      ) {
        const url = this.client.baseURL || 'http://localhost:11434';
        throw new Error(`Cannot connect to Ollama at ${url}. Is Ollama running?`);
      }
      throw new Error(`${this.providerName} API error: ${(error as Error).message}`);
    }
  }
}
