export type WidgetId = "model" | "cwd" | "git" | "context" | "session" | "pet";
export type RendererId = "plain" | "powerline";
export type Tone = "neutral" | "info" | "success" | "warning" | "danger" | "muted";

export interface StatuslineContext {
  cwd: string;
  projectName: string;
  model: string;
  sessionId?: string;
  transcriptPath?: string;
  costUsd?: number;
  durationMs?: number;
  contextRatio?: number;
  raw: unknown;
}

export interface GitState {
  branch: string;
  dirty: boolean;
}

export interface TranscriptState {
  lastUserPrompt?: string;
  messageCount?: number;
  contextRatio?: number;
}

export interface SessionState {
  costUsd?: number;
  durationMs?: number;
  sessionId?: string;
}

export interface ProviderState {
  git?: GitState;
  transcript?: TranscriptState;
  session?: SessionState;
}

export interface Segment {
  id: WidgetId;
  text: string;
  compactText?: string;
  tone: Tone;
  icon?: string;
  priority?: number;
}

export interface ThemeTone {
  fg: string;
  bg: string;
}

export interface Theme {
  tones: Record<Tone, ThemeTone>;
  separator: string;
  separatorAscii: string;
}

export interface Config {
  renderer: RendererId;
  widgets: WidgetId[];
  nerdFont: boolean;
  theme: Partial<Record<Tone, Partial<ThemeTone>>> & {
    separator?: string;
    separatorAscii?: string;
  };
}
