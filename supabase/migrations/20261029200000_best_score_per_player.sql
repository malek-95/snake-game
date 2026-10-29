-- One world score per player per mode and difficulty: their best.
-- Players are told apart by name (no accounts), ignoring case and spaces around it.

-- Merge existing duplicates, keeping each player's best (the earlier one on a tie).
delete from public.scores s
using public.scores t
where lower(btrim(s.name)) = lower(btrim(t.name))
  and s.mode = t.mode
  and s.difficulty = t.difficulty
  and (s.score < t.score or (s.score = t.score and s.id > t.id));

create unique index scores_one_per_player on public.scores (lower(btrim(name)), mode, difficulty);

-- Saves a score only if it beats the player's best. Returns true when it did.
create function public.submit_best_score(
  p_name text, p_mode text, p_difficulty text, p_score integer, p_apples integer, p_level integer
) returns boolean
language sql
set search_path = ''
as $$
  with saved as (
    insert into public.scores (name, mode, difficulty, score, apples, level)
    values (p_name, p_mode, p_difficulty, p_score, p_apples, p_level)
    on conflict (lower(btrim(name)), mode, difficulty) do update
      set name = excluded.name, score = excluded.score, apples = excluded.apples,
          level = excluded.level, created_at = now()
      where excluded.score > public.scores.score
    returning 1
  )
  select exists (select 1 from saved);
$$;

-- Only the submit-score server function (service role) may call it.
revoke execute on function public.submit_best_score(text, text, text, integer, integer, integer) from public, anon, authenticated;
grant execute on function public.submit_best_score(text, text, text, integer, integer, integer) to service_role;
