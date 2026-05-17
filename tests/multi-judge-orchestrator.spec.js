'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { review, selectJudges, assignPersonas, isOptedOut, MIN_JUDGES, MIN_FAMILIES }
  = require('../scripts/global/multi-judge-orchestrator.js');

const STUB_REGISTRY = {
  qwen: [{ model: 'qwen2.5-coder:32b@fleet', provenance: 'vendor-attested' }],
  llama: [{ model: 'llama3.3:70b@fleet', provenance: 'vendor-attested' }],
  gemini: [{ model: 'gemini-2.5-flash@google', provenance: 'vendor-attested' }],
};

test('MIN_JUDGES is 3 and MIN_FAMILIES is 2 (matches Epic AC1)', () => {
  assert.equal(MIN_JUDGES, 3);
  assert.equal(MIN_FAMILIES, 2);
});

test('selectJudges picks 3 judges across 3 families', () => {
  const sel = selectJudges(STUB_REGISTRY, 3, 2);
  assert.equal(sel.length, 3);
  assert.equal(new Set(sel.map(s => s.family)).size, 3);
});

test('selectJudges fails when registry has too few families', () => {
  const tiny = { qwen: [{ model: 'q', provenance: 'unverified' }] };
  assert.throws(() => selectJudges(tiny, 3, 2), />=2 families/);
});

test('assignPersonas rotates approving/adversarial/balanced', () => {
  const sel = [{ family: 'a' }, { family: 'b' }, { family: 'c' }];
  const withP = assignPersonas(sel);
  assert.equal(withP[0].persona, 'approving');
  assert.equal(withP[1].persona, 'adversarial');
  assert.equal(withP[2].persona, 'balanced');
});

test('isOptedOut respects MEGINGJORD_MULTI_JUDGE_DISABLED', () => {
  const prior = process.env.MEGINGJORD_MULTI_JUDGE_DISABLED;
  process.env.MEGINGJORD_MULTI_JUDGE_DISABLED = '1';
  try { assert.equal(isOptedOut(), true); }
  finally { if (prior == null) delete process.env.MEGINGJORD_MULTI_JUDGE_DISABLED;
    else process.env.MEGINGJORD_MULTI_JUDGE_DISABLED = prior; }
});

test('review opt-out returns no-op structure', async () => {
  const prior = process.env.MEGINGJORD_MULTI_JUDGE_DISABLED;
  process.env.MEGINGJORD_MULTI_JUDGE_DISABLED = '1';
  try {
    const r = await review('artifact', { dispatcher: () => ({ score: 0.5 }) });
    assert.equal(r.opted_out, true);
    assert.equal(r.n, 0);
  } finally {
    if (prior == null) delete process.env.MEGINGJORD_MULTI_JUDGE_DISABLED;
    else process.env.MEGINGJORD_MULTI_JUDGE_DISABLED = prior;
  }
});

test('review requires dispatcher', async () => {
  await assert.rejects(() => review('artifact', { registry: STUB_REGISTRY }), /dispatcher/);
});

test('review fans out across families with mock dispatcher', async () => {
  const calls = [];
  const dispatcher = async (model, prompt) => {
    calls.push({ model, persona: prompt.match(/red-team|adversarial/i) ? 'adversarial'
      : prompt.match(/charitably/) ? 'approving' : 'balanced' });
    return { score: 0.8, rationale: `from ${model}` };
  };
  const r = await review('test artifact', { registry: STUB_REGISTRY, dispatcher });
  assert.equal(r.n, 3);
  assert.equal(r.family_count, 3);
  assert.equal(calls.length, 3);
  assert.equal(r.mean, 0.8);
  assert.ok(r.judges.find(j => j.persona === 'adversarial'));
});

test('review surfaces adversarial dissent when judges disagree', async () => {
  const dispatcher = async (model, prompt) => {
    const isAdversarial = /red-team|adversarial/i.test(prompt);
    return { score: isAdversarial ? 0.3 : 0.9, rationale: 'mock' };
  };
  const r = await review('weak artifact', { registry: STUB_REGISTRY, dispatcher });
  assert.equal(r.adversarial_dissent, true);
  assert.ok(r.stdev > 0);
});
