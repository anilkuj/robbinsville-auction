# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Install
```bash
npm run install:all   # installs root, server, and client node_modules
```

### Development (requires two terminals)
```bash
npm run dev:server    # server on :3001 with nodemon
npm run dev:client    # Vite dev server on :5173
# OR
npm run dev           # runs both concurrently
```

### Production
```bash
npm run build         # builds client/dist via Vite
npm start             # serves built client + API from :3001
```

### No lint or test scripts are configured in this project.

## Architecture

### Repository Structure
```
robbinsville-auction/
├── server/               # Node.js + Express + Socket.io backend
│   ├── index.js          # Entry point: wires HTTP, Socket.io, routes, state restore
│   ├── state.js          # In-memory singleton — single source of truth
│   ├── auction.js        # All auction logic (timer, bid/sell/unsold, public state)
│   ├── persistence.js    # Debounced write to server/data/state.json (500ms)
│   ├── config.js         # Env vars, file paths, admin credentials
│   ├── routes/
│   │   ├── auth.js       # POST /api/auth/login — JWT issuance
│   │   ├── admin.js      # All admin HTTP routes (CSV import, config, reset, backup)
│   │   └── public.js     # Public read-only routes
│   ├── socketHandlers/
│   │   ├── index.js      # Socket auth middleware, connects role-specific handlers
│   │   ├── adminHandlers.js  # Admin socket events (nextPlayer, pause, acceptBid, etc.)
│   │   └── bidHandlers.js    # bid:place — 10-step server-side validation
│   └── middleware/
│       ├── authenticate.js   # JWT verification for HTTP routes
│       └── requireAdmin.js   # Checks role === 'admin'
└── client/               # React 18 + Vite SPA
    └── src/
        ├── App.jsx           # Routes: /login, /auction, /admin, /dashboard
        ├── contexts/
        │   ├── AuthContext.jsx    # JWT stored in localStorage (rpl_token, rpl_user)
        │   └── AuctionContext.jsx # Socket.io connection, exposes auctionState + actions
        ├── pages/
        │   ├── LoginPage.jsx
        │   ├── AuctionPage.jsx   # Team bidding view
        │   ├── AdminPage.jsx     # Admin panel with 4 tabs (inline, large file)
        │   └── DashboardPage.jsx # Read-only spectator view; flex layout: scrollable teams grid (left) + remaining players pane (right, 240px)
        ├── components/
        │   ├── admin/            # AuctionControls, PlayerImport, TeamRosterTable, UnsoldList
        │   └── auction/          # PlayerCard, BidDisplay, BidHistory, BidButton, CountdownTimer
        └── utils/budgetCalc.js   # computeMaxBid + formatPts (mirrors server logic)
```

**AuctionContext extras:** `adminError` (string|null) + `clearAdminError()` — set when server emits `admin:error` to this socket. Consumed by AuctionControls to display errors near the Manual Sale panel.
```

### Key Design Decisions

**State management:** The server holds a single mutable in-memory `state` object (`server/state.js`). All mutations happen server-side; clients receive immutable snapshots via Socket.io events. `getPublicState()` in `auction.js` strips team passwords before broadcasting.

**Timer:** Server-authoritative. `timerEndsAt` is an epoch ms value broadcast to all clients. Clients compute `remaining = timerEndsAt - Date.now()` locally — no polling. On each bid, the timer is bumped by `timerBumpSeconds` (capped at a full `timerSeconds` from now).

**Budget constraint (critical — enforced on both sides):**
```js
maxBid = budget - (Math.max(0, squadSize - rosterSize - 1) * minBid)
```
`computeMaxBid` exists in both `server/auction.js` and `client/src/utils/budgetCalc.js`. **Keep them in sync.**

**Admin routes vs. socket events:** HTTP routes handle bulk/destructive operations (CSV import, state backup/restore, full reset). Socket events handle real-time auction flow (next player, pause, resume, bids).

**Auction phases:** `SETUP → LIVE → SETUP` (per player) cycling until all players are done, then `ENDED`. Phase transitions are driven by `startPlayer`, `processSold`, `processUnsold` in `auction.js`.

**Persistence:** `saveState()` debounces disk writes to `server/data/state.json` (500ms). On server start, `loadState()` restores state and reschedules the timer if an active round is in progress.

### Socket Events Reference

| Event | Direction | Description |
|---|---|---|
| `state:full` | server→client | Full state snapshot on connect or major change |
| `auction:playerUp` | server→all | New player started |
| `auction:bid` | server→all | Valid bid placed |
| `auction:sold` | server→all | Player sold |
| `auction:unsold` | server→all | Player marked unsold |
| `auction:awaitingHammer` | server→all | Timer expired in manual endMode |
| `auction:paused` / `auction:resumed` | server→all | Timer pause/resume |
| `auction:settingsChanged` | server→all | Settings updated mid-auction |
| `auction:phaseChange` | server→all | Phase changed (e.g., to ENDED) |
| `bid:place` | client→server | Team places a bid |
| `admin:nextPlayer` | client→server | Admin advances to next player |
| `admin:pauseTimer` / `admin:resumeTimer` | client→server | Admin timer control |
| `admin:markUnsold` | client→server | Admin forces unsold |
| `admin:acceptBid` | client→server | Admin hammers sale (manual mode) |
| `admin:reAuction` | client→server | Admin re-queues unsold/sold player |
| `admin:manualSale` | client→server | Admin directly sells a PENDING/UNSOLD player to a team at a chosen price |
| `admin:updateSettings` | client→server | Admin changes live settings |

### Authentication
- Admin: username `admin`, password from `ADMIN_PASSWORD` env var (default `admin123`)
- Teams: login with team name + team password; configured in admin League Setup
- JWT secret from `JWT_SECRET` env var (default `dev-secret-change-in-production`)
- Tokens stored in `localStorage` as `rpl_token` and `rpl_user`
- Socket connections pass JWT in `socket.handshake.auth.token`

### Environment Variables (`.env` in repo root, consumed by `server/index.js`)
```
JWT_SECRET=
ADMIN_PASSWORD=
NODE_ENV=production
PORT=3001
```

### Production Notes
- In production, Express serves the built client from `client/dist/` as static files
- `server/data/state.json` is ephemeral on free-tier PaaS (Railway/Render) — use Export State JSON to back up
- Do not redeploy mid-auction without exporting state first
