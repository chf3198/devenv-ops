// closeout-lint wiring — golden-file tests for D-1407-02 (#1421, Epic #1407 AC3+AC7).
// Exercises the same megalint dispatch path that .github/workflows/closeout-lint.yml uses.
const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');
const megalint = require(path.resolve(__dirname, '..', 'scripts', 'global', 'megalint', 'index.js'));

const FIXTURE_DIR = path.resolve(__dirname, 'fixtures', 'closeout-lint');

function loadFixture(name) {
  return JSON.parse(fs.readFileSync(path.join(FIXTURE_DIR, `${name}.json`), 'utf-8'));
}

test('closeout-lint: passing-case fixture — both validators pass', () => {
  const fixture = loadFixture('passing-case');
  const mh = megalint.run('manager-handoff', fixture.input);
  const cl = megalint.run('consultant-closeout', fixture.input);
  expect(mh.found).toBe(true);
  expect(mh.ok).toBe(true);
  expect(cl.found).toBe(true);
  expect(cl.ok).toBe(true);
});

test('closeout-lint: failing-cases — each case triggers expected violation', () => {
  const fixtures = loadFixture('failing-cases');
  for (const fixtureCase of fixtures.cases) {
    const input = {
      comments: [{ body: fixtureCase.input_body }],
      lane: 'lane:code-change', labels: [], state: 'open', body: '',
    };
    let validatorName;
    if (fixtureCase.input_body.includes('MANAGER_HANDOFF')) validatorName = 'manager-handoff';
    else if (fixtureCase.input_body.includes('CONSULTANT_CLOSEOUT')) validatorName = 'consultant-closeout';
    const result = megalint.run(validatorName, input);
    expect(result.ok, `case=${fixtureCase.name}`).toBe(false);
    expect(
      result.violations.some(v => v.rule === fixtureCase.expected_violation_rule),
      `case=${fixtureCase.name} expected rule=${fixtureCase.expected_violation_rule}`
    ).toBe(true);
  }
});

test('closeout-lint: workflow YAML wires both validators via megalint.run', () => {
  const yaml = fs.readFileSync(
    path.resolve(__dirname, '..', '.github', 'workflows', 'closeout-lint.yml'), 'utf-8'
  );
  expect(yaml).toContain("megalint.run('manager-handoff'");
  expect(yaml).toContain("megalint.run('consultant-closeout'");
  expect(yaml).toContain('core.setFailed');
  expect(yaml).not.toContain('core.warning'); // promoted from advisory to required
});
