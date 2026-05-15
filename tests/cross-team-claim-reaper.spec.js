// Unit tests for scripts/global/cross-team-claim-reaper.js (#1589 AC2 of #1334).
// Validates the pure decision helper for daily-cron claim expiry detection.
const { test, expect } = require('@playwright/test');
const path = require('path');
const R = require(path.resolve(__dirname, '..', 'scripts', 'global', 'cross-team-claim-reaper.js'));

const REGISTRY = {
  substrateTeamMap: {
    'github-copilot': 'copilot',
    'codex-cli': 'codex',
    'claude-code-cli': 'claude-code',
  },
};

const NOW = Date.UTC(2026, 4, 15, 12, 0, 0); // 2026-05-15T12:00:00Z

test('isClaimExpired: expires in the past returns true', () => {
  const claim = { expires: '2026-05-14T12:00:00Z', substrate: 'codex-cli', alias: 'Quill Vale' };
  expect(R.isClaimExpired(claim, NOW)).toBe(true);
});

test('isClaimExpired: expires in the future returns false', () => {
  const claim = { expires: '2026-05-16T12:00:00Z', substrate: 'codex-cli', alias: 'Quill Vale' };
  expect(R.isClaimExpired(claim, NOW)).toBe(false);
});

test('isClaimExpired: malformed expires returns null (unknown)', () => {
  expect(R.isClaimExpired({ expires: 'not-a-date' }, NOW)).toBeNull();
  expect(R.isClaimExpired({ expires: '' }, NOW)).toBeNull();
  expect(R.isClaimExpired({}, NOW)).toBeNull();
  expect(R.isClaimExpired(null, NOW)).toBeNull();
});

test('isClaimExpired: exactly-at-expiry returns false (not yet past)', () => {
  const claim = { expires: '2026-05-15T12:00:00Z' };
  expect(R.isClaimExpired(claim, NOW)).toBe(false);
});

test('findExpiredClaims: returns only Epics whose active claim is expired', () => {
  const epics = [
    {
      issueNumber: 100,
      comments: [{ body: 'CROSS_TEAM_CLAIM: substrate=codex-cli, alias=Quill Vale, expires=2026-05-14T00:00:00Z' }],
    },
    {
      issueNumber: 200,
      comments: [{ body: 'CROSS_TEAM_CLAIM: substrate=github-copilot, alias=Soren Vale, expires=2026-05-20T00:00:00Z' }],
    },
    {
      issueNumber: 300,
      comments: [
        { body: 'CROSS_TEAM_CLAIM: substrate=codex-cli, alias=Quill Vale, expires=2026-05-13T00:00:00Z' },
        { body: 'CROSS_TEAM_CLAIM_YIELD: substrate=codex-cli, deferred-to=github-copilot' },
      ],
    },
    { issueNumber: 400, comments: [] },
  ];
  const expired = R.findExpiredClaims(epics, REGISTRY, NOW);
  expect(expired).toHaveLength(1);
  expect(expired[0].issueNumber).toBe(100);
  expect(expired[0].claim.substrate).toBe('codex-cli');
  expect(expired[0].reason).toContain('2026-05-14');
});

test('findExpiredClaims tolerates empty or null input', () => {
  expect(R.findExpiredClaims([], REGISTRY, NOW)).toEqual([]);
  expect(R.findExpiredClaims(null, REGISTRY, NOW)).toEqual([]);
});

test('findExpiredClaims skips Epics whose latest claim is followed by _EXPIRED marker (already reaped)', () => {
  const epics = [{
    issueNumber: 500,
    comments: [
      { body: 'CROSS_TEAM_CLAIM: substrate=codex-cli, alias=Quill Vale, expires=2026-05-10T00:00:00Z' },
      { body: 'CROSS_TEAM_CLAIM_EXPIRED: expired-at=2026-05-11T00:00:00Z' },
    ],
  }];
  expect(R.findExpiredClaims(epics, REGISTRY, NOW)).toEqual([]);
});

test('buildExpiredComment renders the canonical CROSS_TEAM_CLAIM_EXPIRED block', () => {
  const claim = { substrate: 'codex-cli', alias: 'Quill Vale', expires: '2026-05-14T00:00:00Z' };
  const block = R.buildExpiredComment(claim, '2026-05-15T12:00:00Z');
  expect(block).toContain('CROSS_TEAM_CLAIM_EXPIRED');
  expect(block).toContain('expired-at=2026-05-15T12:00:00Z');
  expect(block).toContain('original-substrate=codex-cli');
  expect(block).toContain('original-alias=Quill Vale');
  expect(block).toContain('consultant:cross-team-in-progress');
  expect(block).toContain('consultant:cross-team-needed');
  expect(block).toContain('#1589');
});

test('buildExpiredComment handles missing claim fields gracefully', () => {
  const block = R.buildExpiredComment({}, '2026-05-15T12:00:00Z');
  expect(block).toContain('original-substrate=unknown');
  expect(block).toContain('original-alias=unknown');
  expect(block).toContain('original-expires=unknown');
});

test('end-to-end: 3 Epics in, 1 expired out, comment renders correctly', () => {
  const epics = [
    { issueNumber: 700, comments: [{ body: 'no claim here' }] },
    {
      issueNumber: 701,
      comments: [{ body: 'CROSS_TEAM_CLAIM: substrate=codex-cli, alias=Quill Vale, expires=2026-05-13T00:00:00Z' }],
    },
    {
      issueNumber: 702,
      comments: [{ body: 'CROSS_TEAM_CLAIM: substrate=github-copilot, alias=Soren Vale, expires=2026-05-20T00:00:00Z' }],
    },
  ];
  const expired = R.findExpiredClaims(epics, REGISTRY, NOW);
  expect(expired).toHaveLength(1);
  expect(expired[0].issueNumber).toBe(701);
  const block = R.buildExpiredComment(expired[0].claim, new Date(NOW).toISOString());
  expect(block).toContain('original-substrate=codex-cli');
  expect(block).toContain('expired-at=2026-05-15T12:00:00.000Z');
});
