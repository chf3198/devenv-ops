// scripts/wiki/wiki-io.js — File I/O helpers for wiki operations

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

const WIKI_DIR = path.join(__dirname, '../../wiki');
const DATE_TOLERANCE_DAYS = 1;

function parseFrontmatter(content) {
  try {
    const parsed = matter(String(content || ''));
    return { frontmatter: parsed.data || {}, body: parsed.content || '' };
  } catch {
    return { frontmatter: {}, body: String(content || '') };
  }
}

function updateIndex(slug, title, type) {
  const indexPath = path.join(WIKI_DIR, 'index.md');
  let content = fs.readFileSync(indexPath, 'utf-8');
  const sectionMap = {
    entity: '## Entities',
    entities: '## Entities',
    concept: '## Concepts',
    concepts: '## Concepts',
    source: '## Source Summaries',
    sources: '## Source Summaries',
    synthesis: '## Syntheses',
    syntheses: '## Syntheses',
  };
  const section = sectionMap[type] || '## Source Summaries';
  const entry = `- [[${slug}]] — ${title}`;

  if (content.includes(`[[${slug}]]`)) return; // already indexed

  const sectionIdx = content.indexOf(section);
  if (sectionIdx === -1) return;
  const nextSection = content.indexOf('\n## ', sectionIdx + 1);
  const insertAt = nextSection !== -1 ? nextSection : content.indexOf('\n---');
  if (insertAt === -1) {
    content += `\n${entry}\n`;
  } else {
    content = content.slice(0, insertAt) + `\n${entry}\n` + content.slice(insertAt);
  }

  // Update stats line
  const pages = countPages();
  content = content.replace(
    /\*\*Pages\*\*:.*$/m,
    `**Pages**: ${pages} | **Last updated**: ${new Date().toISOString().split('T')[0]}`
  );
  fs.writeFileSync(indexPath, content);
}

function appendLog(date, operation, subject) {
  const now = Date.now();
  const maxFutureMs = now + DATE_TOLERANCE_DAYS * 86400000;
  const parsedDate = Date.parse(`${date}T00:00:00Z`);
  if (!Number.isFinite(parsedDate)) throw new Error(`Invalid wiki log date: ${date}`);
  if (parsedDate > maxFutureMs) {
    throw new Error(`Refusing future wiki log date '${date}' (tolerance ${DATE_TOLERANCE_DAYS} day).`);
  }
  const logPath = path.join(WIKI_DIR, 'log.md');
  const entry = `\n## [${date}] ${operation} | ${subject}\n`;
  fs.appendFileSync(logPath, entry);
}

/** Count all .md files in wiki subdirs (not index/log). */
function countPages() {
  const dirs = ['entities', 'concepts', 'sources', 'syntheses'];
  let count = 0;
  for (const d of dirs) {
    const dp = path.join(WIKI_DIR, d);
    if (!fs.existsSync(dp)) continue;
    count += fs.readdirSync(dp).filter((f) => f.endsWith('.md')).length;
  }
  return count;
}

/** List all wiki page slugs with their paths. */
function listPages() {
  const dirs = ['entities', 'concepts', 'sources', 'syntheses'];
  const pages = [];
  for (const d of dirs) {
    const dp = path.join(WIKI_DIR, d);
    if (!fs.existsSync(dp)) continue;
    for (const f of fs.readdirSync(dp).filter((x) => x.endsWith('.md'))) {
      pages.push({ slug: f.replace('.md', ''), type: d, path: path.join(dp, f) });
    }
  }
  return pages;
}

module.exports = {
  parseFrontmatter, updateIndex, appendLog,
  countPages, listPages, WIKI_DIR, DATE_TOLERANCE_DAYS,
};
