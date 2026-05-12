// anneal-queue-panel worker-awareness tests (#1449, Epic #1436 D-1436-03).
const { test, expect } = require('@playwright/test');
const path = require('path');
const P = require(path.resolve(__dirname, '..', 'dashboard', 'js', 'anneal-queue-panel.js'));

test('summarizeWorkerAwareness: empty input returns zero counts', () => {
  const r = P.summarizeWorkerAwareness([]);
  expect(r.pending_count).toBe(0);
  expect(r.confirmed_count).toBe(0);
  expect(r.top).toEqual([]);
});

test('summarizeWorkerAwareness: null input handled gracefully', () => {
  expect(P.summarizeWorkerAwareness(null).pending_count).toBe(0);
});

test('summarizeWorkerAwareness: counts pending vs confirmed', () => {
  const r = P.summarizeWorkerAwareness([
    { status: 'pending-confirmation', pattern_id: 'p1', severity: 'high', proposal_id: 'p1:h:day' },
    { status: 'pending-confirmation', pattern_id: 'p2', severity: 'medium', proposal_id: 'p2:m:day' },
    { status: 'confirmed', pattern_id: 'p3', severity: 'critical', proposal_id: 'p3:c:day' },
  ]);
  expect(r.pending_count).toBe(2);
  expect(r.confirmed_count).toBe(1);
});

test('summarizeWorkerAwareness: top returns first 3 pending entries', () => {
  const r = P.summarizeWorkerAwareness([
    { status: 'pending-confirmation', pattern_id: 'a', severity: 'high', proposal_id: 'a:h:d' },
    { status: 'pending-confirmation', pattern_id: 'b', severity: 'high', proposal_id: 'b:h:d' },
    { status: 'pending-confirmation', pattern_id: 'c', severity: 'high', proposal_id: 'c:h:d' },
    { status: 'pending-confirmation', pattern_id: 'd', severity: 'high', proposal_id: 'd:h:d' },
  ]);
  expect(r.top.length).toBe(3);
  expect(r.top.map(t => t.pattern_id)).toEqual(['a', 'b', 'c']);
});

test('renderAnnealQueuePanel: emits worker-awareness section with counts', () => {
  const html = P.renderAnnealQueuePanel({
    events: [],
    pendingConfirmation: [
      { status: 'pending-confirmation', pattern_id: 'p1', severity: 'high', proposal_id: 'p1:high:2026-05-12' },
    ],
  });
  expect(html).toContain('Worker-awareness pending (#1436)');
  expect(html).toContain('pending 1');
  expect(html).toContain('p1 (high)');
});

test('renderAnnealQueuePanel: shows none placeholder when no pending', () => {
  const html = P.renderAnnealQueuePanel({ events: [], pendingConfirmation: [] });
  expect(html).toContain('aq-awareness');
  expect(html).toContain('pending 0');
});

test('renderAnnealQueuePanel: backward-compat when pendingConfirmation missing', () => {
  const html = P.renderAnnealQueuePanel({ events: [] });
  expect(html).toContain('Worker-awareness pending');
  expect(html).toContain('pending 0');
});
