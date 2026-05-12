// anneal-worker-confirmation tests (#1447, Epic #1436 D-1436-02).
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const os = require('os');
const path = require('path');
const C = require(path.resolve(__dirname, '..', 'scripts', 'global', 'anneal-worker-confirmation.js'));

function makeQueue() {
  return path.join(os.tmpdir(), `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jsonl`);
}

test('isConfirmationRequired: default false', () => {
  delete process.env.MEGINGJORD_ANNEAL_REQUIRE_CONFIRMATION;
  expect(C.isConfirmationRequired()).toBe(false);
});

test('isConfirmationRequired: respects env var "1"', () => {
  process.env.MEGINGJORD_ANNEAL_REQUIRE_CONFIRMATION = '1';
  expect(C.isConfirmationRequired()).toBe(true);
  delete process.env.MEGINGJORD_ANNEAL_REQUIRE_CONFIRMATION;
});

test('gateCandidate: default mode → proceed=true (no change to nightly cron)', () => {
  const result = C.gateCandidate(
    { pattern_id: 'p', severity: 'medium', count: 2 },
    { proposal_id: 'p:m:day', dedupe_key: 'p:m' },
    '2026-05-12T20:00:00Z',
    { confirmationRequired: false },
  );
  expect(result.proceed).toBe(true);
  expect(result.reason).toBe('confirmation-not-required');
});

test('gateCandidate: confirmation-required + no prior entry → queues + proceed=false', () => {
  const queuePath = makeQueue();
  const result = C.gateCandidate(
    { pattern_id: 'p1', severity: 'high', count: 3 },
    { proposal_id: 'p1:h:2026-05-12', dedupe_key: 'p1:h' },
    '2026-05-12T20:00:00Z',
    { confirmationRequired: true, queuePath },
  );
  expect(result.proceed).toBe(false);
  expect(result.reason).toBe('queued-for-confirmation');
  expect(C.loadQueue(queuePath).length).toBe(1);
  fs.unlinkSync(queuePath);
});

test('gateCandidate: confirmation-required + pending entry → still pending', () => {
  const queuePath = makeQueue();
  C.appendCandidate(
    { pattern_id: 'p2', severity: 'medium', count: 2 },
    { proposal_id: 'p2:m:day', dedupe_key: 'p2:m' },
    '2026-05-12T19:00:00Z', queuePath,
  );
  const result = C.gateCandidate(
    { pattern_id: 'p2', severity: 'medium', count: 2 },
    { proposal_id: 'p2:m:day', dedupe_key: 'p2:m' },
    '2026-05-12T20:00:00Z',
    { confirmationRequired: true, queuePath },
  );
  expect(result.proceed).toBe(false);
  expect(result.reason).toBe('still-pending');
  fs.unlinkSync(queuePath);
});

test('markConfirmed: upgrades pending → confirmed', () => {
  const queuePath = makeQueue();
  C.appendCandidate(
    { pattern_id: 'p3', severity: 'critical', count: 5 },
    { proposal_id: 'p3:c:day', dedupe_key: 'p3:c' },
    '2026-05-12T19:00:00Z', queuePath,
  );
  expect(C.markConfirmed('p3:c:day', queuePath)).toBe(true);
  const entries = C.loadQueue(queuePath);
  expect(entries[0].status).toBe('confirmed');
  expect(entries[0].confirmed_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  fs.unlinkSync(queuePath);
});

test('gateCandidate: confirmed entry → proceed=true', () => {
  const queuePath = makeQueue();
  C.appendCandidate(
    { pattern_id: 'p4', severity: 'high', count: 4 },
    { proposal_id: 'p4:h:day', dedupe_key: 'p4:h' },
    '2026-05-12T19:00:00Z', queuePath,
  );
  C.markConfirmed('p4:h:day', queuePath);
  const result = C.gateCandidate(
    { pattern_id: 'p4', severity: 'high', count: 4 },
    { proposal_id: 'p4:h:day', dedupe_key: 'p4:h' },
    '2026-05-12T20:00:00Z',
    { confirmationRequired: true, queuePath },
  );
  expect(result.proceed).toBe(true);
  expect(result.reason).toBe('worker-confirmed');
  fs.unlinkSync(queuePath);
});

test('markConfirmed: returns false when proposal_id not found', () => {
  const queuePath = makeQueue();
  fs.writeFileSync(queuePath, '');
  expect(C.markConfirmed('nonexistent:id', queuePath)).toBe(false);
  fs.unlinkSync(queuePath);
});

test('loadQueue: handles missing file gracefully', () => {
  const r = C.loadQueue('/nonexistent/path/queue.jsonl');
  expect(r).toEqual([]);
});

test('loadQueue: skips malformed lines', () => {
  const queuePath = makeQueue();
  fs.writeFileSync(queuePath, '{"valid": 1}\nnot-json\n{"valid": 2}\n');
  expect(C.loadQueue(queuePath).length).toBe(2);
  fs.unlinkSync(queuePath);
});
