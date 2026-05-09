const { test, expect } = require('@playwright/test');
const path = require('path');

test('quality parity report exposes calibrated floor and regressions', async () => {
  const { buildQualityParityReport } = require(path.join(__dirname, '../scripts/global/quality-parity-report'));
  const report = await buildQualityParityReport({ mode: 'dry-run' });
  expect(report.mode).toBe('dry-run');
  expect(report.parityFloor).toBe(0.40);
  expect(report.calibrated_floor).toBe(0.40);
  expect(report.floorDelta).toBeGreaterThan(0);
  expect(report.gate).toBe('PASS');
  expect(report.regressions.length).toBeGreaterThan(0);
});

test('quality parity panel renders caveat and gate', () => {
  global.esc = v => String(v);
  const { renderQualityParityPanel } = require(path.join(__dirname, '../dashboard/js/quality-parity'));
  const html = renderQualityParityPanel({
    mode: 'dry-run',
    meanParity: 1,
    parityFloor: 0.4,
    floorDelta: 0.6,
    calibrated_floor: 0.4,
    totalTurns: 12,
    gate: 'PASS',
    readiness: { liveMode: false },
    regressions: [{ id: 1, lane: 'fleet', parity: 1, jaccard: 1, length_ratio: 1 }],
  });
  expect(html).toContain('Empirical Quality Parity');
  expect(html).toContain('Dry-run corpus only');
  expect(html).toContain('PASS');
  expect(html).toContain('fleet');
});