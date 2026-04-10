import { GoogleGenerativeAI, Content } from '@google/generative-ai';
import { Message, ChatOptions } from '../types';
import { LLMProvider } from './provider';

export class GeminiProvider implements LLMProvider {
  readonly name = 'gemini';
  readonly maxTokens = 1_000_000; // Gemini 2.0 supports up to 1M tokens
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
      if (msg.role === 'system') {
        systemInstruction = msg.content;
      } else {
        contents.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
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
      if (message.includes('API_KEY_INVALID') || message.includes('401')) {
        throw new Error('Invalid Gemini API key. Please check your settings.');
      }
      if (message.includes('429') || message.includes('RATE_LIMIT')) {
        throw new Error('Gemini rate limit exceeded. Please wait a moment and try again.');
      }
      throw new Error('Gemini API error: ' + message);
    }
  }
}
