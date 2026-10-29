import { useCallback, useState } from 'react';
import { loadJSON, saveJSON } from '../utils/storage';
import type { Difficulty, GameMode } from '../types/game.types';

export interface ScoreEntry {
  name: string;
  score: number;
  apples: number;
  level?: number;
  date: string;
}

export type Boards = Record<string, ScoreEntry[]>;

export const MAX_ENTRIES = 10;
const BOARDS_KEY = 'snake-leaderboard';
const NAME_KEY = 'snake-player-name';

// The daily challenge gets a fresh board every day.
export const boardKey = (mode: GameMode, difficulty: Difficulty) =>
  mode === 'daily' ? `daily:${new Date().toISOString().slice(0, 10)}` : `${mode}:${difficulty}`;

/** Would this score make the top 10? */
export const qualifies = (entries: ScoreEntry[], score: number) =>
  score > 0 && (entries.length < MAX_ENTRIES || score > entries[entries.length - 1].score);

/** Players are told apart by name (no accounts), ignoring case and spaces around it. */
export const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * Adds a score, keeping one entry per player: their best. A lower score than their best changes
 * nothing; a higher one replaces it. The list stays sorted (ties keep the older entry first) and capped.
 */
export const insertScore = (entries: ScoreEntry[], entry: ScoreEntry): ScoreEntry[] => {
  const mine = entries.find(e => sameName(e.name, entry.name));
  if (mine && mine.score >= entry.score) return entries;
  return [...entries.filter(e => e !== mine), entry].sort((a, b) => b.score - a.score).slice(0, MAX_ENTRIES);
};

/** Boards saved by older versions can hold several entries per player: keep each player's best. */
export const bestPerName = (entries: ScoreEntry[]): ScoreEntry[] =>
  [...entries].sort((a, b) => b.score - a.score).filter((e, i, all) => all.findIndex(o => sameName(o.name, e.name)) === i);

const isBoards = (v: unknown) =>
  !!v && typeof v === 'object' && !Array.isArray(v) &&
  Object.values(v as object).every(list => Array.isArray(list) && list.every(e => typeof e?.score === 'number' && typeof e?.name === 'string'));

export const cleanName = (name: string) => name.trim().slice(0, 16) || '???';

export const useLeaderboard = () => {
  const [boards, setBoards] = useState<Boards>(() =>
    Object.fromEntries(Object.entries(loadJSON<Boards>(BOARDS_KEY, {}, isBoards)).map(([k, list]) => [k, bestPerName(list)])));
  const [playerName, setPlayerNameState] = useState(() => loadJSON(NAME_KEY, '', v => typeof v === 'string'));

  /** Saves a score; returns the 1-based rank of this player's best on the board (0 if not on it). */
  const addScore = useCallback((key: string, entry: ScoreEntry) => {
    const saved = { ...entry, name: cleanName(entry.name) };
    const list = insertScore(boards[key] ?? [], saved);
    const all = { ...boards, [key]: list };
    setBoards(all);
    saveJSON(BOARDS_KEY, all);
    setPlayerNameState(saved.name);
    saveJSON(NAME_KEY, saved.name);
    return list.findIndex(e => sameName(e.name, saved.name)) + 1;
  }, [boards]);

  return { boards, playerName, addScore };
};
