const Redis = require('ioredis');
const logger = require('../shared/logger');

let redis;

async function connectRedis(url) {
  redis = new Redis(url, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      if (times > 5) return null; // stop retrying
      return Math.min(times * 200, 2000);
    },
  });

  redis.on('connect', () => logger.info('Redis connected'));
  redis.on('error', (err) => logger.error('Redis error', { error: err.message }));

  return redis;
}

function getRedis() {
  if (!redis) throw new Error('Redis not initialized. Call connectRedis() first.');
  return redis;
}

module.exports = { connectRedis, getRedis };
