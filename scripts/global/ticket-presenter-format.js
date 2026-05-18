'use strict';
// ticket-presenter-format (#1905) — markdown formatter for ticket-presenter
// output. Extracted from ticket-presenter.js to keep file under 100 lines.

function row(parts) { return `| ${parts.join(' | ')} |`; }

function detectObservations(items, parentMap, util) {
  const { labelsOf } = util;
  const observations = [];
  for (const i of items) {
    const L = labelsOf(i);
    const statusLabels = L.filter(x => x.startsWith('status:'));
    if (statusLabels.length > 1) observations.push(`#${i.number}: multi-status (${statusLabels.join(', ')})`);
    if (statusLabels.length === 0) observations.push(`#${i.number}: no-status label`);
    const m = (i.body || '').match(/Refs\s+Epic\s+#(\d+)/i);
    if (m && parentMap[Number(m[1])] === 'CLOSED' && !i.parent) {
      observations.push(`#${i.number}: orphan-child (Refs Epic #${m[1]} CLOSED, no native sub-issue link)`);
    }
    const terminal = ['status:done', 'status:cancelled'];
    const role = L.find(x => x.startsWith('role:'));
    if (role && terminal.some(s => L.includes(s))) {
      observations.push(`#${i.number}: ${role} on terminal status`);
    }
  }
  return observations;
}

function epicsTable(epics, util) {
  if (epics.length === 0) return '_no open epics_\n';
  const { labelsOf, priOf, statusOf } = util;
  const lines = ['| # | Pri | Status | Title |', '|---|---|---|---|'];
  for (const e of epics) {
    const L = labelsOf(e);
    lines.push(row([`#${e.number}`, priOf(L).split(':')[1], statusOf(L), e.title.slice(0, 80)]));
  }
  return lines.join('\n') + '\n';
}

function indepsTable(indeps, prilvl, util) {
  const { labelsOf, priOf, statusOf, typeOf } = util;
  const group = indeps.filter(t => priOf(labelsOf(t)).endsWith(prilvl));
  if (group.length === 0) return `_no open P${prilvl.slice(1)} independents_\n`;
  const lines = ['| # | Status | Type | Title |', '|---|---|---|---|'];
  for (const t of group) {
    const L = labelsOf(t);
    lines.push(row([`#${t.number}`, statusOf(L), typeOf(L), t.title.slice(0, 70)]));
  }
  return lines.join('\n') + '\n';
}

function formatMarkdown(result, util) {
  const out = [];
  out.push(`# Open Tickets Landscape`);
  out.push(``);
  out.push(`**Total open**: ${result.totalOpen} (${result.epics.length} Epics + ${result.indeps.length} independents)`);
  out.push(``);
  out.push(`## Open Epics (${result.epics.length})`);
  out.push(``);
  out.push(epicsTable(result.epics, util));
  for (const lvl of ['P1', 'P2', 'P3']) {
    const group = result.indeps.filter(t => util.priOf(util.labelsOf(t)).endsWith(lvl));
    out.push(`## Open Independent Tickets — ${lvl} (${group.length})`);
    out.push(``);
    out.push(indepsTable(result.indeps, lvl, util));
  }
  const all = [...result.epics, ...result.indeps];
  const observations = detectObservations(all, result.parentMap || {}, util);
  if (observations.length > 0) {
    out.push(`## Observations (${observations.length})`);
    out.push(``);
    for (const obs of observations) out.push(`- ${obs}`);
    out.push(``);
  }
  return out.join('\n');
}

module.exports = { formatMarkdown, epicsTable, indepsTable, detectObservations, row };
