const express = require('express');
const jwt = require('jsonwebtoken');
const config = require('../config');
const { getState } = require('../state');

const router = express.Router();

// Returns whether the dashboard requires a PIN
router.get('/dashboard-settings', (req, res) => {
  const state = getState();
  res.json({ requiresPin: Boolean(state.settings.dashboardPin) });
});

// Validates PIN and returns a spectator JWT
router.post('/dashboard-auth', (req, res) => {
  const { pin } = req.body;
  const state = getState();

  if (!state.settings.dashboardPin) {
    // No PIN configured — issue token freely
    const token = jwt.sign(
      { id: 'spectator', role: 'spectator', name: 'Spectator' },
      config.jwtSecret,
      { expiresIn: '12h' }
    );
    return res.json({ token });
  }

  if (!pin || pin !== state.settings.dashboardPin) {
    return res.status(401).json({ error: 'Invalid PIN' });
  }

  const token = jwt.sign(
    { id: 'spectator', role: 'spectator', name: 'Spectator' },
    config.jwtSecret,
    { expiresIn: '12h' }
  );
  res.json({ token });
});

module.exports = router;
