// Context Flow animation — visual-regression + unit tests (#1355, Epic #1339 C4).
const { test, expect } = require('@playwright/test');
const path = require('path');
const E = require(path.resolve(__dirname, '..', 'dashboard', 'js', 'context-flow-events.js'));

test('_cfMapEvent: git:commit → CF_GIT_NODES (verified by length 2)', () => {
  const result = E._cfMapEvent({ type: 'git:commit' });
  expect(Array.isArray(result)).toBe(true);
  expect(result.length).toBe(2);
});

test('_cfMapEvent: git:merge → CF_MERGE_NODES (single node)', () => {
  const result = E._cfMapEvent({ type: 'git:merge' });
  expect(result.length).toBe(1);
});

test('_cfMapEvent: baton: + fleet model → fleet node set', () => {
  const result = E._cfMapEvent({ type: 'baton:collaborator', model: 'qwen2.5:7b' });
  // CF_FLEET_NODES has 5 entries
  expect(result.length).toBe(5);
});

test('_cfMapEvent: baton: + non-fleet model → cloud node set', () => {
  const result = E._cfMapEvent({ type: 'baton:collaborator', model: 'claude-opus-4-7' });
  // CF_CLOUD_NODES has 3 entries
  expect(result.length).toBe(3);
});

test('_cfMapEvent: deploy:* → CF_DEPLOY_NODES', () => {
  const result = E._cfMapEvent({ type: 'deploy:start' });
  expect(result.length).toBe(2);
});

test('_cfMapEvent: unknown event type → null', () => {
  expect(E._cfMapEvent({ type: 'random:nothing' })).toBeNull();
});

test('_cfPrefersReducedMotion: function exists and returns boolean', () => {
  // In Node.js test environment, window.matchMedia doesn't exist → returns false
  expect(typeof E._cfPrefersReducedMotion).toBe('function');
  const value = E._cfPrefersReducedMotion();
  expect(typeof value).toBe('boolean');
});

test('_cfPrefersReducedMotion: returns false when window/matchMedia unavailable', () => {
  // Confirm graceful fallback in non-browser context
  expect(E._cfPrefersReducedMotion()).toBe(false);
});
