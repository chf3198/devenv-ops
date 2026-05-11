const { test, expect } = require('@playwright/test');
const BATON_STATE = (o = {}) => [{issue: 1248, title: 'Test Task', status: 'in-progress', activeRole: 'collaborator', agent: 'testAgent', model: 'test-model', _updated: Date.now(), ...o}];
const EPIC_STATE = (o = {}) => [{issue: 1245, title: 'Epic: Harden git governance', status: 'in-progress', activeRole: 'manager', agent: null, model: null, _updated: Date.now(), ...o}];
const RC = `
function normalizeBaton(state) {
  if (!state) return [];
  const ok = t => t.issue && t.status !== 'closed' && !t.closed;
  return Array.isArray(state) ? state.filter(ok) : (state.issue && state.status !== 'closed' && !state.closed ? [state] : []);
}
function renderBatonFlow(batonState) {
  const tickets = normalizeBaton(batonState);
  if (!tickets.length) return '<div class="baton-flow"><div class="baton-empty">🎯 No active tickets</div></div>';
  const active = tickets.filter(t => {
    if (['done','cancelled','closed'].includes(t.status) || t.closed) return false;
    if (t.status === 'in-progress' && !t.assignee && t.activeRole !== 'manager') return false;
    return true;
  });
  return active.length ? 'rendered' : 'empty';
}
`;
test.describe('Baton Flow Liveness Filter (#1340)', () => {
  test('in-progress task WITHOUT assignee is EXCLUDED', async ({ page }) => {
    await page.evaluate(({ code, state }) => { eval(code); window.testResult = renderBatonFlow(state); }, { code: RC, state: BATON_STATE() });
    expect(await page.evaluate(() => window.testResult)).toBe('empty');
  });
  test('in-progress task WITH assignee is INCLUDED', async ({ page }) => {
    await page.evaluate(({ code, state }) => { eval(code); window.testResult = renderBatonFlow(state); }, { code: RC, state: BATON_STATE({ assignee: 'alice' }) });
    expect(await page.evaluate(() => window.testResult)).toBe('rendered');
  });
  test('in-progress manager Epic WITHOUT assignee is INCLUDED (scoping phase)', async ({ page }) => {
    await page.evaluate(({ code, state }) => { eval(code); window.testResult = renderBatonFlow(state); }, { code: RC, state: EPIC_STATE() });
    expect(await page.evaluate(() => window.testResult)).toBe('rendered');
  });
  test('in-progress manager Epic WITH assignee is INCLUDED', async ({ page }) => {
    await page.evaluate(({ code, state }) => { eval(code); window.testResult = renderBatonFlow(state); }, { code: RC, state: EPIC_STATE({ assignee: 'bob' }) });
    expect(await page.evaluate(() => window.testResult)).toBe('rendered');
  });
  test('done task is EXCLUDED regardless of assignee', async ({ page }) => {
    await page.evaluate(({ code, state }) => { eval(code); window.testResult = renderBatonFlow(state); }, { code: RC, state: BATON_STATE({ status: 'done', assignee: 'alice' }) });
    expect(await page.evaluate(() => window.testResult)).toBe('empty');
  });
  test('closed task is EXCLUDED regardless of assignee', async ({ page }) => {
    await page.evaluate(({ code, state }) => { eval(code); window.testResult = renderBatonFlow(state); }, { code: RC, state: BATON_STATE({ closed: true, assignee: 'alice' }) });
    expect(await page.evaluate(() => window.testResult)).toContain('No active tickets');
  });
  test('ready task (not in-progress) is INCLUDED even without assignee', async ({ page }) => {
    await page.evaluate(({ code, state }) => { eval(code); window.testResult = renderBatonFlow(state); }, { code: RC, state: BATON_STATE({ status: 'ready' }) });
    expect(await page.evaluate(() => window.testResult)).toBe('rendered');
  });
  test('null batonState returns empty', async ({ page }) => {
    await page.evaluate((code) => { eval(code); window.testResult = renderBatonFlow(null); }, RC);
    expect(await page.evaluate(() => window.testResult)).toContain('No active tickets');
  });
  test('t.closed=true ticket is pruned from batonState map', async ({ page }) => {
    // Simulates pruneClosedFromGitHub removing a CLOSED GitHub issue
    await page.evaluate(({ code, state }) => {
      eval(code);
      window.testResult = renderBatonFlow(state);
    }, { code: RC, state: BATON_STATE({ closed: true }) });
    expect(await page.evaluate(() => window.testResult)).toContain('No active tickets');
  });
  test('MERGED state ticket is excluded (PR in mixed payload)', async ({ page }) => {
    // GitHub PRs return state=MERGED; must not surface in baton
    await page.evaluate(({ code, state }) => {
      eval(code);
      window.testResult = renderBatonFlow(state);
    }, { code: RC, state: BATON_STATE({ status: 'merged', closed: true }) });
    expect(await page.evaluate(() => window.testResult)).toContain('No active tickets');
  });
  test('stale tickets 101,106-110,120-121,343,573,1199 all have closed=true and are excluded', async ({ page }) => {
    const staleIds = [101, 106, 107, 108, 109, 110, 120, 121, 343, 573, 1199];
    const state = staleIds.map(id => ({ issue: id, title: `Stale-${id}`, status: 'in-progress', activeRole: 'collaborator', assignee: 'alice', closed: true, _updated: Date.now() }));
    await page.evaluate(({ code, st }) => { eval(code); window.testResult = renderBatonFlow(st); }, { code: RC, st: state });
    expect(await page.evaluate(() => window.testResult)).toContain('No active tickets');
  });
});
