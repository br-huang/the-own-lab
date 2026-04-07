import { Message, ChatOptions } from "../types";

export interface LLMProvider {
  readonly name: string;
  readonly maxTokens: number;

  /**
   * Stream chat completions. Yields one string per token/chunk.
   */
  chat(messages: Message[], options?: ChatOptions): AsyncIterable<string>;
}

/**
 * Standalone embedding provider interface.
 * Allows using a different provider for embeddings vs chat.
 */
export interface EmbeddingProvider {
  readonly name: string;
  embed(texts: string[]): Promise<number[][]>;
}
