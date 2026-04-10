import { GitState, Segment, SessionState, StatuslineContext, TranscriptState } from '../types.js';

type PetMood = 'panic' | 'working' | 'sleepy' | 'thinking' | 'cruising';

const FRAMES: Record<PetMood, string[]> = {
  panic: ['(O_O)', '(@_@)'],
  working: ['(>_<)', '(._.)'],
  sleepy: ['(-_-)', '(-.-)'],
  thinking: ['(o_o)', '(O_o)'],
  cruising: ['(^_^)', '(^.^)'],
};

function clampPercent(ratio: number): number {
  return Math.max(0, Math.min(100, Math.round(ratio * 100)));
}

function formatDuration(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000);
  if (totalMinutes < 60) return `${totalMinutes}m`;

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
}

function pickMood(
  input: StatuslineContext,
  session?: SessionState,
  transcript?: TranscriptState,
  git?: GitState,
): { mood: PetMood; tone: Segment['tone']; label: string } {
  const ratio = input.contextRatio ?? transcript?.contextRatio;

  if (ratio != null && ratio >= 0.75) {
    return {
      mood: 'panic',
      tone: 'danger',
      label: `ctx ${clampPercent(ratio)}%`,
    };
  }

  if (git?.dirty) {
    return {
      mood: 'working',
      tone: 'warning',
      label: `fixing ${git.branch}`,
    };
  }

  if (session?.durationMs != null && session.durationMs >= 2 * 60 * 60 * 1000) {
    return {
      mood: 'sleepy',
      tone: 'muted',
      label: `awake ${formatDuration(session.durationMs)}`,
    };
  }

  if (transcript?.lastUserPrompt) {
    return {
      mood: 'thinking',
      tone: 'info',
      label: 'thinking',
    };
  }

  return {
    mood: 'cruising',
    tone: 'success',
    label: 'cruising',
  };
}

function pickFrame(mood: PetMood, session?: SessionState): string {
  const frames = FRAMES[mood];
  const tickSource =
    session?.durationMs != null
      ? Math.floor(session.durationMs / 30000)
      : Math.floor(Date.now() / 30000);
  return frames[tickSource % frames.length];
}

export function petWidget(
  input: StatuslineContext,
  session?: SessionState,
  transcript?: TranscriptState,
  git?: GitState,
): Segment {
  const state = pickMood(input, session, transcript, git);
  const frame = pickFrame(state.mood, session);

  return {
    id: 'pet',
    text: `${frame} ${state.label}`,
    compactText: frame,
    tone: state.tone,
    priority: 65,
  };
}
