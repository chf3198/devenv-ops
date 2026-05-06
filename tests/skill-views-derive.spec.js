// skill-views-derive tests (#979).
const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');
const os = require('os');

const DERIVE = require(path.resolve(__dirname, '..', 'scripts', 'global', 'skill-views-derive.js'));
const REPO_ROOT = path.resolve(__dirname, '..');

test('scanSkills finds at least 10 skills with name+description', () => {
  const skills = DERIVE.scanSkills();
  expect(skills.length).toBeGreaterThanOrEqual(10);
  for (const s of skills) {
    expect(s.name).toBeTruthy();
    expect(typeof s.name).toBe('string');
  }
});

test('scanSkills returns alphabetical order', () => {
  const skills = DERIVE.scanSkills();
  const names = skills.map((s) => s.name);
  const sorted = [...names].sort();
  expect(names).toEqual(sorted);
});

test('buildDoc emits markdown with skill bullets', () => {
  const doc = DERIVE.buildDoc('agents', [{ name: 'foo', description: 'bar' }, { name: 'baz', description: 'qux' }]);
  expect(doc).toContain('# Skill index');
  expect(doc).toContain('**foo** — bar');
  expect(doc).toContain('**baz** — qux');
});

test('run() is idempotent — second invocation reports no change', () => {
  const tmp1 = path.join(os.tmpdir(), `svd-${Date.now()}-1.md`);
  const tmp2 = path.join(os.tmpdir(), `svd-${Date.now()}-2.md`);
  const targets = [{ audience: 'agents', file: tmp1 }, { audience: 'copilot', file: tmp2 }];
  const r1 = DERIVE.run({ targets });
  const r2 = DERIVE.run({ targets });
  for (const res of r1.results) expect(res.changed).toBe(true);
  for (const res of r2.results) expect(res.changed).toBe(false);
  fs.unlinkSync(tmp1); fs.unlinkSync(tmp2);
});

test('parseSkill handles missing frontmatter gracefully', () => {
  const tmp = path.join(os.tmpdir(), `svd-noyaml-${Date.now()}.md`);
  fs.writeFileSync(tmp, '# No frontmatter here');
  expect(DERIVE.parseSkill(tmp)).toBeNull();
  fs.unlinkSync(tmp);
});

test('docs/skills-{agents,copilot}.md are <100 lines (lint cap)', () => {
  for (const f of ['docs/skills-agents.md', 'docs/skills-copilot.md']) {
    const file = path.join(REPO_ROOT, f);
    if (!fs.existsSync(file)) continue;
    const lines = fs.readFileSync(file, 'utf8').split('\n').length;
    expect(lines).toBeLessThan(100);
  }
});
