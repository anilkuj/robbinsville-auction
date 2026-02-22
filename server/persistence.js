const fs = require('fs');
const path = require('path');
const config = require('./config');
const { getState } = require('./state');

let saveTimer = null;

function saveState() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      if (!fs.existsSync(config.dataDir)) {
        fs.mkdirSync(config.dataDir, { recursive: true });
      }
      const data = JSON.stringify(getState(), null, 2);
      fs.writeFileSync(config.stateFile, data, 'utf8');
    } catch (err) {
      console.error('Failed to save state:', err);
    }
    saveTimer = null;
  }, 500);
}

function loadState() {
  try {
    if (fs.existsSync(config.stateFile)) {
      const data = fs.readFileSync(config.stateFile, 'utf8');
      const saved = JSON.parse(data);
      const state = getState();
      Object.assign(state, saved);
      console.log('State loaded from disk');
      return true;
    }
  } catch (err) {
    console.error('Failed to load state:', err);
  }
  return false;
}

module.exports = { saveState, loadState };
