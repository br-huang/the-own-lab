import fs from "node:fs";
import { readCache, writeCache } from "../cache.js";
import { TranscriptState } from "../types.js";

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 1))}\u2026`;
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

function readEntries(transcriptPath: string): unknown[] {
  const content = fs.readFileSync(transcriptPath, "utf8").trim();
  if (!content) return [];

  const parsed = parseJson(content);
  if (Array.isArray(parsed)) return parsed;

  if (parsed && typeof parsed === "object" && Array.isArray((parsed as { messages?: unknown[] }).messages)) {
    return (parsed as { messages: unknown[] }).messages;
  }

  return content
    .split("\n")
    .map((line) => parseJson(line))
    .filter((entry): entry is unknown => entry !== undefined);
}

function extractText(entry: unknown): string {
  if (!entry || typeof entry !== "object") return "";

  const record = entry as {
    text?: unknown;
    content?: unknown;
    message?: { content?: unknown };
  };

  const content = record.message?.content ?? record.content ?? record.text;
  if (typeof content === "string") return content;

  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object" && "text" in item && typeof item.text === "string") {
          return item.text;
        }
        return "";
      })
      .join(" ")
      .trim();
  }

  return "";
}

export function getTranscriptState(transcriptPath?: string): TranscriptState | undefined {
  if (!transcriptPath || !fs.existsSync(transcriptPath)) return undefined;

  const stat = fs.statSync(transcriptPath);
  const cacheKey = `transcript:${transcriptPath}:${stat.mtimeMs}`;
  const cached = readCache<TranscriptState>(cacheKey, 5000);
  if (cached) return cached;

  const entries = readEntries(transcriptPath);
  let lastUserPrompt = "";

  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const entry = entries[index];
    if (!entry || typeof entry !== "object") continue;

    const role = (entry as { role?: unknown; type?: unknown; message?: { role?: unknown } }).role
      ?? (entry as { type?: unknown }).type
      ?? (entry as { message?: { role?: unknown } }).message?.role;

    if (role === "user") {
      lastUserPrompt = truncate(extractText(entry).replace(/\s+/g, " ").trim(), 48);
      break;
    }
  }

  const state: TranscriptState = {
    lastUserPrompt: lastUserPrompt || undefined,
    messageCount: entries.length
  };

  writeCache(cacheKey, state);
  return state;
}
