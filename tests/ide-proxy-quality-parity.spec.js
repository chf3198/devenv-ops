// Quality-parity framework tests (Epic #1020 AC).
const { test, expect } = require('@playwright/test');
const path = require('path');
const QP = require(path.resolve(__dirname, '..', 'scripts', 'global', 'ide-proxy-quality-parity.js'));

test('jaccard returns 1 for identical strings', () => {
  expect(QP.jaccard('the quick brown fox', 'the quick brown fox')).toBe(1);
});

test('jaccard returns 0 for fully disjoint strings', () => {
  expect(QP.jaccard('abc def', 'xyz uvw')).toBe(0);
});

test('lengthRatio handles equal lengths', () => {
  expect(QP.lengthRatio('aaa', 'bbb')).toBe(1);
});

test('lengthRatio detects asymmetry', () => {
  expect(QP.lengthRatio('a', 'aaaa')).toBe(0.25);
});

test('PARITY_FLOOR is 0.40 (empirically-calibrated no-regression bar)', () => {
  expect(QP.PARITY_FLOOR).toBe(0.40);
});

test('dry-run mode returns gate PASS without API calls', async () => {
  const r = await QP.run({ mode: 'dry-run' });
  expect(r.mode).toBe('dry-run');
  expect(r.totalTurns).toBe(12);
  expect(r.gate).toBe('PASS');
  expect(r.meanParity).toBeGreaterThanOrEqual(QP.PARITY_FLOOR);
});

test('measureTurn dry-run produces parity=1 sentinel', async () => {
  const turn = { id: 1, text: 'hi' };
  const r = await QP.measureTurn(turn, 'cloud-fleet-fast', 'dry-run');
  expect(r.parity).toBe(1);
  expect(r.id).toBe(1);
});
