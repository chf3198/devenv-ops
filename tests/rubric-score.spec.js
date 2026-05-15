const { test, expect } = require('@playwright/test');
const path = require('path');
const root = path.resolve(__dirname, '..');
const rubric = require(path.join(root, 'inventory', 'rubric-g1-g9-v2.json'));
const R = require(path.join(root, 'scripts', 'global', 'rubric-score.js'));
const closeout = require(path.join(root, 'scripts', 'global', 'megalint', 'consultant-closeout.js'));
const preflight = require(path.join(root, 'scripts', 'global', 'baton-schema-preflight.js'));
const failure = require(path.join(root, 'scripts', 'global', 'megalint', 'goal-failure-emission.js'));

const trail = `MANAGER_HANDOFF COLLABORATOR_HANDOFF ADMIN_HANDOFF CONSULTANT_CLOSEOUT
status:review scope bounded validation gates HAMR zero-cost cross-team Claude Copilot
npx playwright test tests/rubric-score.spec.js`;
const diff = `#!/usr/bin/env node
node scripts/global/rubric-score.js --trail x --diff y --closeout z
tests/rubric-score.spec.js
if (fail) { throw new Error('violation'); }`;
const body = `## CONSULTANT_CLOSEOUT
{"rubric_version":"g1-g9-v2","goals":{"G1":{"boxes_checked":3,"boxes_total":3,"score":10},
"G2":{"boxes_checked":3,"boxes_total":3,"score":10}},"mean":10}
privacy security repo-local portable compat transition legacy v1 back-compat
machine-readable JSON boxes_checked boxes_total mean verification-timestamp: 2026-05-15T00:00:00Z
verdict: approve
Signed-by: Quinn Critic
Team&Model: codex:gpt-5.4@openai
Role: consultant`;
const passCtx = { trail, diff, closeout: body };

test('#1575 rubric schema has G1-G9 with >=3 boxes', () => {
  expect(R.validateRubric(rubric)).toEqual({ ok: true, missing: [] });
  expect(Object.keys(rubric.goals)).toEqual(['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7', 'G8', 'G9']);
});

test('#1575 every evidence box command is runnable in isolation', () => {
  for (const goal of Object.values(rubric.goals)) {
    for (const box of goal.boxes) expect(R.evaluateCommand(box.evidence_command, passCtx).ok).toBe(true);
  }
});

test('#1575 score is 10 iff all boxes pass', () => {
  const result = R.scoreRubric(rubric, passCtx);
  for (const goal of Object.values(result.goals)) {
    expect(goal.boxes_checked).toBe(goal.boxes_total);
    expect(goal.score).toBe(10);
  }
  expect(result.mean).toBe(10);
});

test('#1575 one missing first box per goal lowers arithmetic deterministically', () => {
  for (const [goalId, goal] of Object.entries(rubric.goals)) {
    const box = goal.boxes.find(item => !item.evidence_command.startsWith('not_regex:'));
    const source = box.evidence_command.split(':')[1];
    const value = '';
    const result = R.scoreRubric(rubric, { ...passCtx, [source]: value });
    expect(result.goals[goalId].score).toBeLessThan(10);
  }
});

test('#1575 closeout validators accept structured v2 and legacy v1', () => {
  const legacy = body.replace(/\\{[\\s\\S]+?\\}\\nprivacy/, 'Rubric: G1=9, G2=8.\\nprivacy');
  expect(closeout.validate({ comments: [{ body }] }).ok).toBe(true);
  expect(closeout.validate({ comments: [{ body: legacy }] }).ok).toBe(true);
  expect(preflight.validate('consultant', body).ok).toBe(true);
});

test('#1575 goal failure extraction reads v2 structured scores', () => {
  const structured = body.replace('"score":10}', '"score":6}');
  expect(failure.extractGoalScores(structured).some(item => item.goal === 'G1' && item.score === 6)).toBe(true);
});
