#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execFileSync } = require('node:child_process');
const { classifyTier1 } = require('./anneal-severity-classifier');
const { stepGate, patternRateGate, singleFlightGate, releaseSingleFlight } = require('./anneal-kill-switch');
const { emitEvent, readEvents } = require('./anneal-event-schema');

const INCIDENTS = path.join(os.homedir(), '.megingjord', 'incidents.jsonl');
const SUPPRESS_FILE = path.join(os.homedir(), '.megingjord', 'suppression-registry.json');
const TWO = Number('2');

function isSuppressed(patternId, nowIso) {
  if (!fs.existsSync(SUPPRESS_FILE)) return false;
  const rows = JSON.parse(fs.readFileSync(SUPPRESS_FILE, 'utf8')) || [];
  const nowMs = Date.parse(nowIso);
  return rows.some((item) => item.pattern_id === patternId && Date.parse(item.suppression_until || '') > nowMs);
}

function buildCandidates(events) {
  return classifyTier1(events)
    .filter((item) => ['medium', 'high', 'critical'].includes(item.severity))
    .filter((item) => item.count >= Number('2') || item.trigger_type === 'goal-failure');
}

function emitKillSwitch(reason, patternId, sessionId, timestamp) {
  emitEvent({
    version: TWO, timestamp, tier: TWO, trigger_role: 'system', trigger_type: 'sensor-driven',
    pattern_id: `kill-switch-${reason}-${patternId || 'na'}`, severity: 'medium', evidence: [reason],
    ticket_ref: null, epic_ref: '#1308', session_id: sessionId,
    schema_compat: 'v1-readers-must-ignore-fields-not-in-v1',
  }, INCIDENTS);
}

function maybeCreateTicket(candidate, applyFlag) {
  const body = `MANAGER_HANDOFF\nanneal_tier: tier-2\npattern_id: ${candidate.pattern_id}\nseverity: ${candidate.severity}\ncount_7d: ${candidate.count}`;
  if (!applyFlag) return 'DRY-RUN';
  const args = ['issue', 'create', '--title', `Anneal Tier-2: ${candidate.pattern_id}`,
    '--label', 'type:task', '--label', 'priority:P1', '--label', 'area:scripts',
    '--label', 'lane:code-change', '--body', body];
  return execFileSync('gh', args, { encoding: 'utf8' }).trim();
}

function run(argv) {
  const applyFlag = argv.includes('--apply');
  const fixturePath = argv.includes('--fixture') ? argv[argv.indexOf('--fixture') + Number('1')] : '';
  const nowIso = new Date().toISOString();
  const sessionId = process.env.GITHUB_RUN_ID || `local-${nowIso}`;
  const sourceEvents = fixturePath ? JSON.parse(fs.readFileSync(fixturePath, 'utf8')).events : readEvents(INCIDENTS);
  const tier1 = sourceEvents.filter((item) => item.tier === Number('1'));
  const tier2 = sourceEvents.filter((item) => item.tier === TWO);
  const flight = singleFlightGate(sessionId); if (!flight.ok) return emitKillSwitch(flight.reason, '', sessionId, nowIso);
  const candidates = buildCandidates(tier1).filter((item) => !isSuppressed(item.pattern_id, nowIso));
  const out = [];
  try {
    for (const candidate of candidates) {
      if (!stepGate(out.length + Number('1')).ok) { emitKillSwitch('step-counter', candidate.pattern_id, sessionId, nowIso); break; }
      const gate = patternRateGate(tier2, candidate.pattern_id, Date.parse(nowIso));
      if (!gate.ok) { emitKillSwitch(gate.reason, candidate.pattern_id, sessionId, nowIso); continue; }
      const ticketRef = maybeCreateTicket(candidate, applyFlag);
      emitEvent({ version: TWO, timestamp: nowIso, tier: TWO, trigger_role: 'system', trigger_type: 'sensor-driven',
        pattern_id: candidate.pattern_id, severity: candidate.severity, evidence: [`count=${candidate.count}`],
        ticket_ref: ticketRef, epic_ref: '#1308', session_id: sessionId,
        schema_compat: 'v1-readers-must-ignore-fields-not-in-v1' }, INCIDENTS);
      out.push({ pattern_id: candidate.pattern_id, severity: candidate.severity, ticket_ref: ticketRef });
    }
  } finally {
    releaseSingleFlight();
  }
  process.stdout.write(JSON.stringify({ created: out.length, records: out }, null, TWO) + '\n');
}

if (require.main === module) run(process.argv.slice(TWO));
module.exports = { buildCandidates, isSuppressed, run };
