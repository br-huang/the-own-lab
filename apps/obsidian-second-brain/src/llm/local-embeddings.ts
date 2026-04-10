import { EmbeddingProvider } from './provider';
import * as path from 'path';

let extractor: any = null;

const DEFAULT_MODEL = 'Xenova/bge-small-en-v1.5';

/**
 * Local embedding provider using Transformers.js (runs entirely in-process).
 * No API key needed, no network required after first model download.
 *
 * Uses require() with absolute path because Obsidian's Electron renderer
 * cannot resolve bare module specifiers via dynamic import().
 */
export class LocalEmbeddingProvider implements EmbeddingProvider {
  readonly name = 'local';
  private model: string;
  private pluginDir: string;
  private initPromise: Promise<void> | null = null;

  constructor(pluginDir: string, model?: string) {
    this.pluginDir = pluginDir;
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
    // Use absolute path require — Obsidian cannot resolve bare specifiers
    const modulePath = path.join(this.pluginDir, 'node_modules', '@xenova', 'transformers');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { pipeline } = require(modulePath);
    extractor = await pipeline('feature-extraction', this.model, {
      quantized: true,
    });
  }

  async embed(texts: string[]): Promise<number[][]> {
    await this.init();

    const results: number[][] = [];
    for (const text of texts) {
      const output = await extractor(text, {
        pooling: 'cls',
        normalize: true,
      });
      results.push(Array.from(output.data as Float32Array));
    }
    return results;
  }
}
