import { supabase } from './client';
import { cleanName } from '../features/leaderboard';
import type { Difficulty, GameMode } from '../types/game.types';

export interface WorldEntry {
  name: string;
  score: number;
  apples: number;
  level: number | null;
  created_at: string;
}

export interface WorldScore {
  name: string;
  mode: GameMode;
  difficulty: Difficulty;
  score: number;
  apples: number;
  level?: number;
  /** Golden apples eaten (golden mode). */
  golden: number;
  /** How long the game lasted; the server rejects impossibly fast games. */
  durationMs: number;
}

/** Top 10 for one mode and difficulty, best first (earlier wins ties). */
export const fetchWorldTop = async (mode: GameMode, difficulty: Difficulty): Promise<WorldEntry[]> => {
  if (!supabase) return [];
  if (mode === 'daily') {
    // Today's daily challenge board (UTC day, like the challenge itself).
    const { data, error } = await supabase
      .from('daily_scores')
      .select('name, score, apples, created_at')
      .eq('day', new Date().toISOString().slice(0, 10))
      .order('score', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(10);
    if (error) throw error;
    return data.map(r => ({ ...r, level: null }));
  }
  const { data, error } = await supabase
    .from('scores')
    .select('name, score, apples, level, created_at')
    .eq('mode', mode)
    .eq('difficulty', difficulty)
    .order('score', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(10);
  if (error) throw error;
  return data;
};

/**
 * Sends a score to the world board through the submit-score server function, which checks it and
 * keeps only each player's best. Returns false when the player's best was already higher.
 * Throws when the server can't be reached or rejects the score.
 */
export const submitWorldScore = async (s: WorldScore): Promise<boolean> => {
  if (!supabase) return false;
  const { data, error } = await supabase.functions.invoke('submit-score', {
    body: {
      name: cleanName(s.name),
      mode: s.mode,
      difficulty: s.difficulty,
      score: Math.round(s.score),
      apples: Math.round(s.apples),
      golden: s.golden,
      durationMs: Math.round(s.durationMs),
      level: s.level ?? null,
    },
  });
  if (error) throw error;
  return data?.improved !== false;
};
