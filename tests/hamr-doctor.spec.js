// hamr-doctor.spec.js — HAMR Wave 1 doctor unit tests (#896)
// Deterministic fixtures only — no live capability-probe call.
const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const MOD_PATH = path.join(__dirname, '..', 'scripts', 'global', 'hamr-doctor.js');
const doc = require(MOD_PATH);

const FIX_DIR = path.join(__dirname, 'fixtures');
const fix = (n) => JSON.parse(fs.readFileSync(path.join(FIX_DIR, n), 'utf8'));
const stubKeyTier = { tier: 'T4', source: 'ephemeral-in-memory', fallback_reason: 'no-T1-T2-T3-available' };

// 1. tier1 fixture → tier1-full + zero remediations
test('tier1 fixture yields tier1-full with zero remediations', () => {
  const report = doc.buildReport(fix('capabilities-tier1.json'), stubKeyTier);
  expect(report.tier).toBe('tier1-full');
  expect(report.remediations).toHaveLength(0);
  expect(report.capabilities_snapshot_present).toBe(true);
});

// 2. tier2 fixture → tier2-degraded + 4 remediations (r2, wrangler, mcp, npm)
test('tier2 fixture yields tier2-degraded with remediations for missing capabilities', () => {
  const report = doc.buildReport(fix('capabilities-tier2.json'), stubKeyTier);
  expect(report.tier).toBe('tier2-degraded');
  const caps = report.remediations.map(r => r.capability);
  expect(caps).toContain('r2');
  expect(caps).toContain('wrangler');
  expect(caps).toContain('mcp_client');
  expect(caps).toContain('npm_trusted_publishing');
  expect(caps).not.toContain('github_oidc');
});

// 3. tier3 fixture → tier3-offline + reason cloudflare-unreachable
test('tier3 fixture yields tier3-offline due to cloudflare unreachable', () => {
  const report = doc.buildReport(fix('capabilities-tier3.json'), stubKeyTier);
  expect(report.tier).toBe('tier3-offline');
  expect(report.reason).toBe('cloudflare-unreachable');
});

// 4. null capabilities → tier3-offline + capabilities_snapshot_present:false
test('missing capabilities snapshot yields tier3-offline with snapshot_present:false', () => {
  const report = doc.buildReport(null, stubKeyTier);
  expect(report.tier).toBe('tier3-offline');
  expect(report.reason).toBe('no-capability-snapshot');
  expect(report.capabilities_snapshot_present).toBe(false);
});

// 5. report includes key_tier from probe
test('report includes key_tier from baton-signing probe result', () => {
  const report = doc.buildReport(fix('capabilities-tier1.json'), stubKeyTier);
  expect(report.key_tier.tier).toBe('T4');
  expect(report.key_tier.source).toBe('ephemeral-in-memory');
});

// 6. report includes judge families list
test('report includes 5 judge families from judge-quorum registry', () => {
  const report = doc.buildReport(fix('capabilities-tier1.json'), stubKeyTier);
  expect(report.judge_families).toHaveLength(5);
  for (const f of ['qwen', 'llama', 'claude', 'gemini', 'mistral']) {
    expect(report.judge_families).toContain(f);
  }
});

// 7. tierFor() handles missing nested fields without crash
test('tierFor returns tier3 for empty/malformed capabilities', () => {
  expect(doc.tierFor({}).tier).toBe('tier3-offline');
  expect(doc.tierFor({ cloudflare: {} }).tier).toBe('tier3-offline');
});

// 8. buildRemediations() returns empty list when all capabilities present
test('buildRemediations returns empty list for tier1 fixture', () => {
  expect(doc.buildRemediations(fix('capabilities-tier1.json'))).toEqual([]);
});
