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
}

/** Top 10 for one mode and difficulty, best first (earlier wins ties). */
export const fetchWorldTop = async (mode: GameMode, difficulty: Difficulty): Promise<WorldEntry[]> => {
  if (!supabase) return [];
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

/** Sends a score to the world board. Throws when the server can't be reached or rejects it. */
export const submitWorldScore = async (s: WorldScore): Promise<void> => {
  if (!supabase) return;
  const { error } = await supabase.from('scores').insert({
    name: cleanName(s.name),
    mode: s.mode,
    difficulty: s.difficulty,
    score: Math.round(s.score),
    apples: Math.round(s.apples),
    level: s.level ?? null,
  });
  if (error) throw error;
};
