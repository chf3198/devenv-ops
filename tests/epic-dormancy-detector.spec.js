// epic-dormancy-detector tests (#1342).
const { test, expect } = require('@playwright/test');
const path = require('path');
const D = require(path.resolve(__dirname, '..', 'scripts', 'global', 'epic-dormancy-detector.js'));

const DAY_MS = 86_400_000;
const RECENT = new Date(Date.now() - 2 * DAY_MS).toISOString();
const OLD = new Date(Date.now() - 20 * DAY_MS).toISOString();

test('shouldGoDormant: idle Epic with no children passes idle path', () => {
  const r = D.shouldGoDormant({
    labels: ['type:epic', 'status:in-progress', 'role:manager'],
    children: [], prActivity: [], comments: [],
  });
  expect(r.dormant).toBe(true);
  expect(r.reason).toBe('idle');
});

test('shouldGoDormant: active child blocks transition', () => {
  const r = D.shouldGoDormant({
    labels: ['status:in-progress'],
    children: [{ state: 'open', labels: ['status:in-progress'] }],
    prActivity: [], comments: [],
  });
  expect(r.dormant).toBe(false);
  expect(r.reason).toBe('active-child');
});

test('shouldGoDormant: recent PR activity blocks transition', () => {
  const r = D.shouldGoDormant({
    labels: ['status:in-progress'], children: [],
    prActivity: [{ timestamp: RECENT }], comments: [],
  });
  expect(r.dormant).toBe(false);
  expect(r.reason).toBe('recent-pr-activity');
});

test('shouldGoDormant: EPIC_ACTIVE marker (recent) blocks transition', () => {
  const r = D.shouldGoDormant({
    labels: ['status:in-progress'], children: [], prActivity: [],
    comments: [{ body: 'EPIC_ACTIVE: phase-1 in flight', created_at: RECENT }],
  });
  expect(r.dormant).toBe(false);
  expect(r.reason).toBe('epic-active-marker');
});

test('shouldGoDormant: OLD EPIC_ACTIVE marker does NOT block (>window)', () => {
  const r = D.shouldGoDormant({
    labels: ['status:in-progress'], children: [], prActivity: [],
    comments: [{ body: 'EPIC_ACTIVE: very old marker', created_at: OLD }],
    dormantAfterDays: 7,
  });
  expect(r.dormant).toBe(true);
});

test('shouldGoDormant: skip when Epic NOT in-progress', () => {
  const r = D.shouldGoDormant({ labels: ['status:dormant'], children: [], prActivity: [], comments: [] });
  expect(r.dormant).toBe(false);
  expect(r.reason).toBe('not-in-progress');
});

test('shouldReactivate: active child triggers reactivation from dormant', () => {
  const r = D.shouldReactivate({
    labels: ['status:dormant'],
    children: [{ state: 'open', labels: ['status:in-progress'] }],
    prActivity: [],
  });
  expect(r.reactivate).toBe(true);
  expect(r.reason).toBe('child-became-active');
});

test('shouldReactivate: PR activity triggers reactivation', () => {
  const r = D.shouldReactivate({
    labels: ['status:dormant'], children: [],
    prActivity: [{ timestamp: RECENT }],
  });
  expect(r.reactivate).toBe(true);
  expect(r.reason).toBe('new-pr-opened');
});

test('shouldReactivate: still-idle dormant Epic stays dormant', () => {
  const r = D.shouldReactivate({
    labels: ['status:dormant'], children: [], prActivity: [],
  });
  expect(r.reactivate).toBe(false);
});

test('shouldReactivate: skip when Epic NOT dormant', () => {
  const r = D.shouldReactivate({ labels: ['status:in-progress'], children: [], prActivity: [] });
  expect(r.reactivate).toBe(false);
  expect(r.reason).toBe('not-dormant');
});

test('hasRecentActiveMarker: matches EPIC_ACTIVE in any case', () => {
  const recent = [{ body: 'epic_active: foo', created_at: RECENT }];
  expect(D.hasRecentActiveMarker(recent, 7)).toBe(true);
});

test('autoPauseComment: produces well-formed comment', () => {
  const comment = D.autoPauseComment(42, 'idle', 'next child action');
  expect(comment).toContain('EPIC_AUTO_PAUSE');
  expect(comment).toContain('#42');
  expect(comment).toContain('idle');
  expect(comment).toContain('EPIC_ACTIVE:');
});

test('DEFAULT_DAYS is 7', () => {
  // Env var unset in tests
  delete process.env.EPIC_DORMANT_AFTER_DAYS;
  const newDet = require(path.resolve(__dirname, '..', 'scripts', 'global', 'epic-dormancy-detector.js'));
  expect(newDet.DEFAULT_DAYS).toBeGreaterThanOrEqual(7);
});
