import path from 'node:path';
import { StatuslineContext } from './types.js';

function getByPath(input: unknown, pathParts: string[]): unknown {
  let current = input as Record<string, unknown> | undefined;

  for (const part of pathParts) {
    if (current == null || typeof current !== 'object' || !(part in current)) {
      return undefined;
    }
    current = current[part] as Record<string, unknown>;
  }

  return current;
}

function getFirst(input: unknown, paths: string[][]): unknown {
  for (const pathParts of paths) {
    const value = getByPath(input, pathParts);
    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }

  return undefined;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value : undefined;
}

export function normalizeInput(raw: unknown): StatuslineContext {
  const cwd =
    asString(
      getFirst(raw, [['workspace', 'current_dir'], ['workspace', 'cwd'], ['cwd'], ['current_dir']]),
    ) || process.cwd();

  const contextPercent = asNumber(
    getFirst(raw, [
      ['context', 'used_percent'],
      ['context_window', 'used_percent'],
      ['usage', 'context_percent'],
      ['context_percent'],
    ]),
  );

  return {
    raw,
    cwd,
    projectName: path.basename(cwd),
    model:
      asString(
        getFirst(raw, [
          ['model', 'display_name'],
          ['model', 'name'],
          ['model', 'id'],
          ['model_name'],
        ]),
      ) || 'Claude',
    sessionId: asString(getFirst(raw, [['session_id'], ['session', 'id'], ['conversation_id']])),
    transcriptPath: asString(getFirst(raw, [['transcript_path'], ['session', 'transcript_path']])),
    costUsd: asNumber(
      getFirst(raw, [['cost', 'total_cost_usd'], ['usage', 'cost_usd'], ['cost_usd']]),
    ),
    durationMs: asNumber(
      getFirst(raw, [['session', 'duration_ms'], ['duration_ms'], ['runtime_ms']]),
    ),
    contextRatio:
      asNumber(
        getFirst(raw, [
          ['context', 'used_ratio'],
          ['context_window', 'used_ratio'],
          ['usage', 'context_ratio'],
          ['context_ratio'],
        ]),
      ) ?? (contextPercent != null ? contextPercent / 100 : undefined),
  };
}
