// stress-orchestrator — Tier-aware entry-point tests (#1408).
const { test, expect } = require('@playwright/test');
const path = require('path');
const O = require(path.resolve(__dirname, '..', 'scripts', 'global', 'stress-orchestrator.js'));

test('readTier: defaults to A when env unset', () => {
  delete process.env.MEGINGJORD_STRESS_TIER;
  expect(O.readTier()).toBe('A');
});

test('readTier: honors env var (case-insensitive)', () => {
  process.env.MEGINGJORD_STRESS_TIER = 'b';
  expect(O.readTier()).toBe('B');
  process.env.MEGINGJORD_STRESS_TIER = 'C';
  expect(O.readTier()).toBe('C');
  delete process.env.MEGINGJORD_STRESS_TIER;
});

test('readTier: rejects invalid tier', () => {
  process.env.MEGINGJORD_STRESS_TIER = 'Z';
  expect(() => O.readTier()).toThrow(/Invalid tier/);
  delete process.env.MEGINGJORD_STRESS_TIER;
});

test('tier capability gates: A=mock, B=real-gh, C/D=real-provider', () => {
  expect(O.tierAllowsRealProvider('A')).toBe(false);
  expect(O.tierAllowsRealProvider('B')).toBe(false);
  expect(O.tierAllowsRealProvider('C')).toBe(true);
  expect(O.tierAllowsRealProvider('D')).toBe(true);
  expect(O.tierAllowsRealGitHub('A')).toBe(false);
  expect(O.tierAllowsRealGitHub('B')).toBe(true);
});

test('cost budgets: A=$0, B=$0, C=$0.05, D=$2', () => {
  expect(O.tierAllowsCostBudget('A')).toBe(0);
  expect(O.tierAllowsCostBudget('B')).toBe(0);
  expect(O.tierAllowsCostBudget('C')).toBeCloseTo(0.05);
  expect(O.tierAllowsCostBudget('D')).toBeCloseTo(2.00);
});

test('loadFixture: reads tickets fixture by name', () => {
  const tickets = O.loadFixture('tickets');
  expect(Array.isArray(tickets)).toBe(true);
  expect(tickets.length).toBeGreaterThanOrEqual(5);
  expect(tickets[0]).toHaveProperty('id');
  expect(tickets[0]).toHaveProperty('lane');
});

test('loadFixture: throws on missing fixture', () => {
  expect(() => O.loadFixture('nonexistent-fixture-xyz')).toThrow(/Fixture missing/);
});

test('emitRunStart: produces stress.run.start event with tier + cost metadata', () => {
  const ev = O.emitRunStart('C', 'run-001');
  expect(ev.event).toBe('stress.run.start');
  expect(ev.tier).toBe('C');
  expect(ev.run_id).toBe('run-001');
  expect(ev.cost_budget_usd).toBeCloseTo(0.05);
  expect(ev.allows_real_provider).toBe(true);
  expect(ev.allows_real_github).toBe(true);
  expect(ev.ts).toMatch(/^\d{4}-\d{2}-\d{2}T/);
});

test('emitRunEnd: produces stress.run.end with summary fields', () => {
  const ev = O.emitRunEnd('A', 'run-002', { tickets: 5, completed: 4, failed: 1 });
  expect(ev.event).toBe('stress.run.end');
  expect(ev.tickets).toBe(5);
  expect(ev.completed).toBe(4);
  expect(ev.failed).toBe(1);
});

test('run: invokes onTicket hook for each fixture ticket; reports summary', async () => {
  const seen = [];
  const result = await O.run({
    tier: 'A', runId: 'run-test', silent: true,
    onTicket: async (t) => { seen.push(t.id); }
  });
  expect(seen.length).toBe(5);
  expect(result.summary.tickets).toBe(5);
  expect(result.summary.completed).toBe(5);
  expect(result.summary.failed).toBe(0);
});

test('run: counts failures from onTicket errors without aborting', async () => {
  const result = await O.run({
    tier: 'A', runId: 'run-fail', silent: true,
    onTicket: async (t) => { if (t.id === 'T-stress-003') throw new Error('boom'); }
  });
  expect(result.summary.completed).toBe(4);
  expect(result.summary.failed).toBe(1);
  expect(result.summary.last_error).toBe('boom');
});
