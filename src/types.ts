// ─── Plugin Settings ───

export interface PluginSettings {
  openaiApiKey: string;
  chatModel: string;
  topK: number;
  embeddingBatchSize: number;
  chunkSize: number;
  chunkOverlap: number;
  ingestFolder: string;
  ytDlpCommand: string;
  bilibiliCookiesPath: string;
}

export const DEFAULT_SETTINGS: PluginSettings = {
  openaiApiKey: "",
  chatModel: "gpt-4o",
  topK: 5,
  embeddingBatchSize: 20,
  chunkSize: 500,
  chunkOverlap: 50,
  ingestFolder: "Ingested",
  ytDlpCommand: "yt-dlp",
  bilibiliCookiesPath: "",
};

// ─── Chunking ───

export interface ChunkMetadata {
  filePath: string;
  fileTitle: string;
  chunkIndex: number;
}

export interface Chunk {
  text: string;
  metadata: ChunkMetadata;
  tokenCount: number;
}

// ─── Vector Store ───

export interface VectorChunk {
  id: string;              // deterministic: `${filePath}::${chunkIndex}`
  text: string;
  filePath: string;
  fileTitle: string;
  chunkIndex: number;
  vector: number[];
}

// ─── LLM ───

export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatOptions {
  temperature?: number;    // default: 0.3
  maxTokens?: number;      // default: 1024
}

// ─── RAG ───

export interface SourceReference {
  filePath: string;
  fileTitle: string;
  chunkText: string;       // first 200 chars for preview
}

export interface RagResponseToken {
  type: "token";
  token: string;
}

export interface RagResponseSources {
  type: "sources";
  sources: SourceReference[];
}

export interface RagResponseError {
  type: "error";
  message: string;
}

export type RagResponse = RagResponseToken | RagResponseSources | RagResponseError;

// ─── Indexer ───

export interface FileHashManifest {
  [filePath: string]: string;  // filePath → MD5 hash of content
}

// ─── Chat History ───

export interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  sources: SourceReference[];
  timestamp: string; // ISO-8601
}

export interface PluginData {
  settings: PluginSettings;
  chatHistory: ChatMessage[];
}
