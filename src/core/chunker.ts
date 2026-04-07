import { Chunk, ChunkMetadata } from "../types";

/**
 * Estimate token count using the ~4 chars per token approximation.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Split markdown content into overlapping chunks that respect heading boundaries.
 */
export function chunk(
  content: string,
  metadata: Omit<ChunkMetadata, "chunkIndex">,
  options?: { chunkSize?: number; chunkOverlap?: number }
): Chunk[] {
  const chunkSize = options?.chunkSize ?? 500;
  const chunkOverlap = options?.chunkOverlap ?? 50;

  if (content.trim().length === 0) {
    return [];
  }

  const separators = ["\n## ", "\n### ", "\n\n", "\n", ". "];

  const sections = splitText(content, 0, separators, chunkSize);
  const merged = mergeSections(sections, chunkSize);
  const withOverlap = applyOverlap(merged, chunkOverlap);

  return withOverlap.map((text, i) => ({
    text,
    metadata: { ...metadata, chunkIndex: i },
    tokenCount: estimateTokens(text),
  }));
}

function splitText(
  text: string,
  sepIndex: number,
  separators: string[],
  chunkSize: number
): string[] {
  if (estimateTokens(text) <= chunkSize) {
    return [text];
  }

  if (sepIndex >= separators.length) {
    return [text];
  }

  const separator = separators[sepIndex];
  const rawParts = text.split(separator);

  const parts: string[] = [];
  for (let i = 0; i < rawParts.length; i++) {
    // Prepend separator back onto each part except the first
    const part = i === 0 ? rawParts[i] : separator.trimStart() + rawParts[i];
    if (part.length === 0) {
      continue;
    }

    if (estimateTokens(part) > chunkSize) {
      parts.push(...splitText(part, sepIndex + 1, separators, chunkSize));
    } else {
      parts.push(part);
    }
  }

  return parts;
}

function mergeSections(sections: string[], chunkSize: number): string[] {
  const merged: string[] = [];
  let buffer = "";

  for (const section of sections) {
    if (buffer.length === 0) {
      buffer = section;
      continue;
    }

    const combined = buffer + section;
    if (estimateTokens(combined) <= chunkSize) {
      buffer = combined;
    } else {
      merged.push(buffer);
      buffer = section;
    }
  }

  if (buffer.length > 0) {
    merged.push(buffer);
  }

  return merged;
}

function applyOverlap(chunks: string[], chunkOverlap: number): string[] {
  if (chunks.length <= 1) {
    return chunks;
  }

  const overlapChars = chunkOverlap * 4;
  const result: string[] = [chunks[0]];

  for (let i = 1; i < chunks.length; i++) {
    const prevText = chunks[i - 1];
    const overlapText = prevText.slice(-overlapChars);
    result.push(overlapText + chunks[i]);
  }

  return result;
}
