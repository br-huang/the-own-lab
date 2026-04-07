import OpenAI from "openai";
import { Message, ChatOptions } from "../types";
import { LLMProvider } from "./provider";

export class OpenAIProvider implements LLMProvider {
  readonly name = "openai";
  readonly maxTokens: number;
  private client: OpenAI;
  private chatModel: string;
  private embeddingModel: string;

  constructor(apiKey: string, chatModel: string, embeddingModel: string) {
    this.chatModel = chatModel;
    this.embeddingModel = embeddingModel;
    this.maxTokens = 128000;
    this.client = new OpenAI({
      apiKey,
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
      if ((error as any).status === 401) {
        throw new Error("Invalid OpenAI API key. Please check your settings.");
      }
      if ((error as any).status === 429) {
        throw new Error("OpenAI rate limit exceeded. Please wait a moment and try again.");
      }
      throw new Error("OpenAI API error: " + (error as Error).message);
    }
  }

  async embed(texts: string[]): Promise<number[][]> {
    try {
      const response = await this.client.embeddings.create({
        model: this.embeddingModel,
        input: texts,
      });

      return response.data.map(item => item.embedding);
    } catch (error) {
      if ((error as any).status === 401) {
        throw new Error("Invalid OpenAI API key. Please check your settings.");
      }
      if ((error as any).status === 429) {
        throw new Error("OpenAI rate limit exceeded. Please wait a moment and try again.");
      }
      throw new Error("OpenAI API error: " + (error as Error).message);
    }
  }
}
