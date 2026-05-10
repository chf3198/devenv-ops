const { test, expect } = require('@playwright/test');
const path = require('path');

test('goal health panel renders sensor weights and actuator split', () => {
  global.esc = v => String(v);
  const { renderGoalHealthPanel } = require(path.join(__dirname, '../dashboard/js/goal-health'));
  const html = renderGoalHealthPanel({
    overall: 'PASS',
    goal_health: {
      score: 0.84,
      stale: false,
      contributing: {
        ga: { value: 0.1, clamped: 0.1, weight: 0.25 },
        cf: { value: 0.2, clamped: 0.2, weight: 0.2 },
      },
      weights_used: { ga: 0.5, cf: 0.5 },
    },
    actuator_state: { actuators: { A1: { tier: 'B++', escalated_at: '2026-05-09T00:00:00Z' } } },
  });
  expect(html).toContain('Goal Health Split');
  expect(html).toContain('ga');
  expect(html).toContain('A1');
  expect(html).toContain('B++');
});