import { Message, ChatOptions } from "../types";

export interface LLMProvider {
  readonly name: string;
  readonly maxTokens: number;

  /**
   * Stream chat completions. Yields one string per token/chunk.
   */
  chat(messages: Message[], options?: ChatOptions): AsyncIterable<string>;

  /**
   * Generate embeddings for a batch of texts.
   * Returns one embedding vector per input text.
   */
  embed(texts: string[]): Promise<number[][]>;
}
