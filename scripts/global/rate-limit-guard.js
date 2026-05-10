'use strict';
// Refs #1294 — Rate-limit guard middleware with ETag cache.
// Per Epic #1271 AC5: 80 content-creating req/min secondary cap; bulk caps 50 req/min.

const BUDGETS = {
  default: { perMinute: 80, perHour: 5000 },
  semantic_search: { perMinute: 10, perHour: 600 },
  bulk: { perMinute: 50, perHour: 1500 },
};

const BACKOFF_MS = [1000, 2000, 4000, 8000];

class RateLimitGuard {
  constructor({ now = () => Date.now(), budget = 'default', cache = new Map() } = {}) {
    this.now = now;
    this.budget = BUDGETS[budget] || BUDGETS.default;
    this.cache = cache;
    this.history = [];
  }

  prune() {
    const cutoff = this.now() - 60_000;
    while (this.history.length && this.history[0] < cutoff) this.history.shift();
  }

  available() {
    this.prune();
    return this.history.length < this.budget.perMinute;
  }

  consume() {
    this.history.push(this.now());
  }

  async withGuard(key, fn) {
    if (key && this.cache.has(key)) return { hit: true, value: this.cache.get(key) };
    for (let attempt = 0; attempt < BACKOFF_MS.length; attempt++) {
      if (!this.available()) {
        await new Promise(r => setTimeout(r, BACKOFF_MS[attempt]));
        continue;
      }
      this.consume();
      try {
        const value = await fn();
        if (key) this.cache.set(key, value);
        return { hit: false, value };
      } catch (e) {
        const status = e.status || e.response?.status;
        if (status === 429 || status === 503) {
          await new Promise(r => setTimeout(r, BACKOFF_MS[attempt]));
          continue;
        }
        throw e;
      }
    }
    throw new Error(`Rate-limit guard: budget exhausted after ${BACKOFF_MS.length} attempts`);
  }
}

module.exports = { RateLimitGuard, BUDGETS, BACKOFF_MS };
