const { test, expect } = require('@playwright/test');

async function readSelfHeartbeat(page, globals = {}) {
  return page.evaluate(async (vars) => {
    localStorage.removeItem('agent_heartbeats');
    delete window.__AGENT_VENDOR;
    delete window.__AGENT_RUNTIME;
    delete window.__AGENT_ID;
    delete window.__AGENT_BRANCH;
    Object.assign(window, vars);
    const sessions = await window.fetchAgentSessions();
    return sessions[0];
  }, globals);
}

test.describe('multi-agent session heartbeat', () => {
  test('attributes Codex sessions from runtime globals', async ({ page }) => {
    await page.goto('/');
    const session = await readSelfHeartbeat(page, {
      __AGENT_VENDOR: 'codex',
      __AGENT_BRANCH: 'sandbox/codex',
    });
    expect(session.vendor).toBe('codex');
    expect(session.agentId).toBe('codex-sandbox/codex');
    expect(session.branch).toBe('sandbox/codex');
  });

  test('keeps Copilot as default self heartbeat vendor', async ({ page }) => {
    await page.goto('/');
    const session = await readSelfHeartbeat(page);
    expect(session.vendor).toBe('copilot');
    expect(session.agentId).toBe('copilot-main');
    expect(session.branch).toBe('unknown');
  });
});
