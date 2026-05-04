// HAMR substrate probes — S2 spike tests (#877)
// Covers: schema validation, fail-soft on missing env, timeout enforcement.
const { test, expect } = require('@playwright/test')
const fs = require('fs')
const os = require('os')
const path = require('path')

const PROBE = '../scripts/global/capability-probe'
const HAMR = '../scripts/global/hamr-probes'

let originalCwd, tmpDir

test.beforeEach(() => {
  originalCwd = process.cwd()
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hamr-test-'))
  fs.mkdirSync(path.join(tmpDir, 'inventory'), { recursive: true })
  fs.writeFileSync(path.join(tmpDir, 'inventory', 'devices.json'), JSON.stringify({ devices: [] }))
  process.chdir(tmpDir)
  delete require.cache[require.resolve(PROBE)]
  delete require.cache[require.resolve(HAMR)]
})

test.afterEach(() => {
  process.chdir(originalCwd)
})

// (a) Schema validation — manifest has HAMR fields at schema_version 2
test('probe manifest includes HAMR fields at schema_version 2', async () => {
  const { probe } = require(PROBE)
  const m = await probe()
  expect(m.schema_version).toBe(2)
  expect(m).toHaveProperty('r2')
  expect(m).toHaveProperty('wrangler')
  expect(m).toHaveProperty('github_oidc')
  expect(m).toHaveProperty('npm_trusted_publishing')
  expect(m.cloudflare).toHaveProperty('reachability')
  expect(m.mcp).toHaveProperty('client')
})

// (b) Fail-soft: probeR2 returns available:false when tokens absent
test('probeR2 fails soft when no token env vars', async () => {
  const saved = { tok: process.env.CLOUDFLARE_API_TOKEN, acct: process.env.CLOUDFLARE_ACCOUNT_ID }
  delete process.env.CLOUDFLARE_API_TOKEN
  delete process.env.CLOUDFLARE_ACCOUNT_ID
  delete require.cache[require.resolve(HAMR)]
  const { probeR2 } = require(HAMR)
  const r = await probeR2()
  expect(r.available).toBe(false)
  expect(r.reason).toBeTruthy()
  if (saved.tok) process.env.CLOUDFLARE_API_TOKEN = saved.tok
  if (saved.acct) process.env.CLOUDFLARE_ACCOUNT_ID = saved.acct
})

// (b) Fail-soft: probeWrangler returns available:false when binary missing
test('probeWrangler fails soft when binary not found', () => {
  const savedPath = process.env.PATH
  process.env.PATH = '/nonexistent'
  delete require.cache[require.resolve(HAMR)]
  const { probeWrangler } = require(HAMR)
  const r = probeWrangler()
  expect(r.available).toBe(false)
  process.env.PATH = savedPath
})

// (b) Fail-soft: probeMcp returns available:false when no SDK or config
test('probeMcp fails soft when MCP SDK absent', () => {
  const { probeMcp } = require(HAMR)
  const r = probeMcp()
  // In a temp dir with no node_modules or mcp config, should fail soft
  expect(typeof r.available).toBe('boolean')
  if (!r.available) expect(r.reason).toBeTruthy()
})

// (b) Fail-soft: probeNpmTrustedPublishing fails soft when package.json absent
test('probeNpmTrustedPublishing fails soft without package.json', () => {
  const { probeNpmTrustedPublishing } = require(HAMR)
  // tmpDir has no package.json; npm whoami may or may not be auth'd
  const r = probeNpmTrustedPublishing()
  expect(r).toHaveProperty('eligible')
})

// (c) Timeout: probeCloudflare resolves within 10s (5s probe + slack)
test('probeCloudflare resolves within timeout window', async () => {
  const { probeCloudflare } = require(HAMR)
  const start = Date.now()
  const r = await probeCloudflare()
  expect(Date.now() - start).toBeLessThan(10000)
  expect(typeof r.reachable).toBe('boolean')
})

// (c) Timeout: probeGithubOidc resolves within 10s
test('probeGithubOidc resolves within timeout window', async () => {
  const { probeGithubOidc } = require(HAMR)
  const start = Date.now()
  const r = await probeGithubOidc()
  expect(Date.now() - start).toBeLessThan(10000)
  expect(r).toHaveProperty('eligible')
})
