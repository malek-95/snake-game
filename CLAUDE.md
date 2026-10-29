# Snake game – project context

Read this first in a new session. It sums up the project, how it's built, and how we work.

## What it is
A browser Snake game (React 18 + TypeScript + Vite 6 + Tailwind 4), installable as a PWA, with online play.
- **Live site:** https://malek-95.github.io/snake-game/ (GitHub Pages, auto-deployed from `master`)
- **Repo:** https://github.com/malek-95/snake-game (public)
- **Languages:** French (default) and English (`src/i18n/translations.ts`; every UI string goes in both)

## Features (all live)
- Single player modes: Classic, Levels, Time attack, Survival, Zen, Golden apples, Custom levels (editor), Daily challenge
- Full-size board (grid fills the screen, ~28px cells), space theme with starfield, smooth gliding snake drawn as one SVG line
- Sound/music generated with Web Audio (`src/audio/sound.ts`), achievements (unlock skins), skins + themes, device leaderboard, replays
- Local 2 players (one keyboard) and **online 2 players** (room codes, invite links `?room=ABCD`, quick match)
- Online extras: rollback netcode + adaptive input delay, wall passing, power-ups (👻 ghost, ❄️ freeze, ✂️ scissors), emoji reactions, two-sided rematch, live ping
- World leaderboard (one best score per player name per mode/difficulty), daily challenge board, ghost race vs today's best daily run
- PWA with "New version available – Update" prompt

## Code map
- `src/App.tsx` – main screen, modals, screens (game / versus / online / editor)
- `src/hooks/useSnakeGame.ts` – single-player engine (modes, scoring, seeded RNG for daily)
- `src/game/versus.ts` – deterministic 2-player rules (seeded food, wrap, power-ups)
- `src/game/rollback.ts` – rollback netcode session (prediction, rewind/replay, input delay, `inputDelayFor`)
- `src/components/` – `Board` (stars, snake SVG layer, items), `VersusView` (2P UI), `VersusScreen` (local), `OnlineVersus` (online), `OnlineLobby`, modals, `UpdatePrompt`
- `src/online/` – `client.ts` (Supabase, optional), `room.ts` (realtime rooms + presence), `quickMatch.ts`, `worldLeaderboard.ts`
- `src/features/` – achievements, leaderboard (device), replay recorder, custom levels, skins/themes
- `src/utils/game.utils.ts` – grid helpers, `gridForArea`, `dailyChallenge`, `seededRandom`, `todayKey`
- `src/utils/storage.ts` – safe `localStorage` JSON helpers (always use these)

## Backend (Supabase)
- Project ref `uujhzxapilbqkdcqijpn` (region eu-west-3). Public URL + anon key are GitHub repo **variables** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (never use the service_role key in the app).
- `supabase/migrations/` – `scores` (RLS: read-only for browsers), `score_submissions` (rate limit), `submit_best_score()`, `daily_scores` (+ `replay` path for ghosts), `submit_daily_score()`.
- `supabase/functions/submit-score/` – the **only** way to write scores: `validate.ts` (plausibility rules, must match game constants – a test checks this), rate limit 5/min per IP hash, routes daily scores. Ghost paths checked by `cleanGhostPath`.
- Online play uses Supabase Realtime broadcast + presence only (no server game code).
- **Deploy backend** (the user approved "deploy as needed"): push the migration, then deploy the function seconds later, then merge the PR:
  ```bash
  npx supabase db push --linked --yes
  npx supabase functions deploy submit-score --project-ref uujhzxapilbqkdcqijpn --use-api
  ```
  Verify on the cloud with a clearly named test row (e.g. `zz-…-test`) and delete it afterwards with `npx supabase db query --linked "delete …"`.
- Local backend: Docker + `npx supabase start -x storage-api,imgproxy,logflare,vector,studio,postgres-meta,mailpit,supavisor`; `.env.local` (git-ignored) points at it. After editing the function locally: `docker restart supabase_edge_runtime_snake-game`. `npx supabase migration up --local` for new migrations.

## How we work
- **Node 22** (`nvm use`; default system Node 16 is too old). Run `npx tsc --noEmit` and `npm test` before committing.
- `master` is **protected**: changes only via pull requests that pass the `test` check (`.github/workflows/ci.yml`). No force pushes.
- One feature = one branch + one PR. The user approved: merge each PR yourself once checks pass, and deploy backend changes as needed.
- **No AI attribution**: no `Co-Authored-By` lines, no "Generated with Claude Code" in commits or PRs. Commit as `malek-95 <79643089+malek-95@users.noreply.github.com>` (already the global git config).
- Commit messages and PR descriptions: plain English, explain the why, list testing.
- Tests: Vitest (`npm test`). Live backend tests in `src/online/online.test.ts` skip without Supabase env; they respect the 5/min rate limit (wait ~60s between runs). For UI checks we drive headless Chrome via the DevTools protocol (scripts in the session scratchpad).
- The user writes in mixed French/English and is not deeply technical: keep explanations short and plain.

## Remaining roadmap (from "what to add for more online fun")
Done: reactions + rematch, daily challenge, power-ups, ghost race, quick match.
Left:
1. **Username accounts + ranked ladder** – user chose *username only*: Supabase anonymous sign-in + unique username table; ranked 1v1 rating (Elo) updated server-side after online matches (needs anonymous sign-ins enabled on the project and a result-reporting path both players agree on).
2. **3–4 player party matches** – generalize `versus.ts` / `rollback.ts` from 2 to N players.

## Known limits
- Scores are plausibility-checked, not proven (single player runs in the browser).
- Players are identified by name until accounts exist (two "Ali"s share an entry).
- Supabase free tier pauses after ~1 week without activity.
