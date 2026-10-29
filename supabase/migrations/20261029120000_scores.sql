-- World leaderboard: one row per submitted score.
create table public.scores (
  id          bigint generated always as identity primary key,
  name        text        not null check (char_length(btrim(name)) between 1 and 16),
  mode        text        not null check (mode in ('classic', 'levels', 'timeAttack', 'survival', 'zen', 'golden', 'custom')),
  difficulty  text        not null check (difficulty in ('easy', 'medium', 'hard')),
  score       integer     not null check (score between 1 and 1000000),
  apples      integer     not null check (apples between 0 and 10000),
  level       integer              check (level between 1 and 1000),
  created_at  timestamptz not null default now()
);

-- Top-10 lookups per mode and difficulty.
create index scores_board_idx on public.scores (mode, difficulty, score desc);

-- Row level security: anyone may read and add scores; nobody may edit or delete them.
-- shortcut: scores are self-reported by the browser, so a determined player can post a fake one;
-- add a server-side check (e.g. an Edge Function validating replays) if cheating becomes a problem.
alter table public.scores enable row level security;

create policy "scores are public" on public.scores
  for select to anon, authenticated using (true);

create policy "anyone can add a score" on public.scores
  for insert to anon, authenticated with check (true);

-- Only expose what the game needs to the public API roles.
revoke all on public.scores from anon, authenticated;
grant select (id, name, mode, difficulty, score, apples, level, created_at) on public.scores to anon, authenticated;
grant insert (name, mode, difficulty, score, apples, level) on public.scores to anon, authenticated;
