# MUI Dark Theme — Design Doc
**Date:** 2026-02-23
**Status:** Approved

## Goal
Upgrade the RPL Auction UI from hand-rolled inline styles to a polished Material UI (MUI v5) dark theme while leaving all server code, Socket.io logic, and context files untouched.

## Packages to Install (client only)
```
@mui/material @emotion/react @emotion/styled @mui/icons-material
```
Roboto font via Google Fonts `<link>` in `client/index.html`.

## Theme (`client/src/theme.js`)
- `mode: 'dark'`
- `primary.main: '#f59e0b'` — cricket gold
- `secondary.main: '#7c3aed'` — deep purple
- `background.default: '#0a0f1e'`
- `background.paper: '#141428'`
- `typography.fontFamily: 'Roboto'`
- `shape.borderRadius: 10`

## Page / Component Changes

| File | MUI components introduced |
|---|---|
| `client/index.html` | Add Roboto Google Fonts link |
| `client/src/main.jsx` | Wrap app in `ThemeProvider` + `CssBaseline` |
| `client/src/theme.js` | New file — MUI theme definition |
| `LoginPage.jsx` | `Card`, `TextField`, `Button`, `CircularProgress`, `Alert` |
| `AuctionPage.jsx` | `AppBar`, `Paper`, `Chip`, `Button`, `Typography`, `List` |
| `DashboardPage.jsx` | `Grid2`, `Card`, `Avatar`, `Chip`, `LinearProgress` |
| `AdminPage.jsx` | `Tabs`, `Tab`, `Table`, `TextField`, `Button`, `Chip`, `Dialog` |
| `PlayerCard.jsx` | `Card` with colored top-border stripe per pool |
| `BidDisplay.jsx` | `Paper` + large `Typography` + `Chip` for current bidder |
| `CountdownTimer.jsx` | Styled `Typography` |
| `BidButton.jsx` | `Button` variant="contained" size="large" |
| `Sidebar.jsx` | `Paper` + `List` + `ListItem` |
| `BidHistory.jsx` | `List` + `ListItem` + `Typography` |

## Constraints
- Server code: zero changes
- Logic/context files: zero changes
- Pool colors retained (A-gold, B-blue, C-purple, D-slate)
- All inline styles replaced with MUI `sx` prop or `styled()`
