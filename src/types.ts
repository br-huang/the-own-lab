// ─── Plugin Settings ───

// ─── LLM Provider Config ───

export type ChatProviderType = "openai" | "claude" | "gemini" | "deepseek" | "ollama";

export const CHAT_PROVIDER_LABELS: Record<ChatProviderType, string> = {
  openai: "OpenAI",
  claude: "Claude (Anthropic)",
  gemini: "Gemini (Google)",
  deepseek: "DeepSeek",
  ollama: "Ollama (Local)",
};

export const CHAT_PROVIDER_MODELS: Record<ChatProviderType, string[]> = {
  openai: ["gpt-4o", "gpt-4o-mini"],
  claude: ["claude-sonnet-4-5", "claude-opus-4"],
  gemini: ["gemini-2.0-flash", "gemini-2.5-pro"],
  deepseek: ["deepseek-chat", "deepseek-reasoner"],
  ollama: [],  // free-text input, no predefined list
};

export const CHAT_PROVIDER_PLACEHOLDERS: Record<ChatProviderType, string> = {
  openai: "sk-...",
  claude: "sk-ant-...",
  gemini: "AIza...",
  deepseek: "sk-...",
  ollama: "",
};

export interface PluginSettings {
  chatProvider: ChatProviderType;
  chatModel: string;
  openaiApiKey: string;
  anthropicApiKey: string;
  geminiApiKey: string;
  deepseekApiKey: string;
  ollamaUrl: string;
  topK: number;
  embeddingBatchSize: number;
  chunkSize: number;
  chunkOverlap: number;
  ingestFolder: string;
  ytDlpCommand: string;
  bilibiliCookiesPath: string;
}

export const DEFAULT_SETTINGS: PluginSettings = {
  chatProvider: "openai",
  chatModel: "gpt-4o",
  openaiApiKey: "",
  anthropicApiKey: "",
  geminiApiKey: "",
  deepseekApiKey: "",
  ollamaUrl: "http://localhost:11434",
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

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

export interface SessionIndexEntry {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface PluginData {
  settings: PluginSettings;
  chatHistory: ChatMessage[];          // kept for migration; empty post-migration
  sessionIndex: SessionIndexEntry[];
  activeSessionId: string | null;
}
