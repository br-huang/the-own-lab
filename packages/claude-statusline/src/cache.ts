import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const cacheRoot = path.join(os.tmpdir(), 'claude-code-statusline');

function ensureCacheRoot(): void {
  fs.mkdirSync(cacheRoot, { recursive: true });
}

function cacheFile(key: string): string {
  ensureCacheRoot();
  return path.join(cacheRoot, `${Buffer.from(key).toString('base64url')}.json`);
}

export function readCache<T>(key: string, ttlMs: number): T | undefined {
  const file = cacheFile(key);

  try {
    const stat = fs.statSync(file);
    if (Date.now() - stat.mtimeMs > ttlMs) return undefined;
    return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
  } catch {
    return undefined;
  }
}

export function writeCache<T>(key: string, value: T): void {
  const file = cacheFile(key);

  try {
    fs.writeFileSync(file, JSON.stringify(value), 'utf8');
  } catch {
    // Cache writes are best effort.
  }
}
