import { Segment, SessionState, TranscriptState } from '../types.js';

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 1))}\u2026`;
}

function formatCurrencyUsd(value: number): string {
  return value < 0.01 ? `$${value.toFixed(4)}` : `$${value.toFixed(2)}`;
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

export function sessionWidget(
  session?: SessionState,
  transcript?: TranscriptState,
): Segment | undefined {
  if (!session && !transcript?.lastUserPrompt) return undefined;

  const parts: string[] = [];

  if (session?.costUsd != null) parts.push(formatCurrencyUsd(session.costUsd));
  if (session?.durationMs != null) parts.push(formatDuration(session.durationMs));
  if (session?.sessionId) parts.push(`#${truncate(session.sessionId, 8)}`);
  if (transcript?.lastUserPrompt) parts.push(`"${transcript.lastUserPrompt}"`);

  if (parts.length === 0) return undefined;

  return {
    id: 'session',
    text: parts.join(' '),
    tone: 'neutral',
    priority: 60,
  };
}
