// log-redaction — tdd-pyramid tests (#1358, Epic #1339 C7).
const { test, expect } = require('@playwright/test');
const path = require('path');
const R = require(path.resolve(__dirname, '..', 'scripts', 'global', 'log-redaction.js'));

const ANTHROPIC = 'sk-ant-abcdefghijklmnopqrstuvwxyz123456';
const GHP = 'ghp_abcdefghijklmnopqrstuvwxyz1234567890';

test('redactString: Anthropic + GitHub + JWT redacted with named markers', () => {
  expect(R.redactString(`key=${ANTHROPIC}`).text).toContain('<ANTHROPIC_KEY_REDACTED>');
  expect(R.redactString(`token=${GHP}`).text).toContain('<GITHUB_PAT_REDACTED>');
  expect(R.redactString(`pat=github_pat_${'a'.repeat(60)}`).text).toContain('<GITHUB_PAT_REDACTED>');
  const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0In0.signature';
  expect(R.redactString(`t=${jwt}`).text).toContain('<JWT_REDACTED>');
});

test('redactString: Bearer keyword preserved; AWS key redacted', () => {
  expect(R.redactString('Authorization: Bearer abcdef1234567890abcdef1234').text)
    .toContain('Bearer <TOKEN_REDACTED>');
  expect(R.redactString('aws=AKIAIOSFODNN7EXAMPLE').text).toContain('<AWS_ACCESS_KEY_REDACTED>');
});

test('redactString: email hashed deterministically; IPv4 redacted', () => {
  const r1 = R.redactString('contact alice@example.com today');
  const r2 = R.redactString('contact alice@example.com again');
  expect(r1.text).toContain('<HASH:');
  expect(r1.text).not.toContain('alice@example.com');
  const h1 = r1.text.match(/<HASH:([^>]+)>/)[1];
  const h2 = r2.text.match(/<HASH:([^>]+)>/)[1];
  expect(h1).toBe(h2);
  expect(R.redactString('client 192.168.1.42 connected').text).toContain('<IPV4_REDACTED>');
});

test('redactString: clean text unchanged, no hits; non-string passes through', () => {
  const clean = R.redactString('Hello, world. No secrets here.');
  expect(clean.text).toBe('Hello, world. No secrets here.');
  expect(clean.hits).toHaveLength(0);
  expect(R.redactString(42).text).toBe(42);
});

test('redactEvent: recursive over nested object + arrays', () => {
  const event = {
    version: 3,
    payload: {
      headers: { Authorization: 'Bearer secrettokenvalue1234567890abc' },
      body: `contains ${ANTHROPIC}`,
    },
    items: [GHP],
  };
  const result = R.redactEvent(event);
  expect(result.event.payload.headers.Authorization).toContain('<TOKEN_REDACTED>');
  expect(result.event.payload.body).toContain('<ANTHROPIC_KEY_REDACTED>');
  expect(result.event.items[0]).toContain('<GITHUB_PAT_REDACTED>');
  expect(result.hits.length).toBeGreaterThanOrEqual(3);
});

test('redactEvent: non-secret event unchanged', () => {
  const event = { version: 3, message: 'hello', count: 5 };
  const result = R.redactEvent(event);
  expect(result.event).toEqual(event);
  expect(result.hits).toHaveLength(0);
});

test('wrapWrite: wrapped write redacts before delegating', () => {
  let captured = null;
  const wrapped = R.wrapWrite((event) => { captured = event; });
  wrapped({ secret: ANTHROPIC });
  expect(captured.secret).toContain('<ANTHROPIC_KEY_REDACTED>');
});

test('sanitizeForLLM: secrets removed before LLM consumption', () => {
  const sanitized = R.sanitizeForLLM(`Log says: key=${ANTHROPIC} used`);
  expect(sanitized).toContain('<ANTHROPIC_KEY_REDACTED>');
  expect(sanitized).not.toContain('sk-ant-abcdef');
});

test('hashShort: deterministic, 12-char output, different inputs differ', () => {
  expect(R.hashShort('foo')).toBe(R.hashShort('foo'));
  expect(R.hashShort('foo')).not.toBe(R.hashShort('bar'));
  expect(R.hashShort('foo')).toHaveLength(12);
});
