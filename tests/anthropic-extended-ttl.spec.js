// Anthropic extendedTtl opt-in tests (#1000).
const { test, expect } = require('@playwright/test');
const path = require('path');

const LLM = require(path.resolve(__dirname, '..', 'scripts', 'global', 'litellm-client.js'));

test('cacheHeaders default emits 5min TTL + base beta (no extended)', () => {
  const r = LLM.cacheHeaders('anthropic');
  expect(r.headers['anthropic-beta']).toBe('prompt-caching-2024-07-31');
  expect(r.headers['anthropic-beta']).not.toContain('extended-cache-ttl');
  expect(r.bodyExtras.extra_headers['cache-control']).toBe('max-age=300');
});

test('cacheHeaders with extendedTtl:true emits 1h TTL + extended beta', () => {
  const r = LLM.cacheHeaders('anthropic', { extendedTtl: true });
  expect(r.headers['anthropic-beta']).toContain('extended-cache-ttl-2025-04-11');
  expect(r.bodyExtras.extra_headers['cache-control']).toBe('max-age=3600');
});

test('explicit ttlSeconds overrides both default and extended', () => {
  const r = LLM.cacheHeaders('anthropic', { ttlSeconds: 1800 });
  expect(r.bodyExtras.extra_headers['cache-control']).toBe('max-age=1800');
  expect(r.headers['anthropic-beta']).toBe('prompt-caching-2024-07-31');
});

test('non-anthropic providers also honor extendedTtl flag (universal TTL hint)', () => {
  // extendedTtl is a universal TTL hint, not anthropic-specific. Other providers
  // (groq/cerebras/openai) also use longer cache windows when requested.
  const r = LLM.cacheHeaders('groq', { extendedTtl: true });
  expect(r.headers['x-cache-control']).toBe('max-age=3600');
  // But default stays at 5min when not requested.
  const def = LLM.cacheHeaders('groq');
  expect(def.headers['x-cache-control']).toBe('max-age=300');
});
