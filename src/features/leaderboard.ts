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

export const boardKey = (mode: GameMode, difficulty: Difficulty) => `${mode}:${difficulty}`;

/** Would this score make the top 10? */
export const qualifies = (entries: ScoreEntry[], score: number) =>
  score > 0 && (entries.length < MAX_ENTRIES || score > entries[entries.length - 1].score);

/** Adds an entry, keeping the list sorted (ties keep the older entry first) and capped. */
export const insertScore = (entries: ScoreEntry[], entry: ScoreEntry): ScoreEntry[] =>
  [...entries, entry].sort((a, b) => b.score - a.score).slice(0, MAX_ENTRIES);

const isBoards = (v: unknown) =>
  !!v && typeof v === 'object' && !Array.isArray(v) &&
  Object.values(v as object).every(list => Array.isArray(list) && list.every(e => typeof e?.score === 'number' && typeof e?.name === 'string'));

export const cleanName = (name: string) => name.trim().slice(0, 16) || '???';

export const useLeaderboard = () => {
  const [boards, setBoards] = useState<Boards>(() => loadJSON(BOARDS_KEY, {}, isBoards));
  const [playerName, setPlayerNameState] = useState(() => loadJSON(NAME_KEY, '', v => typeof v === 'string'));

  /** Saves a score and returns its 1-based rank, or 0 if it didn't make the board. */
  const addScore = useCallback((key: string, entry: ScoreEntry) => {
    const saved = { ...entry, name: cleanName(entry.name) };
    const list = insertScore(boards[key] ?? [], saved);
    const all = { ...boards, [key]: list };
    setBoards(all);
    saveJSON(BOARDS_KEY, all);
    setPlayerNameState(saved.name);
    saveJSON(NAME_KEY, saved.name);
    return list.indexOf(saved) + 1;
  }, [boards]);

  return { boards, playerName, addScore };
};
