const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const WIKI_DIR = path.join(ROOT, 'wiki');
const WIKI_CATS = ['entities', 'concepts', 'sources', 'syntheses'];
const { computeWikiHealth } = require('./wiki/health-contract');

function getWikiHealth() {
  return computeWikiHealth();
}

function getWikiPages() { return require('./wiki-pages-api')(WIKI_DIR, WIKI_CATS); }
module.exports = { getWikiHealth, getWikiPages };
