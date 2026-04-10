import stringWidth from 'string-width';
import { Segment } from './types.js';

const MAX_WIDTH_BY_WIDGET: Record<Segment['id'], number> = {
  model: 18,
  cwd: 18,
  git: 20,
  context: 8,
  session: 24,
  pet: 16,
};

const MIN_WIDTH_BY_WIDGET: Record<Segment['id'], number> = {
  model: 8,
  cwd: 8,
  git: 8,
  context: 6,
  session: 10,
  pet: 7,
};

function truncateText(text: string, maxWidth: number): string {
  if (maxWidth <= 0 || stringWidth(text) <= maxWidth) return text;

  const ellipsis = '…';
  const ellipsisWidth = stringWidth(ellipsis);
  const targetWidth = Math.max(1, maxWidth - ellipsisWidth);
  let result = '';

  for (const char of text) {
    if (stringWidth(result) + stringWidth(char) > targetWidth) break;
    result += char;
  }

  return `${result}${ellipsis}`;
}

function segmentWidth(segment: Segment): number {
  return stringWidth(segment.text);
}

function totalWidth(segments: Segment[], separatorWidth: number): number {
  if (segments.length === 0) return 0;

  return (
    segments.reduce((sum, segment) => sum + segmentWidth(segment), 0) +
    separatorWidth * (segments.length - 1)
  );
}

function cloneSegments(segments: Segment[]): Segment[] {
  return segments.map((segment) => ({ ...segment }));
}

function compactSegments(segments: Segment[], separatorWidth: number, budget: number): Segment[] {
  const next = cloneSegments(segments);

  const candidates = [...next]
    .filter((segment) => segment.compactText && segment.compactText !== segment.text)
    .sort((left, right) => (left.priority ?? 0) - (right.priority ?? 0));

  for (const candidate of candidates) {
    const target = next.find(
      (segment) => segment.id === candidate.id && segment.text === candidate.text,
    );
    if (!target || !target.compactText) continue;
    target.text = target.compactText;
    if (totalWidth(next, separatorWidth) <= budget) break;
  }

  return next;
}

function dropLowPrioritySegments(
  segments: Segment[],
  separatorWidth: number,
  budget: number,
): Segment[] {
  const next = cloneSegments(segments);

  while (next.length > 1 && totalWidth(next, separatorWidth) > budget) {
    let lowestIndex = 0;

    for (let index = 1; index < next.length; index += 1) {
      if ((next[index].priority ?? 0) < (next[lowestIndex].priority ?? 0)) {
        lowestIndex = index;
      }
    }

    next.splice(lowestIndex, 1);
  }

  return next;
}

function trimSegmentsToBudget(
  segments: Segment[],
  separatorWidth: number,
  budget: number,
): Segment[] {
  const next = cloneSegments(segments);
  const ordered = [...next].sort((left, right) => (left.priority ?? 0) - (right.priority ?? 0));

  while (totalWidth(next, separatorWidth) > budget) {
    let changed = false;

    for (const candidate of ordered) {
      const target =
        next.find((segment) => segment.id === candidate.id && segment.text === candidate.text) ??
        next.find((segment) => segment.id === candidate.id);
      if (!target) continue;

      const currentWidth = stringWidth(target.text);
      const minWidth = MIN_WIDTH_BY_WIDGET[target.id];
      if (currentWidth <= minWidth) continue;

      target.text = truncateText(target.text, Math.max(minWidth, currentWidth - 1));
      changed = true;

      if (totalWidth(next, separatorWidth) <= budget) {
        return next;
      }
    }

    if (!changed) break;
  }

  return next;
}

export function getStatuslineBudget(columns?: number): number {
  if (!columns || columns <= 0) return 48;

  const scaled = Math.floor(columns * 0.45);
  return Math.max(28, Math.min(56, scaled));
}

export function fitSegmentsToWidth(
  segments: Segment[],
  budget: number,
  separatorWidth: number,
): Segment[] {
  const normalized = segments.map((segment) => ({
    ...segment,
    text: truncateText(segment.text, MAX_WIDTH_BY_WIDGET[segment.id]),
    compactText: segment.compactText
      ? truncateText(segment.compactText, MAX_WIDTH_BY_WIDGET[segment.id])
      : undefined,
  }));

  if (totalWidth(normalized, separatorWidth) <= budget) return normalized;

  const compacted = compactSegments(normalized, separatorWidth, budget);
  if (totalWidth(compacted, separatorWidth) <= budget) return compacted;

  const dropped = dropLowPrioritySegments(compacted, separatorWidth, budget);
  if (totalWidth(dropped, separatorWidth) <= budget) return dropped;

  return trimSegmentsToBudget(dropped, separatorWidth, budget);
}
