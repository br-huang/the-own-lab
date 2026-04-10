import { Segment, StatuslineContext } from '../types.js';

export function modelWidget(input: StatuslineContext): Segment {
  return {
    id: 'model',
    text: input.model,
    tone: 'info',
    priority: 100,
  };
}
