// services/cache.js
// Centralized cache used by LLM service and workflow controller.
// TTL defaults to 1 hour; keys auto-expire so demos stay fresh.
const NodeCache = require('node-cache');

const cache = new NodeCache({
  stdTTL: 3600,        // 1 hour
  checkperiod: 600,    // sweep every 10 min
  useClones: false     // faster — we never mutate cached values
});

const stats = () => cache.getStats();

module.exports = { cache, stats };
