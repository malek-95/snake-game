// Edge Function: the only way to add a world leaderboard score.
// Checks the score is possible (validate.ts), limits how often one connection can post, then keeps it
// only if it beats the player's best (one score per player per mode and difficulty).
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { validateScore, cleanGhostPath } from './validate.ts';

const MAX_PER_MINUTE = 5;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const reply = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

// Only a salted hash of the IP is stored, never the IP itself.
const hashIp = async (ip: string, salt: string) => {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${salt}:${ip}`));
  return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('');
};

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return reply({ error: 'method' }, 405);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return reply({ error: 'body' }, 400);
  }

  const check = validateScore(body);
  if (!check.ok) return reply({ error: check.error }, 422);

  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey, { auth: { persistSession: false } });

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
  const ipHash = await hashIp(ip, serviceKey);
  const since = new Date(Date.now() - 60_000).toISOString();
  const { count, error: countError } = await admin
    .from('score_submissions')
    .select('id', { count: 'exact', head: true })
    .eq('ip_hash', ipHash)
    .gte('created_at', since);
  if (countError) return reply({ error: 'server' }, 500);
  if ((count ?? 0) >= MAX_PER_MINUTE) return reply({ error: 'too many' }, 429);

  const { error: logError } = await admin.from('score_submissions').insert({ ip_hash: ipHash });
  if (logError) return reply({ error: 'server' }, 500);

  const { row } = check;
  // Daily challenge scores go to today's board (the day is set by the database, not the browser).
  const { data: improved, error } = row.mode === 'daily'
    ? await admin.rpc('submit_daily_score', {
      p_name: row.name, p_score: row.score, p_apples: row.apples,
      p_replay: cleanGhostPath((body as { replay?: unknown }).replay), // the run's path, for ghost races
    })
    : await admin.rpc('submit_best_score', {
      p_name: row.name, p_mode: row.mode, p_difficulty: row.difficulty,
      p_score: row.score, p_apples: row.apples, p_level: row.level,
    });
  if (error) return reply({ error: 'server' }, 500);
  return reply({ ok: true, improved: improved === true }, 201);
});
