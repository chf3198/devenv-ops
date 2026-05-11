// changelog-aggregate — golden-file tests (#1132).
const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');
const os = require('os');
const A = require(path.resolve(__dirname, '..', 'scripts', 'global', 'changelog-aggregate.js'));

function mk() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'changelog-agg-'));
  const fragDir = path.join(dir, 'fragments');
  const changelog = path.join(dir, 'CHANGELOG.md');
  fs.mkdirSync(fragDir);
  fs.writeFileSync(changelog, '# Changelog\n\n## [Unreleased] — prior\n');
  return { dir, fragDir, changelog, cleanup: () => fs.rmSync(dir, { recursive: true }) };
}
const w = (p, c) => fs.writeFileSync(p, c);

test('listFragments: sorts by ticket number, skips non-md, handles empty', () => {
  const { dir, fragDir, cleanup } = mk();
  w(path.join(fragDir, '1132.md'), 'x'); w(path.join(fragDir, '1115.md'), 'y');
  w(path.join(fragDir, '1500.md'), 'z'); w(path.join(fragDir, 'README'), 'ignored');
  expect(A.listFragments(fragDir).map(f => f.name)).toEqual(['1115.md', '1132.md', '1500.md']);
  const empty = fs.mkdtempSync(path.join(os.tmpdir(), 'empty-'));
  expect(A.listFragments(empty)).toEqual([]);
  fs.rmSync(empty, { recursive: true }); cleanup();
});

test('aggregate: empty fragments → no changes', () => {
  const { fragDir, changelog, cleanup } = mk();
  const before = fs.readFileSync(changelog, 'utf-8');
  expect(A.aggregate({ dir: fragDir, changelog }).count).toBe(0);
  expect(fs.readFileSync(changelog, 'utf-8')).toBe(before);
  cleanup();
});

test('aggregate: prepends fragments after header, deletes fragment, preserves prior', () => {
  const { fragDir, changelog, cleanup } = mk();
  w(path.join(fragDir, '1132.md'), '## [Unreleased] — #1132: aggregator\n\n### Added\n- script');
  expect(A.aggregate({ dir: fragDir, changelog }).count).toBe(1);
  const c = fs.readFileSync(changelog, 'utf-8');
  expect(c).toMatch(/^# Changelog\n\n## \[Unreleased\] — #1132/);
  expect(c).toContain('## [Unreleased] — prior');
  expect(fs.existsSync(path.join(fragDir, '1132.md'))).toBe(false);
  cleanup();
});

test('aggregate: dry-run preserves CHANGELOG and fragments', () => {
  const { fragDir, changelog, cleanup } = mk();
  w(path.join(fragDir, '1132.md'), '## [Unreleased] — #1132: test');
  const before = fs.readFileSync(changelog, 'utf-8');
  const r = A.aggregate({ dir: fragDir, changelog, dryRun: true });
  expect(r.dryRun).toBe(true); expect(r.count).toBe(1);
  expect(r.preview).toContain('#1132');
  expect(fs.readFileSync(changelog, 'utf-8')).toBe(before);
  expect(fs.existsSync(path.join(fragDir, '1132.md'))).toBe(true);
  cleanup();
});

test('aggregate: archive-to moves fragments; multi-fragment order is by ticket', () => {
  const { dir, fragDir, changelog, cleanup } = mk();
  w(path.join(fragDir, '1132.md'), '## #1132 entry'); w(path.join(fragDir, '1115.md'), '## #1115 entry');
  const archive = path.join(dir, 'archive');
  A.aggregate({ dir: fragDir, changelog, archiveTo: archive });
  expect(fs.existsSync(path.join(archive, '1132.md'))).toBe(true);
  expect(fs.existsSync(path.join(archive, '1115.md'))).toBe(true);
  const c = fs.readFileSync(changelog, 'utf-8');
  expect(c.indexOf('#1115')).toBeLessThan(c.indexOf('#1132'));
  cleanup();
});

test('prependToChangelog: throws when existing file lacks canonical header', () => {
  expect(() => A.prependToChangelog('content', '/nonexistent/x')).not.toThrow();
  const { changelog, cleanup } = mk();
  w(changelog, 'not the right header');
  expect(() => A.prependToChangelog('content', changelog)).toThrow(/CHANGELOG\.md missing header/);
  cleanup();
});
