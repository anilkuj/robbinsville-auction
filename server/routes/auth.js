const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const config = require('../config');
const { getState } = require('../state');
module.exports = (io) => {
  router.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    // Check admin
    if (username.toLowerCase() === 'admin' || username === config.admin.username) {
      if (password === config.admin.password) {
        const token = jwt.sign(
          { id: 'admin', username: 'admin', role: 'admin', name: 'Admin' },
          config.jwtSecret,
          { expiresIn: '24h' }
        );
        return res.json({ token, role: 'admin', name: 'Admin', id: 'admin' });
      }
    }

    // Check teams
    const state = getState();

    // Check host
    if (username.toLowerCase() === 'host') {
      if (!state.settings.hostPin || password === state.settings.hostPin) {
        const token = jwt.sign(
          { id: 'host', username: 'host', role: 'host', name: 'Host' },
          config.jwtSecret,
          { expiresIn: '24h' }
        );
        return res.json({ token, role: 'host', name: 'Host', id: 'host' });
      }
    }
    for (const [teamId, team] of Object.entries(state.teams)) {
      const nameMatch = team.name.toLowerCase() === username.toLowerCase();
      const idMatch = teamId === username;
      if ((nameMatch || idMatch) && team.password === password) {
        // Check if team is already connected
        let isAlreadyLoggedIn = false;
        if (io) {
          for (const [_, socket] of io.sockets.sockets) {
            if (socket.user && socket.user.role === 'team' && socket.user.id === teamId) {
              isAlreadyLoggedIn = true;
              break;
            }
          }
        }

        if (isAlreadyLoggedIn) {
          return res.status(403).json({ error: 'Team is already logged in. Please wait until they log out or ask Admin to clear the session.' });
        }

        const token = jwt.sign(
          { id: teamId, username: team.name, role: 'team', name: team.name, teamId },
          config.jwtSecret,
          { expiresIn: '24h' }
        );
        return res.json({ token, role: 'team', name: team.name, id: teamId, teamId });
      }
    }

    return res.status(401).json({ error: 'Invalid credentials' });
  });

  return router;
};
