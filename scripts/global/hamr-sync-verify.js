#!/usr/bin/env node
// hamr-sync-verify.js — HAMR Wave 7 child E (#955).
// Read-only: confirms HAMR scripts are present in ~/.copilot/scripts/ and
// ~/.codex/devenv-ops/scripts/ so all 3 teams have local access.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const HAMR_SCRIPTS = [
  'cache-hit-gate.js', 'cache-stats-emit.js', 'cache-stats-push.js',
  'header-spillover.js', 'sticky-route.js', 'litellm-client.js',
  'token-provider-adapters.js', 'hamr-provider-wrapper.js',
  'substrate-health-push.js', 'log-rotate.js',
  'anthropic-batch-router.js', 'batch-validator.js',
  'rule-coverage-gate.js', 'constitution-compressor.js',
];

const TARGETS = [
  { team: 'copilot', dir: path.join(os.homedir(), '.copilot', 'scripts') },
  { team: 'codex', dir: path.join(os.homedir(), '.codex', 'devenv-ops', 'scripts') },
];

function checkTarget(target) {
  if (!fs.existsSync(target.dir)) {
    return { team: target.team, dir: target.dir, exists: false, missing: HAMR_SCRIPTS, present: [] };
  }
  const present = [];
  const missing = [];
  for (const script of HAMR_SCRIPTS) {
    if (fs.existsSync(path.join(target.dir, script))) present.push(script);
    else missing.push(script);
  }
  return { team: target.team, dir: target.dir, exists: true, missing, present };
}

function run() {
  const results = TARGETS.map(checkTarget);
  const totalMissing = results.reduce((sum, r) => sum + r.missing.length, 0);
  const summary = {
    ok: totalMissing === 0,
    targets: results,
    total_missing: totalMissing,
    hint: totalMissing > 0 ? 'run `npm run sync:both:apply` to deploy HAMR scripts' : null,
  };
  return summary;
}

if (require.main === module) {
  const result = run();
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.ok ? 0 : 1);
}

module.exports = { run, HAMR_SCRIPTS, TARGETS };
