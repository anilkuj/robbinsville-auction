const jwt = require('jsonwebtoken');
const config = require('../config');
const { getPublicState } = require('../auction');
const registerAdminHandlers = require('./adminHandlers');
const registerBidHandlers = require('./bidHandlers');

function registerSocketHandlers(io) {
  // Auth middleware for all socket connections
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      // If a dashboard PIN is configured, reject unauthenticated connections
      const { getState } = require('../state');
      const state = getState();
      if (state.settings.dashboardPin) {
        return next(new Error('Dashboard requires PIN authentication'));
      }
      // Allow unauthenticated spectator connections (read-only — receives state events only)
      socket.user = { id: 'spectator', role: 'spectator', name: 'Spectator' };
      return next();
    }
    try {
      const decoded = jwt.verify(token, config.jwtSecret);
      socket.user = decoded;
      next();
    } catch (err) {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`[Socket] Connected: ${socket.user.name} (${socket.user.role}) — ${socket.id}`);

    // Send full state snapshot on connect
    socket.emit('state:full', getPublicState());

    // Register role-specific handlers
    if (socket.user.role === 'admin') {
      registerAdminHandlers(io, socket);
    } else if (socket.user.role === 'team') {
      registerBidHandlers(io, socket);

      // Mark team as online and broadcast update
      const { getState } = require('../state');
      const state = getState();
      if (state.teams[socket.user.id]) {
        state.teams[socket.user.id].isOnline = true;
        io.emit('state:full', getPublicState());
      }
    }

    socket.on('disconnect', (reason) => {
      console.log(`[Socket] Disconnected: ${socket.user.name} — ${reason}`);
      if (socket.user.role === 'team') {
        const { getState } = require('../state');
        const state = getState();
        if (state.teams[socket.user.id]) {
          // Double check if there's somehow another connection for this team
          let stillOnline = false;
          for (const [_, s] of io.sockets.sockets) {
            if (s.id !== socket.id && s.user && s.user.role === 'team' && s.user.id === socket.user.id) {
              stillOnline = true;
              break;
            }
          }
          state.teams[socket.user.id].isOnline = stillOnline;
          io.emit('state:full', getPublicState());
        }
      }
    });

    socket.on('error', (err) => {
      console.error(`[Socket] Error from ${socket.user.name}:`, err);
    });
  });
}

module.exports = registerSocketHandlers;
