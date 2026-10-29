-- Username accounts (anonymous sign-in) and a ranked 1v1 ladder.

-- One profile per signed-in browser. The username is unique, ignoring case.
create table public.profiles (
  id         uuid primary key references auth.users on delete cascade,
  username   text not null check (char_length(username) between 1 and 16 and username = btrim(username) and username !~ '[[:cntrl:]]'),
  rating     integer not null default 1000,
  wins       integer not null default 0,
  losses     integer not null default 0,
  created_at timestamptz not null default now()
);
create unique index profiles_username_unique on public.profiles (lower(username));
create index profiles_ladder_idx on public.profiles (rating desc);

-- Anyone can read the ladder; writes only go through the functions below (so nobody can set their own rating).
alter table public.profiles enable row level security;
create policy "profiles are public" on public.profiles for select to anon, authenticated using (true);
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to anon, authenticated;

-- Creates or renames my profile. A taken name fails with unique_violation (23505).
create function public.set_username(p_username text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  insert into public.profiles (id, username) values (auth.uid(), btrim(p_username))
  on conflict (id) do update set username = excluded.username;
end;
$$;
revoke execute on function public.set_username(text) from public, anon;
grant execute on function public.set_username(text) to authenticated;

-- Each player reports who won a match. Ratings only change once both reports agree.
create table public.ranked_reports (
  match_id   text not null check (char_length(match_id) between 8 and 64),
  reporter   uuid not null references public.profiles on delete cascade,
  opponent   uuid not null references public.profiles on delete cascade,
  winner     uuid not null,
  created_at timestamptz not null default now(),
  primary key (match_id, reporter),
  check (reporter <> opponent),
  check (winner in (reporter, opponent))
);
-- Settled matches, so a match never counts twice.
create table public.ranked_matches (
  match_id   text primary key,
  winner     uuid not null,
  loser      uuid not null,
  delta      integer not null,
  created_at timestamptz not null default now()
);
alter table public.ranked_reports enable row level security;
alter table public.ranked_matches enable row level security;
revoke all on public.ranked_reports, public.ranked_matches from anon, authenticated;

-- Records my report of a match. Returns {status: 'waiting' | 'mismatch' | 'done', rating, delta}.
-- Elo with K = 32, the same formula as src/game/elo.ts (a test checks they agree).
create function public.report_ranked_result(p_match text, p_opponent uuid, p_winner uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  mine public.ranked_reports;
  theirs public.ranked_reports;
  settled public.ranked_matches;
  w public.profiles;
  l public.profiles;
  d integer;
begin
  if me is null then raise exception 'not signed in'; end if;
  -- Both players' reports for one match are handled one after the other, so each sees the other's.
  perform pg_advisory_xact_lock(hashtext(p_match));

  -- The first report counts; sending again only checks the status.
  insert into public.ranked_reports (match_id, reporter, opponent, winner)
  values (p_match, me, p_opponent, p_winner)
  on conflict do nothing;
  select * into mine from public.ranked_reports where match_id = p_match and reporter = me;
  select * into theirs from public.ranked_reports where match_id = p_match and reporter = mine.opponent and opponent = me;
  if not found then
    return jsonb_build_object('status', 'waiting');
  end if;
  if theirs.winner <> mine.winner then
    return jsonb_build_object('status', 'mismatch');
  end if;

  select * into settled from public.ranked_matches where match_id = p_match;
  if not found then
    select * into w from public.profiles where id = mine.winner for update;
    select * into l from public.profiles where id = (case when mine.winner = me then mine.opponent else me end) for update;
    d := floor(32 * (1 - 1 / (1 + power(10, (l.rating - w.rating) / 400.0))) + 0.5);
    update public.profiles set rating = rating + d, wins = wins + 1 where id = w.id;
    update public.profiles set rating = rating - d, losses = losses + 1 where id = l.id;
    insert into public.ranked_matches (match_id, winner, loser, delta)
    values (p_match, w.id, l.id, d)
    returning * into settled;
  end if;

  return jsonb_build_object(
    'status', 'done',
    'rating', (select rating from public.profiles where id = me),
    'delta', case when settled.winner = me then settled.delta else -settled.delta end
  );
end;
$$;
revoke execute on function public.report_ranked_result(text, uuid, uuid) from public, anon;
grant execute on function public.report_ranked_result(text, uuid, uuid) to authenticated;
