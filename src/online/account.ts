import { useCallback, useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from './client';
import { cleanUsername } from '../game/elo';

export interface Profile {
  id: string;
  username: string;
  rating: number;
  wins: number;
  losses: number;
}

export type UsernameError = 'invalid' | 'taken' | 'failed';
export type RankedResult = { status: 'waiting' } | { status: 'mismatch' } | { status: 'done'; rating: number; delta: number };

const PROFILE_COLUMNS = 'id, username, rating, wins, losses';

/** My profile, or null when this browser has no account yet. */
export const fetchMyProfile = async (client: SupabaseClient | null = supabase): Promise<Profile | null> => {
  if (!client) return null;
  const { data: { session } } = await client.auth.getSession();
  if (!session) return null;
  const { data } = await client.from('profiles').select(PROFILE_COLUMNS).eq('id', session.user.id).maybeSingle();
  return data;
};

/**
 * Picks or changes my username. The first time, this browser gets an anonymous account
 * (no email or password: the account lives in this browser).
 */
export const saveUsername = async (raw: string, client: SupabaseClient | null = supabase): Promise<Profile> => {
  const name = cleanUsername(raw);
  if (!name) throw 'invalid' satisfies UsernameError;
  if (!client) throw 'failed' satisfies UsernameError;
  const { data: { session } } = await client.auth.getSession();
  if (!session) {
    const { error } = await client.auth.signInAnonymously();
    if (error) throw 'failed' satisfies UsernameError;
  }
  const { error } = await client.rpc('set_username', { p_username: name });
  if (error) throw (error.code === '23505' ? 'taken' : error.code === '23514' ? 'invalid' : 'failed') satisfies UsernameError;
  const profile = await fetchMyProfile(client);
  if (!profile) throw 'failed' satisfies UsernameError;
  return profile;
};

/** Top ranked players (those who finished at least one ranked match), best first. */
export const fetchLadder = async (limit = 20): Promise<Profile[]> => {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .or('wins.gt.0,losses.gt.0')
    .order('rating', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(limit);
  if (error) throw error;
  return data;
};

/**
 * Reports who won a ranked match. Ratings change on the server only once both players reported
 * the same winner; until then the status is 'waiting', so this asks again a few times.
 */
export const reportRankedResult = async (
  matchId: string, opponentId: string, winnerId: string,
  client: SupabaseClient | null = supabase, tries = 6, waitMs = 2000,
): Promise<RankedResult> => {
  if (!client) return { status: 'mismatch' };
  for (let i = 0; ; i++) {
    const { data, error } = await client.rpc('report_ranked_result', { p_match: matchId, p_opponent: opponentId, p_winner: winnerId });
    if (error) throw error;
    const result = data as RankedResult;
    if (result.status !== 'waiting' || i >= tries - 1) return result;
    await new Promise(r => setTimeout(r, waitMs));
  }
};

/** My profile, kept in React state; `rename` saves a new username. */
export const useProfile = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const refresh = useCallback(() => {
    fetchMyProfile().then(setProfile).catch(() => {});
  }, []);
  useEffect(refresh, [refresh]);
  const rename = useCallback(async (name: string) => setProfile(await saveUsername(name)), []);
  return { profile, rename, refresh };
};
