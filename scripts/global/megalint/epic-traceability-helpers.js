'use strict';
// epic-traceability-helpers — workflow-side helpers consumed by epic-traceability-lint.yml.
// Split out so the YAML can stay under 100 lines and the resolution logic is unit-testable.

async function resolveEpic({ github, owner, repo, issueNum, labels, body }) {
  if (labels.includes('type:epic')) {
    const epicData = (await github.rest.issues.get({
      owner, repo, issue_number: issueNum,
    })).data;
    return { number: issueNum, body: epicData.body, labels: epicData.labels };
  }
  const parentMatch = (body || '').match(/(?:Epic:|Parent:|parent Epic:?)\s*#(\d+)/i);
  if (!parentMatch) return null;
  const epicNum = parseInt(parentMatch[1], 10);
  try {
    const epicData = (await github.rest.issues.get({
      owner, repo, issue_number: epicNum,
    })).data;
    const epicLabels = epicData.labels.map(l => l.name);
    if (!epicLabels.includes('type:epic')) return null;
    return { number: epicNum, body: epicData.body, labels: epicData.labels };
  } catch {
    return null;
  }
}

function formatComment(marker, epicNumber, violations) {
  const violationsList = violations
    .map(v => `- \`${v.rule}\` — ${v.detail}`)
    .join('\n');
  return [
    marker, '',
    '## ⚠️ Epic AC Traceability Violation', '',
    `Epic #${epicNumber} body has ACs declared but is missing child-ticket references.`,
    '',
    '**Violations**:', '',
    violationsList,
    '',
    '**Suggested fix**: append a "Child tickets" section listing the #N child references',
    'per AC, or document explicit deferral. See `instructions/epic-governance.instructions.md`.',
    '',
    '_Posted by epic-traceability-lint (advisory)._',
  ].join('\n');
}

module.exports = { resolveEpic, formatComment };
