import { Segment, StatuslineContext, TranscriptState } from '../types.js';

function formatPercent(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}

export function contextWidget(
  input: StatuslineContext,
  transcript?: TranscriptState,
): Segment | undefined {
  const ratio = input.contextRatio ?? transcript?.contextRatio;
  if (ratio == null) return undefined;

  let tone: Segment['tone'] = 'success';
  if (ratio >= 0.75) tone = 'danger';
  else if (ratio >= 0.5) tone = 'warning';

  return {
    id: 'context',
    text: `ctx ${formatPercent(ratio)}`,
    tone,
    priority: 70,
  };
}
