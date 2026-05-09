#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { checkMergeTarget, logBypass } = require('./phase-gate');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const force = args.includes('--force');

const repo = process.env.GITHUB_REPOSITORY || 'chf3198/megingjord-harness';
let prNumber = null;
let branchName = null;
let baseBranch = null;

try {
  const positionalArgs = args.filter(a => !a.startsWith('--'));
  
  if (positionalArgs.length >= 2) {
    branchName = positionalArgs[0];
    baseBranch = positionalArgs[1];
  } else if (positionalArgs.length === 1 && !isNaN(Number(positionalArgs[0]))) {
    prNumber = Number(positionalArgs[0]);
  } else if (process.env.GITHUB_REF) {
    branchName = process.env.GITHUB_REF.replace('refs/heads/', '');
    baseBranch = process.env.GITHUB_BASE_REF || 'main';
  } else {
    branchName = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { encoding: 'utf8' }).trim();
    baseBranch = 'main';
  }

  if (prNumber) {
    const pr = JSON.parse(
      execFileSync('gh', ['pr', 'view', String(prNumber), '--repo', repo, '--json', 'headRefName,baseRefName'], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }).trim()
    );
    branchName = pr.headRefName;
    baseBranch = pr.baseRefName;
  }

  const failures = checkMergeTarget(baseBranch, branchName, prNumber);

  if (failures.length > 0) {
    if (!force && !dryRun) {
      logBypass('pr-merge-target-check', failures);
      console.error(`❌ Merge target validation failed for ${branchName} → ${baseBranch}:`);
      failures.forEach(f => console.error(`   ${f}`));
      console.error('Use --force to bypass.');
      process.exit(1);
    } else if (force) {
      logBypass('pr-merge-target-check-forced', failures);
      console.error(`⚠️  Merge target checks bypassed for ${branchName} → ${baseBranch}`);
    }
  }

  if (dryRun) {
    console.log(`✓ Merge target check dry-run for ${branchName} → ${baseBranch}: ${failures.length === 0 ? 'PASS' : 'FAIL'}`);
    if (failures.length > 0) {
      failures.forEach(f => console.log(`  ${f}`));
    }
  } else {
    console.log(`✓ Merge target validation passed: ${branchName} → ${baseBranch}`);
  }

  process.exit(failures.length > 0 && !force ? 1 : 0);
} catch (err) {
  console.error('Error:', err.message);
  process.exit(1);
}

