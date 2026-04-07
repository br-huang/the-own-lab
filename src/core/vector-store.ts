import * as lancedb from "@lancedb/lancedb";
import type { Table } from "@lancedb/lancedb";
import * as fs from "fs";
import * as path from "path";
import { VectorChunk } from "../types";

export class VectorStore {
  private dbPath: string;
  private db: lancedb.Connection | null = null;
  private table: Table | null = null;
  private tableReady = false;

  constructor(vaultPath: string) {
    this.dbPath = path.join(vaultPath, ".obsidian-kb", "vectors");
  }

  async initialize(): Promise<void> {
    fs.mkdirSync(this.dbPath, { recursive: true });
    this.db = await lancedb.connect(this.dbPath);

    try {
      this.table = await this.db.openTable("chunks");
      this.tableReady = true;
    } catch {
      this.tableReady = false;
    }
  }

  async upsert(chunks: VectorChunk[]): Promise<void> {
    if (chunks.length === 0) {
      return;
    }

    const data = chunks.map(c => ({
      id: c.id,
      text: c.text,
      filePath: c.filePath,
      fileTitle: c.fileTitle,
      chunkIndex: c.chunkIndex,
      vector: c.vector,
    }));

    const uniqueFilePaths = [...new Set(chunks.map(c => c.filePath))];

    if (!this.tableReady) {
      this.table = await this.db!.createTable("chunks", data);
      this.tableReady = true;
      return;
    }

    for (const filePath of uniqueFilePaths) {
      await this.table!.delete(
        'filePath = "' + filePath.replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"'
      );
    }
    await this.table!.add(data);
  }

  async query(embedding: number[], topK: number): Promise<VectorChunk[]> {
    if (!this.tableReady) {
      return [];
    }

    const results = await this.table!.search(embedding).limit(topK).toArray();

    return results.map(row => ({
      id: row.id,
      text: row.text,
      filePath: row.filePath,
      fileTitle: row.fileTitle,
      chunkIndex: row.chunkIndex,
      vector: Array.from(row.vector),
    }));
  }

  async delete(filePath: string): Promise<void> {
    if (!this.tableReady) {
      return;
    }

    await this.table!.delete(
      'filePath = "' + filePath.replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"'
    );
  }

  async isEmpty(): Promise<boolean> {
    if (!this.tableReady) {
      return true;
    }

    const count = await this.table!.countRows();
    return count === 0;
  }
}
