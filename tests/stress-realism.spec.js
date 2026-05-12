// stress-realism — baton-artifact emission tests (#1409, Epic #1398 AC3+AC6+AC9).
const { test, expect } = require('@playwright/test');
const path = require('path');
const R = require(path.resolve(__dirname, '..', 'dashboard', 'js', 'stress-realism.js'));

test('emitHandoff: produces well-formed handoff with signer, role, ticket id', () => {
  const ticket = { id: 'T-001', lane: 'code-change' };
  const text = R.emitHandoff('MANAGER_HANDOFF', ticket);
  expect(text).toContain('MANAGER_HANDOFF — Cole Mason');
  expect(text).toContain('ticket: T-001 (code-change)');
  expect(text).toContain('Signed-by: Cole Mason');
  expect(text).toContain('Role: manager');
});

test('emitHandoff: distinct signer per kind (signer-independence)', () => {
  const ticket = { id: 'T-002', lane: 'code-change' };
  const signers = R.HANDOFFS.map(k => {
    const m = R.emitHandoff(k, ticket).match(/Signed-by: ([^·]+)/);
    return m[1].trim();
  });
  expect(new Set(signers).size).toBe(4);
});

test('emitHandoff: throws on unknown kind', () => {
  expect(() => R.emitHandoff('UNKNOWN', { id: 'T', lane: 'code-change' })).toThrow(/Unknown handoff/);
});

test('laneHandoffSequence: code-change runs full 4-role baton', () => {
  expect(R.laneHandoffSequence('code-change')).toEqual(R.HANDOFFS);
});

test('laneHandoffSequence: config-only skips Collaborator', () => {
  const seq = R.laneHandoffSequence('config-only');
  expect(seq).toEqual(['MANAGER_HANDOFF', 'ADMIN_HANDOFF', 'CONSULTANT_CLOSEOUT']);
});

test('laneHandoffSequence: docs-only skips Admin', () => {
  const seq = R.laneHandoffSequence('docs-only');
  expect(seq).toEqual(['MANAGER_HANDOFF', 'COLLABORATOR_HANDOFF', 'CONSULTANT_CLOSEOUT']);
});

test('laneHandoffSequence: trivial skips Collaborator AND Admin', () => {
  expect(R.laneHandoffSequence('trivial')).toEqual(['MANAGER_HANDOFF', 'CONSULTANT_CLOSEOUT']);
});

test('runRealism: emits all 4 handoffs for code-change lane and tracks reliability', async () => {
  const ticket = { id: 'T-003', lane: 'code-change' };
  const result = await R.runRealism(ticket);
  expect(result.events.length).toBe(4);
  expect(result.events.map(e => e.kind)).toEqual(R.HANDOFFS);
  expect(result.reliability.total).toBe(4);
  expect(result.reliability.ok).toBe(4);
  expect(result.reliability.fail).toBe(0);
  expect(result.reliability.mean_ms).toBeGreaterThanOrEqual(0);
});

test('runRealism: invokes onArtifact hook for each emitted event', async () => {
  const seen = [];
  await R.runRealism({ id: 'T-004', lane: 'code-change' }, {
    onArtifact: (ev) => { seen.push(ev.kind); }
  });
  expect(seen).toEqual(R.HANDOFFS);
});

test('runRealism: config-only ticket emits only 3 handoffs', async () => {
  const result = await R.runRealism({ id: 'T-005', lane: 'config-only' });
  expect(result.events.length).toBe(3);
  expect(result.reliability.total).toBe(3);
});

test('runConcurrent: processes all tickets and returns one result per ticket', async () => {
  const tickets = [
    { id: 'T-a', lane: 'code-change' },
    { id: 'T-b', lane: 'docs-only' },
    { id: 'T-c', lane: 'config-only' },
  ];
  const results = await R.runConcurrent(tickets, { concurrency: 2 });
  expect(results.length).toBe(3);
  expect(results.map(r => r.ticket_id)).toEqual(['T-a', 'T-b', 'T-c']);
});

test('aggregateReliability: computes per-handoff rate + compounding projection', () => {
  const fakeResults = [
    { reliability: { total: 4, ok: 4, fail: 0 } },
    { reliability: { total: 3, ok: 3, fail: 0 } },
    { reliability: { total: 4, ok: 3, fail: 1 } },
  ];
  const agg = R.aggregateReliability(fakeResults);
  expect(agg.transitions).toBe(11);
  expect(agg.ok).toBe(10);
  expect(agg.fail).toBe(1);
  expect(agg.per_handoff_rate).toBeCloseTo(10 / 11);
  expect(agg.four_chain_projected).toBeCloseTo(Math.pow(10 / 11, 4));
});

test('aggregateReliability: zero results returns zero rate without crash', () => {
  const agg = R.aggregateReliability([]);
  expect(agg.transitions).toBe(0);
  expect(agg.per_handoff_rate).toBe(0);
});
