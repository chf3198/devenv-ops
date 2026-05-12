// goal_lens.py hook tests (#1446, Epic #1436 D-1436-01).
// Invokes the Python hook via child_process and asserts the injected context.
const { test, expect } = require('@playwright/test');
const { spawnSync } = require('child_process');
const path = require('path');

const HOOK = path.resolve(__dirname, '..', 'hooks', 'scripts', 'goal_lens.py');

function invoke(payload) {
  const result = spawnSync('python3', [HOOK], {
    input: JSON.stringify(payload), encoding: 'utf-8',
  });
  return { stdout: result.stdout, status: result.status };
}

function additionalContext(stdout) {
  const parsed = JSON.parse(stdout || '{}');
  return parsed.hookSpecificOutput?.additionalContext || '';
}

test('decision-keyword prompt: injects goal-lens base only', () => {
  const r = invoke({ prompt: 'How should we decide between option A and B?' });
  expect(r.status).toBe(0);
  const ctx = additionalContext(r.stdout);
  expect(ctx).toContain('Goal lens:');
  expect(ctx).toContain('Decision check');
  expect(ctx).not.toContain('Tier-2 mid-flight awareness');
});

test('non-decision prompt: still injects goal lens but no decision-check', () => {
  const r = invoke({ prompt: 'list the files in the repo' });
  const ctx = additionalContext(r.stdout);
  expect(ctx).toContain('Goal lens:');
  expect(ctx).not.toContain('Decision check');
});

test('recurrence keyword: injects Tier-2 mid-flight awareness', () => {
  const r = invoke({ prompt: 'this same error twice — looks like a recurrence' });
  const ctx = additionalContext(r.stdout);
  expect(ctx).toContain('Tier-2 mid-flight awareness');
  expect(ctx).toContain('#1436');
});

test('anneal keyword: injects Tier-2 awareness', () => {
  const r = invoke({ prompt: 'should I file an anneal ticket here?' });
  expect(additionalContext(r.stdout)).toContain('Tier-2 mid-flight awareness');
});

test('mid-flight keyword: injects Tier-2 awareness', () => {
  const r = invoke({ prompt: 'mid-flight pivot needed?' });
  expect(additionalContext(r.stdout)).toContain('Tier-2 mid-flight awareness');
});

test('drift pattern phrase: injects Tier-2 awareness', () => {
  const r = invoke({ prompt: 'I see a drift pattern recurring' });
  expect(additionalContext(r.stdout)).toContain('Tier-2 mid-flight awareness');
});

test('consultant role: tier B+ + recurrence guidance can coexist', () => {
  const r = invoke({ prompt: 'anneal decision needed', role: 'consultant' });
  const ctx = additionalContext(r.stdout);
  expect(ctx).toContain('Tier-2 mid-flight awareness');
  expect(ctx).toContain('Goal definitions:');
  const parsed = JSON.parse(r.stdout);
  expect(parsed.hookSpecificOutput.goalLensTier).toBe('B+');
});

test('empty prompt: exits cleanly without output', () => {
  const r = invoke({ prompt: '' });
  expect(r.status).toBe(0);
  expect(r.stdout.trim()).toBe('');
});

test('non-recurrence non-decision: base goal lens only (no awareness)', () => {
  const r = invoke({ prompt: 'edit this README' });
  const ctx = additionalContext(r.stdout);
  expect(ctx).not.toContain('Tier-2 mid-flight awareness');
  expect(ctx).not.toContain('Decision check');
});
