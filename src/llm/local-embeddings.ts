import { EmbeddingProvider } from "./provider";

// Dynamic import to avoid bundling issues — Transformers.js loaded at runtime
let pipeline: any = null;
let extractor: any = null;

const DEFAULT_MODEL = "Xenova/bge-small-en-v1.5";

/**
 * Local embedding provider using Transformers.js (runs entirely in-process).
 * No API key needed, no network required after first model download.
 */
export class LocalEmbeddingProvider implements EmbeddingProvider {
  readonly name = "local";
  private model: string;
  private initPromise: Promise<void> | null = null;

  constructor(model?: string) {
    this.model = model || DEFAULT_MODEL;
  }

  private async init(): Promise<void> {
    if (extractor) return;
    if (this.initPromise) {
      await this.initPromise;
      return;
    }
    this.initPromise = this.loadModel();
    await this.initPromise;
  }

  private async loadModel(): Promise<void> {
    // Dynamic import — Transformers.js is a large library
    const { pipeline: pipelineFn } = await import("@xenova/transformers");
    pipeline = pipelineFn;
    extractor = await pipeline("feature-extraction", this.model, {
      quantized: true,
    });
  }

  async embed(texts: string[]): Promise<number[][]> {
    await this.init();

    const results: number[][] = [];
    // Process one at a time to avoid OOM on large batches
    for (const text of texts) {
      const output = await extractor(text, {
        pooling: "cls",
        normalize: true,
      });
      results.push(Array.from(output.data as Float32Array));
    }
    return results;
  }
}
