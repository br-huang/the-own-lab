import { Vault } from "obsidian";
import { PluginSettings, RagResponse, SourceReference, Message } from "../types";
import { VectorStore } from "./vector-store";
import { LLMProvider, EmbeddingProvider } from "../llm/provider";

const SYSTEM_PROMPT = `You are a helpful assistant that answers questions based on the user's personal notes.
You MUST only use the provided context to answer. Do not use external knowledge.
When citing information, reference the source note title in square brackets, e.g., [Note Title].
If the provided context does not contain enough information to answer the question,
say "I don't have enough information in your notes to answer this question."`;

export class RagEngine {
  private vault: Vault;
  private vectorStore: VectorStore;
  private llmProvider: LLMProvider;
  private embeddingProvider: EmbeddingProvider;
  private settings: PluginSettings;

  constructor(
    vault: Vault,
    vectorStore: VectorStore,
    llmProvider: LLMProvider,
    embeddingProvider: EmbeddingProvider,
    settings: PluginSettings,
  ) {
    this.vault = vault;
    this.vectorStore = vectorStore;
    this.llmProvider = llmProvider;
    this.embeddingProvider = embeddingProvider;
    this.settings = settings;
  }

  async *query(userQuestion: string, forcedFiles?: string[]): AsyncGenerator<RagResponse> {
    if (userQuestion.trim().length === 0) {
      throw new Error("Please enter a question.");
    }

    if (!this.settings.openaiApiKey) {
      yield { type: "error", message: "Please configure your OpenAI API key in the plugin settings." } as RagResponse;
      return;
    }

    if (await this.vectorStore.isEmpty()) {
      yield { type: "error", message: "No notes have been indexed yet. Please wait for indexing to complete." } as RagResponse;
      return;
    }

    // --- Read forced files ---
    let forcedContext = "";
    const forcedSources: SourceReference[] = [];

    if (forcedFiles && forcedFiles.length > 0) {
      for (const fp of forcedFiles) {
        try {
          const file = this.vault.getAbstractFileByPath(fp);
          if (!file) {
            console.warn(`KB: Forced file not found: ${fp}`);
            continue;
          }
          let content = await this.vault.cachedRead(file as any);
          const MAX_FORCED_FILE_SIZE = 100 * 1024; // 100 KB
          if (content.length > MAX_FORCED_FILE_SIZE) {
            content = content.substring(0, MAX_FORCED_FILE_SIZE) + "\n\n[Content truncated at 100 KB]";
          }
          const title = fp.split("/").pop()?.replace(/\.md$/, "") ?? fp;
          forcedContext += `[Forced context: ${title} (${fp})]\n${content}\n\n`;
          forcedSources.push({
            filePath: fp,
            fileTitle: title,
            chunkText: content.substring(0, 200),
          });
        } catch (err) {
          console.warn(`KB: Failed to read forced file ${fp}:`, err);
        }
      }
    }

    const [questionEmbedding] = await this.embeddingProvider.embed([userQuestion]);
    const results = await this.vectorStore.query(questionEmbedding, this.settings.topK);

    const vectorContext = results.map(r =>
      `[Source: ${r.fileTitle} (${r.filePath})]\n${r.text}`
    ).join("\n\n");
    const context = forcedContext + vectorContext;

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

    // Add forced sources first
    for (const fs of forcedSources) {
      if (!seen.has(fs.filePath)) {
        seen.add(fs.filePath);
        sources.push(fs);
      }
    }

    // Add vector search sources
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
