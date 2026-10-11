# ScoreWave

Live multi-sport scoreboard with real-time sockets and AI commentaries powered by Gemini.

ScoreWave is a full-stack app (Express + WebSocket server, React SPA) for running live scoreboards for basketball, volleyball, futsal, and badminton. An operator panel controls the match while spectators watch a real-time display; Gemini generates live commentary and an end-of-match narrative summary.

## Features

- **Four sports modes** — basketball (quarters 1-4 + OT, countdown timer, fouls, timeouts), volleyball (sets tracker, best-of-3/5, serving indicator, set timeouts, auto set/match winner detection), futsal (count-up timer, halves, yellow/red cards), badminton (game tracker, serving, auto game/match winner)
- **Room-based flow** — create a match with team names, optional base64 team logos, and a theme (dark / light / retro); get a unique 8-character room ID with shareable display and operator links
- **Real-time sync** — WebSocket (`ws`) broadcasts scores, timers, periods, timeouts, fouls, cards, serving, and state to every connected client; timers tick server-authoritatively every second
- **Operator panel** — score buttons (+1/+2/+3), undo last score, timer controls (toggle, ±10s/±60s), quarter/period switching, timeouts, fouls, cards, serving switch, end match, reset room
- **AI commentary (Gemini)** — `gemini-3.5-flash` via `@google/genai` writes short Indonesian sportscaster-style commentary on every score and a narrative match summary at the end (canned fallback text when no API key is set)
- **Result page** — final score, winner headline, AI narrative summary, and chronological event log
- **REST API** — `POST /api/rooms` (create room), `GET /api/rooms/:roomId` (fetch state)

## Tech Stack

- **React 19** + **React Router 7** (Home, Setup, Operator, Display, Result pages)
- **Express 4** + **ws** — HTTP + WebSocket server in a single `server.ts`
- **Vite 6** — dev middleware and production SPA build
- **Tailwind CSS v4** (`@tailwindcss/vite`) — styling
- **@google/genai** — Gemini API (live commentary + match summary)
- **TypeScript**, lucide-react, motion, tsx / esbuild

## Getting Started

**Prerequisites:** Node.js, npm

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env` and set your Gemini API key:
   ```
   GEMINI_API_KEY="your-gemini-api-key"
   APP_URL="http://localhost:3000"
   ```
   (`GEMINI_API_KEY` is required for AI commentary; without it the server falls back to canned commentary. `APP_URL` is the URL the app is hosted at.)
3. Run the dev server (Vite middleware + API + WebSocket on port 3000):
   ```bash
   npm run dev
   ```
4. Open http://localhost:3000, pick a sport, set up the match, then share the display link and open the operator panel.

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (`tsx server.ts`) |
| `npm run build` | Build frontend (`vite build`) + bundle server (`esbuild` → `dist/server.cjs`) |
| `npm start` | Run the production server (`node dist/server.cjs`) |
| `npm run clean` | Remove build output |
| `npm run lint` | Type-check only (`tsc --noEmit`) |
