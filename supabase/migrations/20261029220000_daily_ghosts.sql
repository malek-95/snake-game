-- Ghost race: keep the path of each player's best daily run, so others can race it.
-- replay = one list of snake cells (y * 20 + x, head first) per tick.
alter table public.daily_scores add column replay jsonb;
grant select (replay) on public.daily_scores to anon, authenticated;

drop function public.submit_daily_score(text, integer, integer);

-- Saves today's score (and its path) only if it beats the player's best today. Returns true when it did.
create function public.submit_daily_score(p_name text, p_score integer, p_apples integer, p_replay jsonb)
returns boolean
language sql
set search_path = ''
as $$
  with saved as (
    insert into public.daily_scores (day, name, score, apples, replay)
    values ((now() at time zone 'utc')::date, p_name, p_score, p_apples, p_replay)
    on conflict (day, lower(btrim(name))) do update
      set name = excluded.name, score = excluded.score, apples = excluded.apples,
          replay = excluded.replay, created_at = now()
      where excluded.score > public.daily_scores.score
    returning 1
  )
  select exists (select 1 from saved);
$$;

revoke execute on function public.submit_daily_score(text, integer, integer, jsonb) from public, anon, authenticated;
grant execute on function public.submit_daily_score(text, integer, integer, jsonb) to service_role;
