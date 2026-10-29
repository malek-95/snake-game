-- Scores now only arrive through the submit-score Edge Function, which checks them first.
drop policy "anyone can add a score" on public.scores;
revoke insert on public.scores from anon, authenticated;

-- Recent submissions per connection, for the function's rate limit. Only a salted hash of the IP is kept.
-- shortcut: old rows are never deleted; add a scheduled cleanup (pg_cron) if the table ever gets large.
create table public.score_submissions (
  id         bigint generated always as identity primary key,
  ip_hash    text        not null,
  created_at timestamptz not null default now()
);
create index score_submissions_recent_idx on public.score_submissions (ip_hash, created_at desc);

-- No policies: browsers can't touch it; the function uses the service role, which bypasses RLS.
alter table public.score_submissions enable row level security;
revoke all on public.score_submissions from anon, authenticated;
