import { useEffect, useRef, useState } from 'react';
import { loadJSON, saveJSON } from '../utils/storage';
import type { Difficulty, GameMode, GameState, Grid, Position } from '../types/game.types';

/** One recorded tick. Cells are stored as y * cols + x to keep saved replays small. */
export interface Frame {
  t: number;        // ms since the game started (pauses capped)
  s: number[];      // snake
  f: number;        // food
  g?: number;       // golden apple
  o?: number[];     // obstacles, only on frames where they changed
  sc: number;       // score
}

export interface Replay {
  mode: GameMode;
  difficulty: Difficulty;
  grid: Grid;
  score: number;
  apples: number;
  date: string;
  frames: Frame[];
}

const LAST_KEY = 'snake-last-replay';
const BEST_KEY = 'snake-best-replay';
// shortcut: very long games stop recording after this many ticks; stream to IndexedDB if that ever matters.
export const MAX_FRAMES = 6000;
const MAX_GAP_MS = 300;

export const encodeCell = (p: Position, grid: Grid) => p.y * grid.cols + p.x;
export const decodeCell = (n: number, grid: Grid): Position => ({ x: n % grid.cols, y: Math.floor(n / grid.cols) });

/** Obstacles in effect at frame i (they're only stored when they change). */
export const obstaclesAt = (frames: Frame[], i: number): number[] => {
  for (let k = i; k >= 0; k--) if (frames[k].o) return frames[k].o!;
  return [];
};

const isReplay = (v: unknown) =>
  !!v && Array.isArray((v as Replay).frames) && typeof (v as Replay).grid?.cols === 'number';

interface RecorderInput {
  gameId: number;
  gameState: GameState;
  gameMode: GameMode;
  difficulty: Difficulty;
  grid: Grid;
  snake: Position[];
  food: Position;
  goldenFood: Position | null;
  obstacles: Position[];
  score: number;
  applesEaten: number;
}

/** Records every tick of the running game and keeps the last and best replays. */
export const useReplayRecorder = (game: RecorderInput) => {
  const [lastReplay, setLastReplay] = useState<Replay | null>(() => loadJSON<Replay | null>(LAST_KEY, null, isReplay));
  const [bestReplay, setBestReplay] = useState<Replay | null>(() => loadJSON<Replay | null>(BEST_KEY, null, isReplay));

  const frames = useRef<Frame[]>([]);
  const clock = useRef({ t: 0, wall: 0 });
  const lastObstacles = useRef<Position[] | null>(null);

  // New game: start a fresh recording.
  useEffect(() => {
    frames.current = [];
    clock.current = { t: 0, wall: performance.now() };
    lastObstacles.current = null;
  }, [game.gameId]);

  // Each snake change while playing is one tick.
  useEffect(() => {
    if (game.gameState !== 'playing' || frames.current.length >= MAX_FRAMES) return;
    const now = performance.now();
    clock.current.t += Math.min(now - clock.current.wall, MAX_GAP_MS);
    clock.current.wall = now;
    const frame: Frame = {
      t: Math.round(clock.current.t),
      s: game.snake.map(p => encodeCell(p, game.grid)),
      f: encodeCell(game.food, game.grid),
      sc: game.score,
    };
    if (game.goldenFood) frame.g = encodeCell(game.goldenFood, game.grid);
    if (game.obstacles !== lastObstacles.current) {
      frame.o = game.obstacles.map(p => encodeCell(p, game.grid));
      lastObstacles.current = game.obstacles;
    }
    frames.current.push(frame);
  }, [game.snake]); // eslint-disable-line react-hooks/exhaustive-deps

  // Game over: keep the recording.
  const prevState = useRef(game.gameState);
  useEffect(() => {
    const ended = game.gameState === 'gameover' && prevState.current !== 'gameover';
    prevState.current = game.gameState;
    if (!ended || frames.current.length < 2) return;
    const replay: Replay = {
      mode: game.gameMode,
      difficulty: game.difficulty,
      grid: game.grid,
      score: game.score,
      apples: game.applesEaten,
      date: new Date().toISOString(),
      frames: frames.current,
    };
    setLastReplay(replay);
    saveJSON(LAST_KEY, replay);
    if (!bestReplay || replay.score > bestReplay.score) {
      setBestReplay(replay);
      saveJSON(BEST_KEY, replay);
    }
  }, [game.gameState]); // eslint-disable-line react-hooks/exhaustive-deps

  return { lastReplay, bestReplay };
};
