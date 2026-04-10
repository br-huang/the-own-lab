import picocolors from 'picocolors';
import { Segment, Theme } from '../types.js';

function paint(text: string, tone: Segment['tone']): string {
  switch (tone) {
    case 'info':
      return picocolors.cyan(text);
    case 'success':
      return picocolors.green(text);
    case 'warning':
      return picocolors.yellow(text);
    case 'danger':
      return picocolors.red(text);
    case 'muted':
      return picocolors.dim(text);
    default:
      return text;
  }
}

export function renderPlain(segments: Segment[], _theme: Theme): string {
  return segments.map((segment) => paint(segment.text, segment.tone)).join(' | ');
}
