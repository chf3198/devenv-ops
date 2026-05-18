#!/usr/bin/env node
'use strict';
// ticket-presenter (#1905) — single-command Epic + independent ticket listing.
// Reduces ~40-60k tokens/invocation to ~5k by handling all filtering + parent-
// state lookups + sort + format internally. Per Epic #1792 G3 Zero-Cost.

const { execFileSync } = require('node:child_process');
const fmt = require('./ticket-presenter-format.js');

const PRI = { 'priority:P0': 0, 'priority:P1': 1, 'priority:P2': 2, 'priority:P3': 3 };
const ST = { 'status:in-progress': 0, 'status:testing': 1, 'status:review': 2,
  'status:triage': 3, 'status:ready': 4, 'status:queued': 5, 'status:backlog': 6,
  'status:todo': 6, 'status:dormant': 7, 'status:deferred': 8 };

function gh(args) {
  try { return execFileSync('gh', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); }
  catch (err) { return err.stdout?.toString('utf8') || ''; }
}

function fetchIssues(limit) {
  const query = `query { repository(owner: "chf3198", name: "megingjord-harness") {
    issues(states: OPEN, first: ${limit}, orderBy: {field: CREATED_AT, direction: DESC}) {
      totalCount nodes { number title body labels(first: 30) { nodes { name } } parent { number } } } } }`;
  try { return JSON.parse(gh(['api', 'graphql', '-f', `query=${query}`])).data.repository.issues.nodes; }
  catch { return []; }
}

function parentStates(items) {
  const refs = new Set();
  for (const i of items) {
    const m = (i.body || '').match(/Refs\s+Epic\s+#(\d+)/i);
    if (m) refs.add(Number(m[1]));
  }
  const out = {};
  for (const num of refs) {
    try { out[num] = JSON.parse(gh(['issue', 'view', String(num), '--json', 'state'])).state; }
    catch { out[num] = '?'; }
  }
  return out;
}

function isChild(item, parentMap) {
  if (item.parent) return true;
  const m = (item.body || '').match(/Refs\s+Epic\s+#(\d+)/i);
  return Boolean(m && parentMap[Number(m[1])] === 'OPEN');
}

const labelsOf = i => i.labels.nodes.map(l => l.name);
const priOf = L => { for (const x of L) if (x in PRI) return x; return 'priority:P3'; };
const statusOf = L => { for (const x of L) if (x.startsWith('status:')) return x.slice(7); return '?'; };
const typeOf = L => { for (const x of L) if (x.startsWith('type:')) return x.slice(5); return '?'; };
const sortKey = i => { const L = labelsOf(i); return [PRI[priOf(L)] ?? 3, ST['status:' + statusOf(L)] ?? 99, i.number]; };

function partition(items, parentMap) {
  const epics = [], indeps = [];
  for (const i of items) {
    if (isChild(i, parentMap)) continue;
    if (labelsOf(i).includes('type:epic')) epics.push(i); else indeps.push(i);
  }
  const cmp = (a, b) => { const A = sortKey(a), B = sortKey(b); for (let n = 0; n < 3; n++) if (A[n] !== B[n]) return A[n] - B[n]; return 0; };
  epics.sort(cmp); indeps.sort(cmp);
  return { epics, indeps };
}

function buildReport(opts = {}) {
  const items = opts.items || fetchIssues(opts.limit || 200);
  const parentMap = opts.parentMap || parentStates(items);
  const { epics, indeps } = partition(items, parentMap);
  const filter = opts.filter || 'all';
  const result = { totalOpen: epics.length + indeps.length, epics, indeps, parentMap };
  if (filter === 'epics-only') result.indeps = [];
  else if (filter === 'independents-only') result.epics = [];
  return result;
}

if (require.main === module) {
  const argv = process.argv.slice(2);
  const get = (name) => { const i = argv.indexOf(`--${name}`); return i > -1 ? argv[i + 1] : null; };
  const result = buildReport({ limit: Number(get('limit')) || 200, filter: get('filter') || 'all' });
  if (argv.includes('--json')) process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  else process.stdout.write(fmt.formatMarkdown(result, { labelsOf, priOf, statusOf, typeOf }) + '\n');
}

module.exports = { fetchIssues, parentStates, isChild, partition, buildReport,
  labelsOf, priOf, statusOf, typeOf, sortKey, PRI, ST };
