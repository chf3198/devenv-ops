// Broker MVP tests (Epic #1083).
const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Use a tmp DB for tests
const TMP_DB = path.join(os.tmpdir(), `broker-test-${Date.now()}.json`);
process.env.HOME = path.dirname(TMP_DB);
fs.mkdirSync(path.join(path.dirname(TMP_DB), '.megingjord'), { recursive: true });

const B = require(path.resolve(__dirname, '..', 'scripts', 'global', 'broker.js'));
const VQ = require(path.resolve(__dirname, '..', 'scripts', 'global', 'visual-qa-classify.js'));

test.beforeEach(() => {
  // Reset DB before each test
  if (fs.existsSync(B.DB_FILE)) fs.unlinkSync(B.DB_FILE);
});

test('broker.acquire returns lease with required fields', () => {
  const r = B.acquire({ ticket: 999, agent: 'claude-code', files: ['scripts/wiki/**'] });
  expect(r.ok).toBe(true);
  expect(r.lease.ticket_id).toBe(999);
  expect(r.lease.agent).toBe('claude-code');
  expect(r.lease.status).toBe('active');
  expect(r.lease.lease_id.length).toBe(16);
  expect(r.lease.branch).toMatch(/^feat\/999-/);
});

test('broker.acquire blocks second acquire for same ticket', () => {
  const first = B.acquire({ ticket: 999, agent: 'claude-code' });
  expect(first.ok).toBe(true);
  const second = B.acquire({ ticket: 999, agent: 'copilot', session_id: 'different-session' });
  expect(second.ok).toBe(false);
  expect(second.reason).toBe('lease-held');
});

test('broker.heartbeat refreshes last_heartbeat', async () => {
  const r = B.acquire({ ticket: 999 });
  const original = r.lease.last_heartbeat;
  await new Promise(resolve => setTimeout(resolve, 50));
  const hb = B.heartbeat(r.lease.lease_id);
  expect(hb.ok).toBe(true);
  expect(hb.lease.last_heartbeat).not.toBe(original);
});

test('broker.release marks lease released', () => {
  const r = B.acquire({ ticket: 999 });
  const rel = B.release(r.lease.lease_id);
  expect(rel.ok).toBe(true);
  expect(rel.lease.status).toBe('released');
});

test('broker.status filters by ticket + activeOnly', () => {
  B.acquire({ ticket: 999 });
  B.acquire({ ticket: 1000 });
  expect(B.status({ ticket: 999 }).length).toBe(1);
  expect(B.status({ activeOnly: true }).length).toBe(2);
});

test('broker.isExpired detects expired lease', () => {
  const lease = { acquired_at: '2020-01-01T00:00:00Z', last_heartbeat: '2020-01-01T00:00:00Z', ttl_ms: 1000 };
  expect(B.isExpired(lease)).toBe(true);
});

test('broker.reconcile marks stale leases', () => {
  const r = B.acquire({ ticket: 999, ttl_ms: 1 });
  // Force expiry by manipulating mtime
  const db = B.loadDb();
  db.leases[0].last_heartbeat = '2020-01-01T00:00:00Z';
  B.saveDb(db);
  const recon = B.reconcile();
  expect(recon.expired).toBe(1);
});

test('visual-qa classify detects UI patterns', () => {
  const v = VQ.classify(['dashboard/index.html', 'dashboard/css/views.css']);
  expect(v.needed).toBe(true);
  expect(v.ui_files.length).toBe(2);
});

test('visual-qa classify auto-records N/A for safe non-UI', () => {
  const v = VQ.classify(['scripts/wiki/retrieval.js', 'tests/foo.spec.js', 'instructions/x.md']);
  expect(v.needed).toBe(false);
  expect(v.auto_record).toBe('N/A');
});

test('visual-qa classify returns maybe for unclassified', () => {
  const v = VQ.classify(['some/random/file.js']);
  expect(v.needed).toBe('maybe');
});

test('visual-qa isUiPath + isSafeNonUi exclusive on UI files', () => {
  expect(VQ.isUiPath('dashboard/css/views.css')).toBe(true);
  expect(VQ.isSafeNonUi('dashboard/css/views.css')).toBe(false);
});
