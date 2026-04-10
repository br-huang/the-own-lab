import test from 'node:test';
import assert from 'node:assert/strict';
import { fitSegmentsToWidth } from '../src/layout.js';
import { Segment } from '../src/types.js';

test('fitSegmentsToWidth compacts pet before dropping high-priority widgets', () => {
  const segments: Segment[] = [
    { id: 'model', text: 'Claude', tone: 'info', priority: 100 },
    { id: 'cwd', text: 'project', tone: 'muted', priority: 90 },
    { id: 'git', text: 'feature/demo', tone: 'warning', priority: 80 },
    {
      id: 'pet',
      text: '(>_<) fixing feature/demo',
      compactText: '(>_<)',
      tone: 'warning',
      priority: 65,
    },
  ];

  const fitted = fitSegmentsToWidth(segments, 36, 1);

  assert.equal(fitted.length, 4);
  assert.equal(fitted[3].text, '(>_<)');
});

test('fitSegmentsToWidth drops low-priority widgets when compacting is not enough', () => {
  const segments: Segment[] = [
    { id: 'model', text: 'Claude Sonnet 4', tone: 'info', priority: 100 },
    { id: 'cwd', text: 'project', tone: 'muted', priority: 90 },
    { id: 'git', text: 'feature/demo', tone: 'warning', priority: 80 },
    { id: 'context', text: 'ctx 82%', tone: 'danger', priority: 70 },
    { id: 'pet', text: '(@_@) ctx 82%', compactText: '(@_@)', tone: 'danger', priority: 65 },
  ];

  const fitted = fitSegmentsToWidth(segments, 24, 1);

  assert.equal(
    fitted.some((segment) => segment.id === 'pet'),
    false,
  );
  assert.equal(
    fitted.some((segment) => segment.id === 'model'),
    true,
  );
});
