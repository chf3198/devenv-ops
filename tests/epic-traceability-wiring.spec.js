// epic-traceability-lint + body-ac-lint wiring tests (#1423, Epic #1407 AC5+AC6).
const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');
const Trace = require(path.resolve(__dirname, '..', 'scripts', 'global', 'megalint', 'epic-ac-traceability.js'));
const BodyAc = require(path.resolve(__dirname, '..', 'scripts', 'global', 'megalint', 'body-ac-truthfulness.js'));
const Helpers = require(path.resolve(__dirname, '..', 'scripts', 'global', 'megalint', 'epic-traceability-helpers.js'));

const WF_DIR = path.resolve(__dirname, '..', '.github', 'workflows');

test('epic-traceability YAML wires megalint validator + helpers + advisory mode', () => {
  const yaml = fs.readFileSync(path.join(WF_DIR, 'epic-traceability-lint.yml'), 'utf-8');
  expect(yaml).toContain('require(\'./scripts/global/megalint/epic-ac-traceability.js\')');
  expect(yaml).toContain('epic-traceability-helpers.js');
  expect(yaml).toContain('core.warning'); // advisory soak
  expect(yaml).toContain('marker = \'<!-- megalint-epic-traceability -->\'');
});

test('body-ac-lint YAML wires megalint validator + checks terminal-only', () => {
  const yaml = fs.readFileSync(path.join(WF_DIR, 'body-ac-lint.yml'), 'utf-8');
  expect(yaml).toContain('require(\'./scripts/global/megalint/body-ac-truthfulness.js\')');
  expect(yaml).toContain('core.warning');
  expect(yaml).toContain('marker = \'<!-- megalint-body-ac-truthfulness -->\'');
  expect(yaml).toContain('status:done');
});

test('formatComment helper produces well-formed advisory body', () => {
  const out = Helpers.formatComment('<!-- m -->', 99,
    [{ rule: 'epic-body-missing-child-refs', detail: '5 ACs, 0 refs' }]);
  expect(out).toContain('<!-- m -->');
  expect(out).toContain('Epic #99');
  expect(out).toContain('epic-body-missing-child-refs');
  expect(out).toContain('_Posted by epic-traceability-lint (advisory)._');
});

test('resolveEpic: returns null when issue is not Epic and body has no parent ref', async () => {
  const fakeGithub = {
    rest: { issues: { get: async () => { throw new Error('should not be called'); } } },
  };
  const r = await Helpers.resolveEpic({
    github: fakeGithub, owner: 'a', repo: 'b',
    issueNum: 1, labels: ['type:task'], body: 'no parent here',
  });
  expect(r).toBeNull();
});

test('resolveEpic: returns Epic data when issue IS an Epic', async () => {
  const fakeGithub = {
    rest: { issues: { get: async () => ({ data: { body: 'EPIC BODY', labels: [{ name: 'type:epic' }] } }) } },
  };
  const r = await Helpers.resolveEpic({
    github: fakeGithub, owner: 'a', repo: 'b',
    issueNum: 99, labels: ['type:epic'], body: '',
  });
  expect(r.number).toBe(99);
  expect(r.body).toBe('EPIC BODY');
});

test('resolveEpic: resolves parent Epic from child body ref', async () => {
  const fakeGithub = {
    rest: { issues: { get: async ({ issue_number }) =>
      ({ data: { number: issue_number, body: 'PARENT', labels: [{ name: 'type:epic' }] } }) } },
  };
  const r = await Helpers.resolveEpic({
    github: fakeGithub, owner: 'a', repo: 'b',
    issueNum: 100, labels: ['type:task'], body: '## Parent\n- Epic: #42\n',
  });
  expect(r.number).toBe(42);
});

test('epic-ac-traceability validator: passes Epic with ACs + child refs', () => {
  const r = Trace.validate({
    body: '- [ ] AC1\n- [ ] AC2\n- [ ] AC3\nChildren: #100, #101',
    labels: ['type:epic'], issueNumber: 42,
  });
  expect(r.ok).toBe(true);
});

test('body-ac validator: terminal ticket with unticked AC fails', () => {
  const r = BodyAc.validate({
    body: '- [ ] AC1: foo', labels: ['status:done'], state: 'closed',
  });
  expect(r.ok).toBe(false);
});

test('body-ac validator: cancelled state is permitted', () => {
  const r = BodyAc.validate({
    body: '- [ ] AC1: foo', labels: ['status:cancelled'], state: 'closed',
  });
  expect(r.ok).toBe(true);
});
