import { Segment, Theme } from '../types.js';

function block(text: string, fg: string, bg: string): string {
  return `\u001b[38;5;${fg}m\u001b[48;5;${bg}m ${text} \u001b[0m`;
}

function separator(prevBg: string, nextBg: string, glyph: string): string {
  return `\u001b[38;5;${prevBg}m\u001b[48;5;${nextBg}m${glyph}\u001b[0m`;
}

export function renderPowerline(segments: Segment[], theme: Theme, nerdFont: boolean): string {
  const separatorGlyph = nerdFont ? theme.separator : theme.separatorAscii;

  return segments
    .map((segment, index) => {
      const tone = theme.tones[segment.tone];
      const next = segments[index + 1];
      const nextBg = next ? theme.tones[next.tone].bg : '0';
      const body = block(segment.text, tone.fg, tone.bg);
      const tail = next ? separator(tone.bg, nextBg, separatorGlyph) : '';
      return `${body}${tail}`;
    })
    .join('');
}
