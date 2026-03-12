require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');

const config = require('./config');
const { getState } = require('./state');
const { loadState } = require('./persistence');
const { scheduleTimer, handleTimerExpiry, getPublicState } = require('./auction');
const registerSocketHandlers = require('./socketHandlers');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const publicRoutes = require('./routes/public');

const app = express();
const server = http.createServer(app);

const isProd = process.env.NODE_ENV === 'production';

const io = new Server(server, {
  cors: isProd ? false : { origin: '*', methods: ['GET', 'POST'] },
});

// Middleware
if (!isProd) {
  app.use(cors({ origin: '*' }));
}
app.use(express.json({ limit: '10mb' }));

// Request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// API routes
app.use('/api/auth', authRoutes(io));
app.use('/api/admin', adminRoutes(io));
app.use('/api/public', publicRoutes);

// Health check
app.get('/api/health', (req, res) => {
  const state = getState();
  res.json({ status: 'ok', phase: state.phase, players: state.players.length });
});

// Fallback 404 logger for /api
app.use('/api', (req, res) => {
  console.log(`[404] No match found for: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ error: `Route ${req.method} ${req.originalUrl} not found` });
});

// Serve static client in production
if (isProd) {
  app.use(express.static(config.clientDist));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/socket.io')) {
      res.sendFile(path.join(config.clientDist, 'index.html'));
    }
  });
}

// Socket.io handlers
registerSocketHandlers(io);

// Load persisted state, reschedule timer if needed
(async () => {
  await loadState();
  const state = getState();
  if (state.phase === 'LIVE' && !state.timerPaused && state.timerEndsAt) {
    const remaining = state.timerEndsAt - Date.now();
    if (remaining > 0) {
      console.log(`[Startup] Rescheduling auction timer: ${remaining}ms remaining`);
      scheduleTimer(io, remaining);
    } else {
      console.log('[Startup] Timer expired during downtime — processing expiry');
      setTimeout(() => handleTimerExpiry(io), 200);
    }
  }

  server.listen(config.port, () => {
    console.log(`\n🏏 Robbinsville Auction Server`);
    console.log(`   Port: ${config.port}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   Admin password: ${config.admin.password}`);
    console.log(`   State file/kv: ${config.redisUrl ? 'Upstash Redis' : config.stateFile}\n`);
  });
})();

module.exports = { io };
