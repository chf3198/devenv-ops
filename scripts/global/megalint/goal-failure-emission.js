'use strict';
// goal-failure-emission — extracts G1-9 scores from CONSULTANT_CLOSEOUT and
// verifies a corresponding `event:goal-failure-escalation` exists in
// `~/.megingjord/incidents.jsonl` for each sub-threshold goal. Epic #1308 Tier-3
// enforcement (#1376). Linkage rule: event.ticket_ref === #N AND
// event.evidence contains "goal:G<n>" AND event.tier === 3 AND
// event.trigger_role === 'consultant'.

const fs = require('fs');
const os = require('os');
const path = require('path');

const THRESHOLD = 7;
const DEFAULT_INCIDENTS = path.join(os.homedir(), '.megingjord', 'incidents.jsonl');

function extractGoalScores(body) {
  const scores = [];
  const text = body || '';
  // Match G1-G9 followed by =/:, then a numeric score. Tolerate trailing /10 or em-dash.
  const regex = /\bG([1-9])\s*[=:]\s*(\d+(?:\.\d+)?)\s*(?:\/\s*10)?\s*(?=[\s,;|·.—-]|$)/g;
  const seen = new Set();
  let match;
  while ((match = regex.exec(text)) !== null) {
    const goal = `G${match[1]}`;
    if (seen.has(goal)) continue;
    seen.add(goal);
    const score = parseFloat(match[2]);
    if (Number.isFinite(score) && score >= 0 && score <= 10) {
      scores.push({ goal, score });
    }
  }
  return scores;
}

function loadIncidents(incidentsPath) {
  const filePath = incidentsPath || DEFAULT_INCIDENTS;
  if (!fs.existsSync(filePath)) return [];
  return fs.readFileSync(filePath, 'utf-8').split('\n')
    .filter(line => line.trim().length > 0)
    .map(line => { try { return JSON.parse(line); } catch { return null; } })
    .filter(event => event !== null);
}

function eventMatchesGoal(event, ticketRef, goalId) {
  if (!event || event.tier !== 3) return false;
  if (event.trigger_role !== 'consultant') return false;
  if (event.ticket_ref !== ticketRef) return false;
  const evidence = event.evidence || [];
  return evidence.some(line => typeof line === 'string' && line.includes(`goal:${goalId}`));
}

function checkGoalFailureEvents(scores, ticketRef, incidentsPath) {
  const events = loadIncidents(incidentsPath);
  const violations = [];
  for (const { goal, score } of scores) {
    if (score >= THRESHOLD) continue;
    const matched = events.some(event => eventMatchesGoal(event, ticketRef, goal));
    if (!matched) {
      violations.push({
        rule: 'missing-goal-failure-event',
        detail: `${goal}=${score} (sub-threshold) requires event:goal-failure-escalation with tier=3, trigger_role=consultant, ticket_ref="${ticketRef}", evidence containing "goal:${goal}". No such event found in incidents.jsonl.`,
        goal, score,
      });
    }
  }
  return violations;
}

function enforceTier3Emission(body, ticketRef, incidentsPath) {
  const scores = extractGoalScores(body);
  const violations = checkGoalFailureEvents(scores, ticketRef, incidentsPath);
  return { ok: violations.length === 0, violations, scores };
}

module.exports = {
  extractGoalScores,
  loadIncidents,
  eventMatchesGoal,
  checkGoalFailureEvents,
  enforceTier3Emission,
  THRESHOLD,
  DEFAULT_INCIDENTS,
};
