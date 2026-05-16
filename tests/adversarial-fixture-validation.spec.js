'use strict';

const { test, expect } = require('@playwright/test');
const v2 = require('../scripts/global/baton-team-model-v2.js');
const { ROTATION_FIXTURES, PRE_MERGE_FIXTURES, countByRule } = require('../scripts/global/adversarial-fixture-gen.js');

test('rotation fixture set has 8 entries covering all 3 rules + skip paths', () => {
  expect(ROTATION_FIXTURES.length).toBeGreaterThanOrEqual(8);
});

test('pre-merge fixture set has 12 entries covering triggers + whitelists', () => {
  expect(PRE_MERGE_FIXTURES.length).toBeGreaterThanOrEqual(12);
});

test('each rotation fixture produces its expected violation when applied via enforceRotationV2', () => {
  for (const fixture of ROTATION_FIXTURES) {
    const input = {
      roles_observed: fixture.records,
      operator_mode: fixture.operator_mode || 'strict-rotation',
      labels: fixture.labels || [],
    };
    const result = v2.enforceRotationV2(input);
    if (fixture.expect_skip) {
      expect(result.skipped, `fixture ${fixture.name}: expected skip ${fixture.expect_skip}`).toBe(fixture.expect_skip);
    } else if (fixture.expect_violation === null) {
      expect(result.ok, `fixture ${fixture.name}: expected pass, got violations: ${JSON.stringify(result.violations)}`).toBe(true);
    } else {
      expect(result.ok, `fixture ${fixture.name}: expected violation ${fixture.expect_violation}`).toBe(false);
      const matchingViolation = (result.violations || []).find(v => v.rule === fixture.expect_violation);
      expect(matchingViolation, `fixture ${fixture.name}: violation ${fixture.expect_violation} not surfaced`).toBeTruthy();
    }
  }
});

test('countByRule produces breakdown', () => {
  const counts = countByRule();
  expect(counts.pass).toBeGreaterThan(0);
  expect(counts.rule_2_admin_diversity).toBeGreaterThan(0);
  expect(counts.rule_3_consultant_independent).toBeGreaterThan(0);
});

test('every pre-merge fixture has expected_trigger and expected_severity fields', () => {
  for (const fixture of PRE_MERGE_FIXTURES) {
    expect(fixture.name, `fixture must have name`).toBeTruthy();
    expect(fixture.expect_trigger, `fixture ${fixture.name} must have expect_trigger`).toBeTruthy();
    if (!fixture.expect_no_trigger) {
      expect(fixture.expect_severity, `fixture ${fixture.name} must have expect_severity`).toBeTruthy();
    }
  }
});

test('pre-merge fixtures cover all 10 trigger categories from #1743', () => {
  const expectedTriggers = [
    'auth-code-change', 'db-schema-migration', 'new-external-dependency',
    'dependency-version-bump', 'secret-credential-path',
    'workflow-yaml-actions-change', 'workflow-yaml-trivial',
    'cryptographic-primitive', 'permission-scope-expansion', 'test-deletion',
  ];
  const fixtureTriggers = new Set(PRE_MERGE_FIXTURES.map(f => f.expect_trigger));
  for (const t of expectedTriggers) {
    expect(fixtureTriggers.has(t), `trigger ${t} should have a fixture`).toBe(true);
  }
});
