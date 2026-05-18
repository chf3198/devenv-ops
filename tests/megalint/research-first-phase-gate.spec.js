// megalint/research-first-phase-gate tests (#1888).
const { test, expect } = require('@playwright/test');
const path = require('path');
const V = require(path.resolve(__dirname, '..', '..', 'scripts', 'global', 'megalint', 'research-first-phase-gate.js'));

test('skips non-epic tickets', () => {
  const r = V.validate({ labels: ['type:task'], body: 'x', comments: [] });
  expect(r.found).toBe(false);
  expect(r.ok).toBe(true);
});

test('legacy AC-R detection requires phase-gate label', () => {
  const body = '- [ ] AC-R1: discovery\n- [ ] AC-R2: synthesis';
  const r = V.validate({ labels: ['type:epic', 'status:triage'], body, comments: [] });
  expect(r.found).toBe(true);
  expect(r.ok).toBe(false);
  expect(r.violations.some(v => v.rule === 'missing-phase-gate-label')).toBe(true);
});

test('phase-gate epic in-progress does not require EPIC_RESCOPE yet', () => {
  const r = V.validate({
    labels: ['type:epic', 'phase-gate:research-first', 'status:in-progress'],
    body: 'research gate epic', comments: [],
  });
  expect(r.ok).toBe(true);
});

test('phase-gate epic post in-progress requires EPIC_RESCOPE marker', () => {
  const r = V.validate({
    labels: ['type:epic', 'phase-gate:research-first', 'status:review'],
    body: 'research gate epic', comments: [{ body: 'other comment' }],
  });
  expect(r.ok).toBe(false);
  expect(r.violations.some(v => v.rule === 'missing-epic-rescope')).toBe(true);
});

test('phase-gate epic post in-progress passes with EPIC_RESCOPE marker', () => {
  const r = V.validate({
    labels: ['type:epic', 'phase-gate:research-first', 'status:review'],
    body: 'research gate epic', comments: [{ body: 'EPIC_RESCOPE: phase-0 complete' }],
  });
  expect(r.ok).toBe(true);
});
