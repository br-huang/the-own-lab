import * as fs from "fs";
import * as path from "path";
import { VectorChunk } from "../types";

/**
 * Pure JS vector store — stores embeddings as JSON, searches via cosine similarity.
 * No native binary dependencies. Data persisted at {vault}/.obsidian-kb/vectors.json
 */
export class VectorStore {
  private storagePath: string;
  private chunks: VectorChunk[] = [];
  private dirty = false;

  constructor(vaultPath: string) {
    const dir = path.join(vaultPath, ".obsidian-kb");
    fs.mkdirSync(dir, { recursive: true });
    this.storagePath = path.join(dir, "vectors.json");
  }

  async initialize(): Promise<void> {
    try {
      const data = fs.readFileSync(this.storagePath, "utf-8");
      this.chunks = JSON.parse(data);
    } catch {
      this.chunks = [];
    }
  }

  async upsert(newChunks: VectorChunk[]): Promise<void> {
    if (newChunks.length === 0) {
      return;
    }

    const filePaths = new Set(newChunks.map(c => c.filePath));

    // Delete existing chunks for these files (delete-then-insert)
    this.chunks = this.chunks.filter(c => !filePaths.has(c.filePath));

    // Insert new chunks
    this.chunks.push(...newChunks);
    this.dirty = true;
    this.persist();
  }

  async query(embedding: number[], topK: number): Promise<VectorChunk[]> {
    if (this.chunks.length === 0) {
      return [];
    }

    // Compute cosine similarity for each chunk
    const scored = this.chunks.map(chunk => ({
      chunk,
      score: cosineSimilarity(embedding, chunk.vector),
    }));

    // Sort by similarity descending, take top-k
    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, topK).map(s => s.chunk);
  }

  async delete(filePath: string): Promise<void> {
    const before = this.chunks.length;
    this.chunks = this.chunks.filter(c => c.filePath !== filePath);
    if (this.chunks.length !== before) {
      this.dirty = true;
      this.persist();
    }
  }

  async isEmpty(): Promise<boolean> {
    return this.chunks.length === 0;
  }

  private persist(): void {
    if (!this.dirty) return;
    fs.writeFileSync(this.storagePath, JSON.stringify(this.chunks));
    this.dirty = false;
  }
}

/** Cosine similarity between two vectors */
function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}
