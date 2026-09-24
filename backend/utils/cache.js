const NodeCache = require('node-cache');

const cache = new NodeCache({ stdTTL: 1800, checkperiod: 120 });

let cacheHits = 0;
let cacheMisses = 0;

function get(key) {
  const val = cache.get(key);
  if (val !== undefined) { cacheHits++; return val; }
  cacheMisses++;
  return null;
}

function set(key, value, ttl) {
  if (ttl) return cache.set(key, value, ttl);
  return cache.set(key, value);
}

function del(key) {
  return cache.del(key);
}

function flush() {
  cacheHits = 0;
  cacheMisses = 0;
  return cache.flushAll();
}

function getStats() {
  const total = cacheHits + cacheMisses;
  return {
    hits: cacheHits,
    misses: cacheMisses,
    hitRate: total > 0 ? Math.round((cacheHits / total) * 100) : 0,
    keys: cache.keys().length
  };
}

module.exports = { get, set, del, flush, getStats };
