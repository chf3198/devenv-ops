// signer-lint wiring tests for D-1407-03 (#1422, Epic #1407 AC4).
const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');
const Sig = require(path.resolve(__dirname, '..', 'scripts', 'global', 'megalint', 'signer-fidelity.js'));

test('signer-lint workflow YAML wires megalint signer-fidelity validator', () => {
  const yaml = fs.readFileSync(
    path.resolve(__dirname, '..', '.github', 'workflows', 'signer-lint.yml'), 'utf-8'
  );
  expect(yaml).toContain('require(\'./scripts/global/megalint/signer-fidelity.js\')');
  expect(yaml).toContain('issues:');
  expect(yaml).toContain('opened, edited, reopened');
  expect(yaml).toContain('marker = \'<!-- megalint-signer-fidelity -->\'');
  // Advisory mode for soak period per #1406 risk mitigation
  expect(yaml).toContain('core.warning');
});

test('signer-lint: validator clears OK on worker-aliased body', () => {
  const r = Sig.validate({ body: 'Signed-by: Soren Mason\nTeam&Model: copilot:claude-sonnet-4-6@github' });
  expect(r.ok).toBe(true);
});

test('signer-lint: validator catches Curtis Franks signer', () => {
  const r = Sig.validate({ body: 'Signed-by: Curtis Franks\nTeam&Model: copilot:claude-sonnet-4-6@github' });
  expect(r.ok).toBe(false);
  expect(r.violations[0].rule).toBe('client-identity-as-signer');
});

test('signer-lint: workflow has issues: trigger only (not pull_request)', () => {
  const yaml = fs.readFileSync(
    path.resolve(__dirname, '..', '.github', 'workflows', 'signer-lint.yml'), 'utf-8'
  );
  expect(yaml).toMatch(/on:\s*\n\s*issues:/);
  expect(yaml).not.toContain('pull_request:');
});
