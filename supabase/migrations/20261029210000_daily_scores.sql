-- Daily challenge board: one best score per player per day (UTC).
create table public.daily_scores (
  id         bigint generated always as identity primary key,
  day        date        not null default (now() at time zone 'utc')::date,
  name       text        not null check (char_length(btrim(name)) between 1 and 16),
  score      integer     not null check (score between 1 and 1000000),
  apples     integer     not null check (apples between 0 and 10000),
  created_at timestamptz not null default now()
);
create unique index daily_scores_one_per_player on public.daily_scores (day, lower(btrim(name)));
create index daily_scores_board_idx on public.daily_scores (day, score desc);

-- Anyone can read; only the submit-score server function writes.
alter table public.daily_scores enable row level security;
create policy "daily scores are public" on public.daily_scores for select to anon, authenticated using (true);
revoke all on public.daily_scores from anon, authenticated;
grant select (id, day, name, score, apples, created_at) on public.daily_scores to anon, authenticated;

-- Saves today's score only if it beats the player's best today. Returns true when it did.
create function public.submit_daily_score(p_name text, p_score integer, p_apples integer)
returns boolean
language sql
set search_path = ''
as $$
  with saved as (
    insert into public.daily_scores (day, name, score, apples)
    values ((now() at time zone 'utc')::date, p_name, p_score, p_apples)
    on conflict (day, lower(btrim(name))) do update
      set name = excluded.name, score = excluded.score, apples = excluded.apples, created_at = now()
      where excluded.score > public.daily_scores.score
    returning 1
  )
  select exists (select 1 from saved);
$$;

revoke execute on function public.submit_daily_score(text, integer, integer) from public, anon, authenticated;
grant execute on function public.submit_daily_score(text, integer, integer) to service_role;
