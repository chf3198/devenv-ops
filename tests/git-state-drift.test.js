#!/usr/bin/env node
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execSync } = require('node:child_process');
const { compute, freshness, worktree, target } = require('../scripts/global/git-state-drift-sensor');

function withTempRepo(setup, run) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'git-drift-'));
  const previousCwd = process.cwd();
  try {
    execSync('git init', { cwd: tempRoot, stdio: 'ignore' });
    execSync('git config user.email test@example.com', { cwd: tempRoot, stdio: 'ignore' });
    execSync('git config user.name Test User', { cwd: tempRoot, stdio: 'ignore' });
    fs.writeFileSync(path.join(tempRoot, 'README.md'), '# temp repo\n');
    execSync('git add README.md && git commit -m init', { cwd: tempRoot, stdio: 'ignore' });
    if (setup) setup(tempRoot);
    process.chdir(tempRoot);
    return run(tempRoot);
  } finally {
    process.chdir(previousCwd);
  }
}

test('git-state-drift: freshness returns a status field', () => {
  assert.ok(freshness().status, 'should have status field');
});

test('git-state-drift: worktree detects single vs multi worktree', () => {
  const result = worktree();
  assert.match(result.status, /isolated|collision|unknown/, 'status should be isolated, collision, or unknown');
});

test('git-state-drift: target validates branch naming compliance', () => {
  const result = target();
  assert.ok(result.detail, 'should have detail message');
});

test('git-state-drift: invalid branch prefix is flagged', () => {
  withTempRepo(tempRoot => {
    execSync('git checkout -b topic/feature', { cwd: tempRoot, stdio: 'ignore' });
  }, tempRoot => {
    const sensor = require('../scripts/global/git-state-drift-sensor');
    const result = sensor.freshness();
    assert.strictEqual(result.status, 'invalid-prefix');
    assert.match(result.detail, /invalid/);
  });
});

test('git-state-drift: detached HEAD is detected', () => {
  withTempRepo(tempRoot => {
    execSync('git checkout --detach', { cwd: tempRoot, stdio: 'ignore' });
  }, tempRoot => {
    const sensor = require('../scripts/global/git-state-drift-sensor');
    const result = sensor.freshness();
    assert.strictEqual(result.status, 'detached');
    assert.match(result.detail, /HEAD detached/);
  });
});

test('git-state-drift: orphaned main branch is detected', () => {
  withTempRepo(tempRoot => {
    execSync('git checkout -b feat/test', { cwd: tempRoot, stdio: 'ignore' });
  }, tempRoot => {
    const sensor = require('../scripts/global/git-state-drift-sensor');
    const result = sensor.freshness();
    assert.strictEqual(result.status, 'orphaned');
    assert.match(result.detail, /orphaned/);
  });
});

test('git-state-drift: compute returns PASS/FAIL with violation count', () => {
  const result = compute();
  assert.match(result.status, /PASS|FAIL/, 'status should be PASS or FAIL');
  assert.ok(typeof result.violation_count === 'number', 'violation_count should be a number');
  assert.ok(Array.isArray(result.violations), 'violations should be array');
});

test('git-state-drift: compute includes all three signals', () => {
  const result = compute();
  assert.ok(result.signals.freshness, 'should include freshness signal');
  assert.ok(result.signals.worktree, 'should include worktree signal');
  assert.ok(result.signals.target, 'should include target signal');
});

test('git-state-drift: violation detail includes reconciliation guidance', () => {
  const result = compute();
  result.violations.forEach(v => {
    assert.ok(v.guidance, `violation for ${v.signal} should have reconciliation guidance`);
  });
});

test('git-state-drift: compute exposes PASS/FAIL thresholds and escalation policy', () => {
  const result = compute();
  assert.ok(result.policy, 'policy should be present');
  assert.ok(result.policy.thresholds, 'thresholds should be present');
  assert.ok(result.policy.escalation, 'escalation policy should be present');
  assert.strictEqual(result.policy.escalation.fail_when_violation_count_gte, 1);
});
