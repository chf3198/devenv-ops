'use strict';
// manager-handoff — validates MANAGER_HANDOFF schema + crypto signature fields.

const sig = require('../governance-artifact-signature');
const REQUIRED_FIELDS = ['scope', 'lane', 'test_strategy', 'acceptance', 'gates'];

function findManagerHandoff(comments) {
  const headerRe = /(^|\n)\s*(?:\*\*|##\s+)?MANAGER_HANDOFF\b/;
  return [...(comments || [])].reverse().find(c => headerRe.test(c.body || ''));
}
function extractField(body, field) {
  const m = body.match(new RegExp(`(?:^|\\n)[-*]?\\s*${field}\\s*:\\s*([^\\n]+)`, 'i'));
  return m ? m[1].trim() : null;
}
function checkRequiredFields(body) {
  const violations = [];
  for (const field of REQUIRED_FIELDS) {
    if (!extractField(body, field)) {
      violations.push({ rule: `missing-${field}`,
        detail: `MANAGER_HANDOFF missing required field '${field}:' per role-baton-routing schema` });
    }
  }
  if (!/Signed-by:/i.test(body)) violations.push({ rule: 'missing-signer', detail: 'MANAGER_HANDOFF missing Signed-by field' });
  if (!/Team&Model:/i.test(body)) violations.push({ rule: 'missing-team-model', detail: 'MANAGER_HANDOFF missing Team&Model field' });
  if (!/Role:\s*manager/i.test(body)) violations.push({ rule: 'missing-role-manager', detail: 'MANAGER_HANDOFF missing Role: manager field' });
  return violations;
}
function checkLaneConsistency(body, expectedLane) {
  if (!expectedLane) return [];
  const declared = extractField(body, 'lane');
  return declared && declared !== expectedLane && !declared.includes(expectedLane)
    ? [{ rule: 'lane-mismatch', detail: `MANAGER_HANDOFF lane='${declared}' but issue has label='${expectedLane}'` }]
    : [];
}
function checkCrypto(body) {
  if (!/Crypto-Algorithm:/i.test(body)) return [];
  const result = sig.verifyArtifact(body, 'manager');
  return result.ok ? [] : result.violations.map(violation => ({
    rule: 'crypto-signature-invalid',
    detail: `MANAGER_HANDOFF ${violation}`,
  }));
}

function validate(input) {
  const handoff = findManagerHandoff(input.comments || []);
  if (!handoff) {
    const violations = input.isEpic ? [{ rule: 'epic-manager-handoff-missing', detail: 'Epic must have a MANAGER_HANDOFF comment defining scope' }] : [];
    return { ok: violations.length === 0, violations, found: false };
  }
  const violations = [...checkRequiredFields(handoff.body), ...checkLaneConsistency(handoff.body, input.lane), ...checkCrypto(handoff.body)];
  return { ok: violations.length === 0, violations, found: true };
}

module.exports = { validate, findManagerHandoff, extractField, REQUIRED_FIELDS };
