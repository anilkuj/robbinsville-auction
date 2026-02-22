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
      return next(new Error('Authentication required'));
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
    }

    socket.on('disconnect', (reason) => {
      console.log(`[Socket] Disconnected: ${socket.user.name} — ${reason}`);
    });

    socket.on('error', (err) => {
      console.error(`[Socket] Error from ${socket.user.name}:`, err);
    });
  });
}

module.exports = registerSocketHandlers;
