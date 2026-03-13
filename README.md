# Robbinsville Premier League Auction App

Real-time IPL-style cricket player auction for a 10-team local league.

## Quick Start

### Prerequisites
- Node.js 18+
- npm

### Install
```bash
npm run install:all
```

### Development (two terminals)
```bash
# Terminal 1 — server on :3001
npm run dev:server

# Terminal 2 — client on :5173
npm run dev:client
```
Open http://localhost:5173

### Testing
```bash
npm run test --prefix server
npm run test --prefix client
```

**Admin login:** username `admin`, password `admin123`

### Production Build & Run
```bash
npm run build
npm start
```

---

## Configuration

### Environment Variables
Copy `.env.example` to `.env`:
```
JWT_SECRET=your-long-random-secret
ADMIN_PASSWORD=your-admin-password
NODE_ENV=production
PORT=3001

# Optional but recommended (Stateless Persistence)
UPSTASH_REDIS_REST_URL=your-upstash-redis-url
UPSTASH_REDIS_REST_TOKEN=your-upstash-redis-token
```

### First-Time Setup (Admin Panel)
1. Log in as admin → go to **League Setup** tab
2. Set global settings (teams, squad size, budget, min bid)
3. Configure team names + passwords
4. Configure player pools (counts must sum to `numTeams × squadSize`). *Note: Deleting or adding pools will prompt a Merge/Split wizard to maintain the math.*
5. Click **Save League Config**
6. Go to **Auction Controls** tab → download CSV template
7. Fill in player names, upload CSV
8. Click **Next Player** to start auctioning

### CSV Format
```csv
name,pool
Virat Kohli,A1
Rohit Sharma,A1
...
```
Pool IDs must exactly match those configured in League Setup.

---

## Default League Settings
| Setting | Default |
|---|---|
| Teams | 10 |
| Squad size | 18 players |
| Starting budget | 50,000 pts |
| Min bid | 1,000 pts |
| Timer | 30 seconds |
| Bid increment | 500 pts |

### Default Pools
| Pool | Count | Base Price |
|---|---|---|
| A1 | 10 | 4,500 |
| A2 | 10 | 4,000 |
| A3 | 10 | 3,500 |
| B1 | 10 | 3,000 |
| B2 | 10 | 2,700 |
| B3 | 10 | 2,500 |
| C | 40 | 1,500 |
| D | 80 | 1,000 |

Total: 180 players = 10 teams × 18 players ✓

---

## Deployment (Railway / Render)

### Railway
1. Push to GitHub
2. Create new Railway project → deploy from repo
3. Set env vars: `JWT_SECRET`, `ADMIN_PASSWORD`, `NODE_ENV=production`
4. Building uses `npm run install:all && npm run build`
5. Start command uses `node server/index.js`
6. (Optional) **Upstash Redis**: Add `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` in your environment variables for stateless deployment.

### Render
1. Push to GitHub (ensure `render.yaml` is present).
2. Create new Blueprint at [dashboard.render.com/blueprints](https://dashboard.render.com/blueprints).
3. Connect repo. It will automatically use the optimized build (`npm run install:all && npm run build`).
4. Set `JWT_SECRET` and `ADMIN_PASSWORD` in Environment variables (or let Render generate them).
5. For persistence, use **Upstash Redis** (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`).

---

## Mock Auction Simulation

You can simulate a full auction using pre-loaded data to verify the system's behavior.

### Process
1. Ensure the server is running (`npm run dev:server`).
2. Run one of the mock scripts from the `server` directory:

```bash
# Option A: Create a 'perfect' state from backup_state.json
# (Simulates 5000 iterations to ensure all players sold and budgets balance)
node server/mock_perfect_auction.js

# Option B: Simulate on top of your current live state
node server/mock_live_smart_auction.js
```

### Requirements
- The scripts expect the server at `http://localhost:3001`.
- `ADMIN_PASSWORD` should be set in environment variables (defaults to `admin123`).
- `server/backup_state.json` must be present for the perfect auction script.

> ⚠️ **Warning:** These scripts will **overwrite** your current server state via the `/api/admin/import-state` endpoint.

> ⚠️ **Note:** `state.json` is stored on disk and is ephemeral on free tiers.
> Use **Export State JSON** from the admin panel to back up between sessions.
> Do not redeploy mid-auction.

---

## Key Features

- **Real-time Auction**: Authored by a server-side authoritative timer with instant socket updates.
- **Premium Themes**: Sophisticated **Dark/Light (White Model) Toggle** with persistent user preference.
- **Responsive Design**: Fully optimized for Desktop (Projector), Tablet (iPad), and Mobile (Owner bidding).
- **Advanced Mock Simulation**: Tools to simulate full or partial auctions to verify state and logistics.
- **Roster Posters**: High-definition roster grid with "Download Poster" and "Show/Hide Points" functionality.
- **Excel-Style Filtering**: Searchable dropdown filters for all player data tables.
- **Stateless Persistence**: Seamless sync with Upstash Redis for serverless deployment.

---

## Architecture

- **Backend:** Node.js + Express + Socket.io (authoritative timer)
- **Frontend:** React 18 + Vite (served statically from Express in production)
- **Validation:** Server uses **Zod** to validate all Socket.io client payloads.
- **Storage:** In-memory singleton with 500ms debounced persistence.
  - *Primary:* **Upstash Serverless Redis** (if env vars are provided AND UI storage preference is set to Auto).
  - *Fallback/Manual Override:* Local `server/data/state.json`. Forced by default during restores/resets.
- **Auth:** JWT (24h expiry), team credentials managed via admin panel

### Budget Constraint
```js
maxBid = budget - (playersStillNeeded × minBid)
```
Server enforces this on every bid. Client uses it to disable the Bid button.

### Timer
- Server-authoritative: `timerEndsAt` epoch ms sent to all clients
- Clients compute `remaining = timerEndsAt - Date.now()` (no server polling)
- On bid: timer resets server-side, new `timerEndsAt` broadcast to all
- On server restart: timer rescheduled from persisted `timerEndsAt`
