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
      const state = getState();
      const pref = state.settings?.storagePreference || 'auto';
      const useRedis = !!redis && pref !== 'local';

      const data = JSON.stringify(state, null, 2);

      if (useRedis) {
        // Save to Redis key 'auction_state'
        await redis.set('auction_state', data);
      } else {
        // Fallback to local disk if Redis isn't configured, or forced local
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
    let diskState = null;

    if (fs.existsSync(config.stateFile)) {
      try {
        const raw = fs.readFileSync(config.stateFile, 'utf8');
        diskState = JSON.parse(raw);
      } catch (e) { }
    }

    // If disk state explicitly asked for local storage, bypass Redis checks
    if (diskState && diskState.settings && diskState.settings.storagePreference === 'local') {
      data = diskState;
      console.log('Forced loading state from local disk (storagePreference=local)');
    } else if (redis) {
      // Attempt to load from Redis
      let rData = await redis.get('auction_state');
      // Upstash might return an object directly if it parsed the JSON, or a string
      if (rData && typeof rData !== 'string') {
        rData = JSON.stringify(rData);
      }
      if (rData) {
        data = JSON.parse(rData);
        console.log('State loaded from Upstash Redis');
      }
    }

    // Fallback to disk if Redis has no data, or Redis load failed
    if (!data && diskState) {
      data = diskState;
      console.log('State loaded from local disk (Redis empty or fallback)');
    }

    if (data) {
      const state = getState();
      Object.assign(state, data);
      return true;
    }
  } catch (err) {
    console.error('Failed to load state:', err);
  }
  return false;
}

module.exports = { saveState, loadState };
