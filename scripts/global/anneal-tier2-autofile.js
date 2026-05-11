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
function readJson(file, fallback) { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; } }
function loadSuppressions(nowIso) {
  if (!fs.existsSync(SUPPRESS_FILE)) return [];
  const nowMs = Date.parse(nowIso);
  const rows = readJson(SUPPRESS_FILE, []);
  const active = rows.filter((i) => Date.parse(i.expires_utc || i.suppression_until || '') > nowMs);
  if (active.length !== rows.length) fs.writeFileSync(SUPPRESS_FILE, JSON.stringify(active, null, TWO));
  return active;
}
function isSuppressed(patternId, suppressions) { return suppressions.some((i) => i.pattern_id === patternId); }
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
function proposalMeta(candidate, nowIso) {
  const day = nowIso.slice(0, 10);
  const dedupe_key = `anneal:${candidate.pattern_id}:${candidate.severity}`;
  return { dedupe_key, proposal_id: `${dedupe_key}:${day}` };
}
function dedupeHit(dedupeKey) {
  try {
    const out = execFileSync('gh', ['issue', 'list', '--limit', '1', '--search', `"dedupe_key: ${dedupeKey}" in:body state:open`, '--json', 'url'], { encoding: 'utf8' });
    return (JSON.parse(out) || [])[0]?.url || '';
  } catch { return ''; }
}
function buildBody(candidate, meta, nowIso) {
  const evidence = (candidate.events || []).slice(0, 5).map((e) => e.ticket_ref || e.epic_ref || e.pattern_id).filter(Boolean);
  const ev = evidence.length ? evidence.map((e) => `- ${e}`).join('\n') : '- none-collected';
  return [
    'SELF_ANNEAL_PROPOSAL', `proposal_id: ${meta.proposal_id}`, `dedupe_key: ${meta.dedupe_key}`,
    `pattern_id: ${candidate.pattern_id}`, `severity: ${candidate.severity}`, `count_7d: ${candidate.count}`,
    `threshold: >=2 in 7d`, `detected_at: ${nowIso}`, '', 'Evidence', ev, '',
    'Proposed remediation', '- run workflow-self-anneal with collected evidence',
    '- update instruction/guardrail only after review approval',
  ].join('\n');
}
function maybeCreateTicket(candidate, meta, nowIso, applyFlag) {
  const body = buildBody(candidate, meta, nowIso);
  if (!applyFlag) return 'DRY-RUN';
  const existing = dedupeHit(meta.dedupe_key); if (existing) return existing;
  const args = ['issue', 'create', '--title', `Anneal Proposal: ${candidate.pattern_id}`,
    '--label', 'type:task', '--label', 'area:governance', '--label', 'status:backlog', '--body', body];
  return execFileSync('gh', args, { encoding: 'utf8' }).trim();
}
function run(argv) {
  const applyFlag = argv.includes('--apply');
  const fixturePath = argv.includes('--fixture') ? argv[argv.indexOf('--fixture') + Number('1')] : '';
  const nowIso = new Date().toISOString();
  const suppressions = loadSuppressions(nowIso);
  const sessionId = process.env.GITHUB_RUN_ID || `local-${nowIso}`;
  const sourceEvents = fixturePath ? JSON.parse(fs.readFileSync(fixturePath, 'utf8')).events : readEvents(INCIDENTS);
  const tier1 = sourceEvents.filter((item) => item.tier === Number('1'));
  const tier2 = sourceEvents.filter((item) => item.tier === TWO);
  const flight = singleFlightGate(sessionId); if (!flight.ok) return emitKillSwitch(flight.reason, '', sessionId, nowIso);
  const candidates = buildCandidates(tier1).filter((item) => !isSuppressed(item.pattern_id, suppressions));
  const out = [];
  try {
    for (const candidate of candidates) {
      if (!stepGate(out.length + Number('1')).ok) { emitKillSwitch('step-counter', candidate.pattern_id, sessionId, nowIso); break; }
      const gate = patternRateGate(tier2, candidate.pattern_id, Date.parse(nowIso));
      if (!gate.ok) { emitKillSwitch(gate.reason, candidate.pattern_id, sessionId, nowIso); continue; }
      const meta = proposalMeta(candidate, nowIso);
      const ticketRef = maybeCreateTicket(candidate, meta, nowIso, applyFlag);
      emitEvent({ version: TWO, timestamp: nowIso, tier: TWO, trigger_role: 'system', trigger_type: 'sensor-driven',
        pattern_id: candidate.pattern_id, severity: candidate.severity, evidence: [`count=${candidate.count}`],
        ticket_ref: ticketRef, epic_ref: '#1308', proposal_id: meta.proposal_id, dedupe_key: meta.dedupe_key, session_id: sessionId,
        schema_compat: 'v1-readers-must-ignore-fields-not-in-v1' }, INCIDENTS);
      out.push({ pattern_id: candidate.pattern_id, severity: candidate.severity, proposal_id: meta.proposal_id, dedupe_key: meta.dedupe_key, ticket_ref: ticketRef });
    }
  } finally {
    releaseSingleFlight();
  }
  process.stdout.write(JSON.stringify({ created: out.length, records: out }, null, TWO) + '\n');
}
if (require.main === module) run(process.argv.slice(TWO));
module.exports = { buildCandidates, isSuppressed, proposalMeta, loadSuppressions, run };
