const fs = require('fs');
const path = require('path');
const config = require('./config');
const { getState } = require('./state');
const { Redis } = require('@upstash/redis');

// Initialize Redis if credentials exist, otherwise fallback to null
const redis = (config.redisUrl && config.redisToken)
  ? new Redis({ url: config.redisUrl, token: config.redisToken })
  : null;

let saveTimer = null;

function saveState() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    try {
      const data = JSON.stringify(getState(), null, 2);

      if (redis) {
        // Save to Redis key 'auction_state'
        await redis.set('auction_state', data);
      } else {
        // Fallback to local disk if Redis isn't configured
        if (!fs.existsSync(config.dataDir)) {
          fs.mkdirSync(config.dataDir, { recursive: true });
        }
        fs.writeFileSync(config.stateFile, data, 'utf8');
      }
    } catch (err) {
      console.error('Failed to save state:', err);
    }
    saveTimer = null;
  }, 500);
}

async function loadState() {
  try {
    let data = null;

    if (redis) {
      // Attempt to load from Redis
      data = await redis.get('auction_state');
      // Upstash might return an object directly if it parsed the JSON, or a string
      if (data && typeof data !== 'string') {
        data = JSON.stringify(data);
      }
    }

    // Fallback to disk if Redis has no data or isn't configured
    if (!data && fs.existsSync(config.stateFile)) {
      data = fs.readFileSync(config.stateFile, 'utf8');
    }

    if (data) {
      const saved = JSON.parse(data);
      const state = getState();
      Object.assign(state, saved);
      console.log(redis ? 'State loaded from Upstash Redis' : 'State loaded from local disk');
      return true;
    }
  } catch (err) {
    console.error('Failed to load state:', err);
  }
  return false;
}

module.exports = { saveState, loadState };
