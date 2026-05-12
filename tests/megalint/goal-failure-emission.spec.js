// goal-failure-emission tests (#1376, Epic #1308 Tier-3 enforcement).
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const os = require('os');
const path = require('path');
const G = require(path.resolve(__dirname, '..', '..', 'scripts', 'global', 'megalint', 'goal-failure-emission.js'));
const Cons = require(path.resolve(__dirname, '..', '..', 'scripts', 'global', 'megalint', 'consultant-closeout.js'));

function makeIncidentsFile(events) {
  const file = path.join(os.tmpdir(), `incidents-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jsonl`);
  fs.writeFileSync(file, events.map(e => JSON.stringify(e)).join('\n'));
  return file;
}

test('extractGoalScores: simple "G1=9" format', () => {
  const scores = G.extractGoalScores('Rubric: G1=9, G2=8, G3=10');
  expect(scores).toEqual([
    { goal: 'G1', score: 9 }, { goal: 'G2', score: 8 }, { goal: 'G3', score: 10 },
  ]);
});

test('extractGoalScores: "G7: 6/10" format', () => {
  const scores = G.extractGoalScores('Per-goal: G7: 6/10, G8: 5/10');
  expect(scores.find(s => s.goal === 'G7')).toEqual({ goal: 'G7', score: 6 });
  expect(scores.find(s => s.goal === 'G8')).toEqual({ goal: 'G8', score: 5 });
});

test('extractGoalScores: "G5: 6 —" em-dash format', () => {
  const scores = G.extractGoalScores('G5: 6 — observability gap');
  expect(scores).toEqual([{ goal: 'G5', score: 6 }]);
});

test('extractGoalScores: deduplicates repeated goals (uses first occurrence)', () => {
  const scores = G.extractGoalScores('summary G7=8 details G7=6');
  expect(scores.filter(s => s.goal === 'G7').length).toBe(1);
  expect(scores[0].score).toBe(8);
});

test('extractGoalScores: rejects out-of-range scores (>10 or <0)', () => {
  const scores = G.extractGoalScores('G7=15 G8=-1 G9=8');
  expect(scores.map(s => s.goal)).toEqual(['G9']);
});

test('extractGoalScores: empty body returns empty array', () => {
  expect(G.extractGoalScores('')).toEqual([]);
  expect(G.extractGoalScores(null)).toEqual([]);
});

test('eventMatchesGoal: full match (tier=3, consultant, ticket_ref, evidence)', () => {
  const event = { tier: 3, trigger_role: 'consultant', ticket_ref: '#123', evidence: ['goal:G7', 'score:6'] };
  expect(G.eventMatchesGoal(event, '#123', 'G7')).toBe(true);
});

test('eventMatchesGoal: rejects mismatched ticket_ref', () => {
  const event = { tier: 3, trigger_role: 'consultant', ticket_ref: '#999', evidence: ['goal:G7'] };
  expect(G.eventMatchesGoal(event, '#123', 'G7')).toBe(false);
});

test('eventMatchesGoal: rejects non-consultant trigger_role', () => {
  const event = { tier: 3, trigger_role: 'manager', ticket_ref: '#123', evidence: ['goal:G7'] };
  expect(G.eventMatchesGoal(event, '#123', 'G7')).toBe(false);
});

test('eventMatchesGoal: rejects tier != 3', () => {
  const event = { tier: 2, trigger_role: 'consultant', ticket_ref: '#123', evidence: ['goal:G7'] };
  expect(G.eventMatchesGoal(event, '#123', 'G7')).toBe(false);
});

test('checkGoalFailureEvents: sub-7 with matching event → ok', () => {
  const file = makeIncidentsFile([
    { tier: 3, trigger_role: 'consultant', ticket_ref: '#1339', evidence: ['goal:G7', 'score:6'] },
  ]);
  const v = G.checkGoalFailureEvents([{ goal: 'G7', score: 6 }], '#1339', file);
  expect(v).toEqual([]);
  fs.unlinkSync(file);
});

test('checkGoalFailureEvents: sub-7 without matching event → violation', () => {
  const file = makeIncidentsFile([]);
  const v = G.checkGoalFailureEvents([{ goal: 'G7', score: 6 }], '#1339', file);
  expect(v.length).toBe(1);
  expect(v[0].rule).toBe('missing-goal-failure-event');
  expect(v[0].goal).toBe('G7');
  fs.unlinkSync(file);
});

test('checkGoalFailureEvents: above-threshold goals skipped', () => {
  const v = G.checkGoalFailureEvents([{ goal: 'G1', score: 9 }, { goal: 'G2', score: 7 }], '#1', '/nonexistent.jsonl');
  expect(v).toEqual([]);
});

test('checkGoalFailureEvents: handles missing incidents file gracefully', () => {
  const v = G.checkGoalFailureEvents([{ goal: 'G7', score: 6 }], '#1339', '/nonexistent.jsonl');
  expect(v.length).toBe(1);
});

test('enforceTier3Emission: synthetic G7=6 closeout WITHOUT event → fails', () => {
  const body = '**CONSULTANT_CLOSEOUT — Yara Vale**\nG7=6, G8=8\nverdict: approve\nverification timestamp: 2026-05-12';
  const file = makeIncidentsFile([]);
  const r = G.enforceTier3Emission(body, '#999', file);
  expect(r.ok).toBe(false);
  expect(r.violations[0].rule).toBe('missing-goal-failure-event');
  fs.unlinkSync(file);
});

test('enforceTier3Emission: synthetic G7=6 closeout WITH event → passes', () => {
  const body = 'G7=6, G8=8';
  const file = makeIncidentsFile([
    { tier: 3, trigger_role: 'consultant', ticket_ref: '#999', evidence: ['goal:G7'] },
  ]);
  const r = G.enforceTier3Emission(body, '#999', file);
  expect(r.ok).toBe(true);
  fs.unlinkSync(file);
});

test('consultant-closeout integration: ticketRef triggers Tier-3 check', () => {
  const body = '**CONSULTANT_CLOSEOUT — Yara Vale**\nG7=6, G8=9\nverdict: approve\nverification timestamp: 2026-05-12\nSigned-by: Yara Vale · Team&Model: claude-code:opus-4-7@anthropic · Role: consultant';
  const file = makeIncidentsFile([]);
  const r = Cons.validate({ comments: [{ body }], ticketRef: '#777', incidentsPath: file });
  expect(r.ok).toBe(false);
  expect(r.violations.some(v => v.rule === 'missing-goal-failure-event')).toBe(true);
  fs.unlinkSync(file);
});

test('consultant-closeout integration: no ticketRef → skips Tier-3 check (backward-compat)', () => {
  const body = '**CONSULTANT_CLOSEOUT — Yara Vale**\nG7=6\nverdict: approve\nverification timestamp: 2026-05-12\nSigned-by: Yara Vale · Team&Model: claude-code:opus-4-7@anthropic · Role: consultant';
  const r = Cons.validate({ comments: [{ body }] });
  expect(r.violations.some(v => v.rule === 'missing-goal-failure-event')).toBe(false);
});
