const { test, expect } = require('@playwright/test');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const L = require('../scripts/global/cross-team-lease-registry');

function baseInput(overrides = {}) {
  return {
    ticket: 1618,
    team: 'codex',
    role: 'collaborator',
    branch: 'feat/1618-claim-lease-registry',
    worktree: '/tmp/devenv-ops-codex-1618',
    paths: 'scripts/global,tests',
    ports: '8090,8787',
    runtime_surfaces: 'codex,github',
    ...overrides,
  };
}

test('createLease stores the required cross-team fields', () => {
  const registry = { version: 1, leases: [] };
  const lease = L.createLease(registry, baseInput());
  expect(lease.ticket).toBe(1618);
  expect(lease.team).toBe('codex');
  expect(lease.role).toBe('collaborator');
  expect(lease.paths).toEqual(['scripts/global', 'tests']);
  expect(lease.ports).toEqual([8090, 8787]);
  expect(lease.runtime_surfaces).toEqual(['codex', 'github']);
  expect(lease.status).toBe('active');
  expect(registry.leases).toHaveLength(1);
});

test('createLease rejects duplicate active ticket claims', () => {
  const registry = { version: 1, leases: [] };
  L.createLease(registry, baseInput());
  expect(() => L.createLease(registry, baseInput({ branch: 'feat/999-other' })))
    .toThrow(/active lease collision/);
});

test('createLease rejects duplicate active branches', () => {
  const registry = { version: 1, leases: [] };
  L.createLease(registry, baseInput());
  expect(() => L.createLease(registry, baseInput({ ticket: 999 })))
    .toThrow(/active lease collision/);
});

test('refreshLease updates heartbeat and expiration', () => {
  const registry = { version: 1, leases: [] };
  const lease = L.createLease(registry, baseInput({ ttl_hours: 1 }));
  const before = lease.expires_at;
  const refreshed = L.refreshLease(registry, 1618, 48);
  expect(refreshed.expires_at > before).toBe(true);
  expect(refreshed.status).toBe('active');
});

test('expireLeases marks stale active leases expired', () => {
  const registry = { version: 1, leases: [] };
  const lease = L.createLease(registry, baseInput());
  lease.expires_at = '2026-01-01T00:00:00.000Z';
  const expired = L.expireLeases(registry, '2026-01-02T00:00:00.000Z');
  expect(expired).toHaveLength(1);
  expect(lease.status).toBe('expired');
});

test('closeLease marks an active lease closed', () => {
  const registry = { version: 1, leases: [] };
  L.createLease(registry, baseInput());
  const closed = L.closeLease(registry, 1618);
  expect(closed.status).toBe('closed');
  expect(L.active(registry)).toEqual([]);
});

test('read returns empty registry when file is absent and write persists JSON', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lease-test-'));
  const file = path.join(dir, 'leases.json');
  expect(L.read(file)).toEqual({ version: 1, leases: [] });
  const registry = { version: 1, leases: [] };
  L.createLease(registry, baseInput());
  L.write(registry, file);
  expect(L.read(file).leases[0].ticket).toBe(1618);
});

test('commentBlock renders stable machine-readable markers', () => {
  const registry = { version: 1, leases: [] };
  const block = L.commentBlock('create', L.createLease(registry, baseInput()));
  expect(block).toContain('<!-- cross-team-lease:create -->');
  expect(block).toContain('CROSS_TEAM_LEASE_CREATE');
  expect(block).toContain('ticket: #1618');
  expect(block).toContain('branch: feat/1618-claim-lease-registry');
});

test('CLI create and list operate on an explicit repo-local file', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lease-cli-'));
  const file = path.join(dir, 'leases.json');
  const cli = path.resolve(__dirname, '..', 'scripts', 'global', 'cross-team-lease.js');
  execFileSync('node', [cli, 'create', '--file', file, '--ticket', '1618',
    '--team', 'codex', '--role', 'collaborator',
    '--branch', 'feat/1618-claim-lease-registry', '--paths', 'scripts/global']);
  const listed = JSON.parse(execFileSync('node', [cli, 'list', '--file', file], {
    encoding: 'utf8',
  }));
  expect(listed[0].ticket).toBe(1618);
  expect(listed[0].paths).toEqual(['scripts/global']);
});
