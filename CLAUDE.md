# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

DevGenius V12 — full-stack React 19 + Vite + Express app with Google Gemini integration. Frontend is Tailwind v4. Backend is Node.js 22+ Express. Target host is Hostinger (Cloud / VPS / Node.js plan).

## Commands

```bash
npm run dev      # tsx server.ts → Express with Vite in middleware mode (HMR), http://localhost:3000
npm run build    # vite build (→ dist/) AND esbuild bundle server.ts (→ server.cjs)
npm start        # NODE_ENV=production node server.cjs — serves dist/ + API
npm run lint     # tsc --noEmit (typecheck only — repo has no test suite, no eslint)
npm run clean    # rm -rf dist server.cjs
```

There is no test runner configured. Treat `npm run lint` as the only automated check.

Override the dev port with `PORT=4000 npm run dev`. Do **not** set `PORT` in Hostinger — the panel injects it.

## Architecture

### Single Express server, two modes

`server.ts` is the only backend entrypoint. It branches on `NODE_ENV` + presence of `dist/`:

- **Dev** (no `dist/`, NODE_ENV != production): mounts Vite as middleware (`createViteServer({ middlewareMode: true })`) so the React app HMRs through the same process that serves `/api/*`. No separate frontend server.
- **Prod**: serves `dist/` statically and falls back to `dist/index.html` for SPA routing.

When changing the server, remember both modes share the same Express app — any middleware added before `startServer()` runs in dev and prod.

### The Hostinger ESM→CJS shim

`package.json` has `"type": "module"`, but Hostinger's Node.js panel auto-detects `server.ts` and writes `server.js` as the entry file (it cannot be overridden in some plans). To bridge:

1. `npm run build:server` uses esbuild to bundle `server.ts` → **`server.cjs`** (CommonJS, externals kept) at the repo root.
2. `server.js` (committed, ESM) does a single `import './server.cjs';` so Node loads the CJS bundle from within the ESM entry.

If you touch the build pipeline, keep `server.cjs` at the **repo root** (not in `dist/`) — the shim and `npm start` both expect that path. Do not delete `server.js`; it is required for Hostinger's auto-detected entry to work.

### Frontend structure

- `src/main.tsx` → `src/App.tsx` → either `Dashboard` (always shown) or `AuthPage` (overlay on demand).
- `src/components/` has only two files: `AuthPage.tsx` and `Dashboard.tsx` (~140 KB) — both very large monoliths. Most UI state lives inside them.
- `src/data/` holds static catalogs: `hardware.ts`, `projects.ts`, `questions.ts`. These are imported directly by components; treat as content, not config.
- Vite alias: `@/*` → repo root (see `vite.config.ts` + `tsconfig.json paths`). Imports may use either `@/src/...` or relative paths.
- Auth session is **not** persisted — `App.tsx` always starts logged out.

### Backend "DB"

Mock persistence in `users.json` at the project root (auto-created on first boot). All `/api/auth/*` and `/api/notes/:username` routes do synchronous `fs.readFileSync` / `writeFileSync` on this file. Passwords are stored in plaintext. There is no session/JWT — the client just remembers what the login endpoint returned. Recovery codes live in an in-memory `RECOVERY_CODES` map (lost on restart). Don't introduce assumptions of a real DB without flagging it.

### Gemini integration

Single client (`new GoogleGenAI({ apiKey: GEMINI_API_KEY })`) used by `/api/ai-chat` and `/api/ai-schematic`. Model constant: `GEMINI_MODEL = "gemini-1.5-flash"` — change it in one place. Missing `GEMINI_API_KEY` does not crash the server; the two AI routes return 503. The schematic prompt is a large hardcoded Portuguese template inside `server.ts` — edit it there.

## Conventions

- All user-facing strings (API errors, prompts, UI copy) are in **Portuguese (pt-BR)**. Keep new strings consistent.
- Node engine is pinned to `>=22.0.0` (`.nvmrc` = `22`). esbuild target is `node22`. Don't downgrade.
- `standalone.html` at the repo root is a self-contained legacy demo — not wired to the build. Don't edit it to ship features.
