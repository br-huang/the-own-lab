import { PluginSettings, RagResponse, SourceReference, Message } from "../types";
import { VectorStore } from "./vector-store";
import { LLMProvider } from "../llm/provider";

const SYSTEM_PROMPT = `You are a helpful assistant that answers questions based on the user's personal notes.
You MUST only use the provided context to answer. Do not use external knowledge.
When citing information, reference the source note title in square brackets, e.g., [Note Title].
If the provided context does not contain enough information to answer the question,
say "I don't have enough information in your notes to answer this question."`;

export class RagEngine {
  private vectorStore: VectorStore;
  private llmProvider: LLMProvider;
  private settings: PluginSettings;

  constructor(
    vectorStore: VectorStore,
    llmProvider: LLMProvider,
    settings: PluginSettings,
  ) {
    this.vectorStore = vectorStore;
    this.llmProvider = llmProvider;
    this.settings = settings;
  }

  async *query(userQuestion: string): AsyncGenerator<RagResponse> {
    if (userQuestion.trim().length === 0) {
      throw new Error("Please enter a question.");
    }

    if (await this.vectorStore.isEmpty()) {
      yield { type: "error", message: "No notes have been indexed yet. Please wait for indexing to complete." } as RagResponse;
      return;
    }

    const [questionEmbedding] = await this.llmProvider.embed([userQuestion]);
    const results = await this.vectorStore.query(questionEmbedding, this.settings.topK);

    const context = results.map(r =>
      `[Source: ${r.fileTitle} (${r.filePath})]\n${r.text}`
    ).join("\n\n");

    const messages: Message[] = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `Context:\n${context}\n\nQuestion: ${userQuestion}` },
    ];

    try {
      for await (const token of this.llmProvider.chat(messages)) {
        yield { type: "token", token } as RagResponse;
      }
    } catch (err) {
      yield { type: "error", message: (err as Error).message } as RagResponse;
      return;
    }

    const seen = new Set<string>();
    const sources: SourceReference[] = [];
    for (const r of results) {
      if (!seen.has(r.filePath)) {
        seen.add(r.filePath);
        sources.push({
          filePath: r.filePath,
          fileTitle: r.fileTitle,
          chunkText: r.text.substring(0, 200),
        });
      }
    }
    yield { type: "sources", sources } as RagResponse;
  }
}
