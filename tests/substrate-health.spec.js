// substrate-health probe tests (#911) — fixture-based, no live calls.
const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const SH = require(path.resolve(__dirname, '..', 'scripts', 'global', 'substrate-health.js'));

const TIER1_CAPS = {
  fleet: { 'windows-laptop': { reachable: true, models: ['x'] }, 'penguin-1': { reachable: true } },
  providers: { anthropic: { available: true }, cerebras: { available: true }, groq: { available: true }, openai: { available: true } },
};
const TIER2_CAPS = {
  fleet: { 'windows-laptop': { reachable: true } },
  providers: { anthropic: { available: true } },
};
const TIER3_CAPS = { fleet: {}, providers: {} };

test('deriveTier returns tier1-full when all substrates healthy', () => {
  const probe = {
    hamr_worker: { reachable: true, tier: 'tier1-full' },
    fleet: TIER1_CAPS.fleet,
    providers: TIER1_CAPS.providers,
    judges: { qwen: { available: true }, llama: { available: true }, claude: { available: true } },
  };
  expect(SH.deriveTier(probe).tier).toBe('tier1-full');
});

test('deriveTier returns tier2-degraded with partial substrates', () => {
  const probe = {
    hamr_worker: { reachable: true, tier: 'tier2-degraded' },
    fleet: TIER2_CAPS.fleet,
    providers: TIER2_CAPS.providers,
    judges: { qwen: { available: true } },
  };
  const r = SH.deriveTier(probe);
  expect(r.tier).toBe('tier2-degraded');
  expect(r.reason).toContain('partial');
});

test('deriveTier returns tier3-offline when worker unreachable', () => {
  const probe = {
    hamr_worker: { reachable: false, reason: 'connection_refused' },
    fleet: {}, providers: {}, judges: {},
  };
  const r = SH.deriveTier(probe);
  expect(r.tier).toBe('tier3-offline');
  expect(r.reason).toBe('hamr-worker-unreachable');
});

test('deriveTier returns tier3-offline when worker self-reports offline', () => {
  const probe = {
    hamr_worker: { reachable: true, tier: 'tier3-offline' },
    fleet: { x: { reachable: true } }, providers: { y: { available: true } }, judges: {},
  };
  const r = SH.deriveTier(probe);
  expect(r.tier).toBe('tier3-offline');
  expect(r.reason).toBe('worker-self-reported-offline');
});

test('deriveTier returns tier3-offline with no fleet or providers (worker tier2)', () => {
  const probe = {
    hamr_worker: { reachable: true, tier: 'tier2-degraded' },
    fleet: {}, providers: {}, judges: {},
  };
  expect(SH.deriveTier(probe).tier).toBe('tier3-offline');
});

test('probeSubstrateHealth handles missing capabilities snapshot', async () => {
  // Pass an empty capabilities object to bypass disk read; stub worker probe via env.
  const result = await SH.probeSubstrateHealth({ capabilities: { fleet: {}, providers: {} }, workerUrl: 'http://127.0.0.1:1' });
  expect(result.tier).toBe('tier3-offline');
  expect(result.hamr_worker.reachable).toBe(false);
});

test('probeHamrWorker returns reachable:false on bad URL', async () => {
  const r = await SH.probeHamrWorker('http://127.0.0.1:1');
  expect(r.reachable).toBe(false);
});

test('OUT_FILE is under operator home (~/.megingjord/)', () => {
  expect(SH.OUT_FILE).toMatch(/\.megingjord[\/\\]substrate-health\.json$/);
  expect(SH.OUT_FILE.startsWith(require('os').homedir())).toBe(true);
});
