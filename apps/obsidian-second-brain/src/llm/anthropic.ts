import Anthropic from '@anthropic-ai/sdk';
import { Message, ChatOptions } from '../types';
import { LLMProvider } from './provider';

export class AnthropicProvider implements LLMProvider {
  readonly name = 'claude';
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
    const chatMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
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
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          yield event.delta.text;
        }
      }
    } catch (error) {
      const status = (error as any).status;
      if (status === 401) {
        throw new Error('Invalid Anthropic API key. Please check your settings.');
      }
      if (status === 429) {
        throw new Error('Anthropic rate limit exceeded. Please wait a moment and try again.');
      }
      throw new Error('Anthropic API error: ' + (error as Error).message);
    }
  }
}
