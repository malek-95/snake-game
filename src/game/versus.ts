import type { Direction, Grid, Position } from '../types/game.types';
import { getNextPosition, getOppositeDirection, isOutOfBounds } from '../utils/game.utils';
import { MAX_DIRECTION_QUEUE } from '../constants/game.constants';

/**
 * 2-player rules as pure functions. Food placement uses a seed stored in the state, so the same
 * starting state and the same turns always give the same game: online players can each run
 * the match locally and stay identical (see rollback.ts).
 */

export interface Player {
  body: Position[];
  dir: Direction;
  queue: Direction[];
  alive: boolean;
  apples: number;
}

export type RoundResult = 0 | 1 | 'draw' | null;

export interface VersusState {
  grid: Grid;
  players: [Player, Player];
  food: Position;
  /** Winner of the round that just ended; null while it's running. */
  result: RoundResult;
  wins: [number, number];
  /** Random generator state for food placement. */
  seed: number;
}

/** Turns made by each player on one tick (null = kept going straight). */
export type TickInputs = [Direction | null, Direction | null];

export const WINS_NEEDED = 3;

/** mulberry32: a tiny seeded random generator. Returns [value in 0..1, next seed]. */
export const nextRandom = (seed: number): [number, number] => {
  const t = (seed + 0x6d2b79f5) | 0;
  let r = Math.imul(t ^ (t >>> 15), 1 | t);
  r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
  return [((r ^ (r >>> 14)) >>> 0) / 4294967296, t];
};

export const randomSeed = () => Math.floor(Math.random() * 2 ** 31);

/** Picks a free cell with the seeded generator. Returns [cell, next seed]. */
const placeFood = (taken: Position[], grid: Grid, seed: number): [Position, number] => {
  const used = new Set(taken.map(p => `${p.x},${p.y}`));
  const free: Position[] = [];
  for (let y = 0; y < grid.rows; y++) for (let x = 0; x < grid.cols; x++) if (!used.has(`${x},${y}`)) free.push({ x, y });
  const [r, next] = nextRandom(seed);
  return [free.length ? free[Math.floor(r * free.length)] : { x: -1, y: -1 }, next];
};

const makePlayer = (x: number, y: number, dir: Direction): Player => {
  const step = dir === 'RIGHT' ? -1 : 1;
  return { body: [0, 1, 2].map(i => ({ x: x + i * step, y })), dir, queue: [], alive: true, apples: 0 };
};

/** New round: player 1 on the left heading right, player 2 on the right heading left, on different rows. */
export const newRound = (grid: Grid, wins: [number, number] = [0, 0], seed = randomSeed()): VersusState => {
  const p1 = makePlayer(4, Math.floor(grid.rows / 3), 'RIGHT');
  const p2 = makePlayer(grid.cols - 5, Math.floor((grid.rows * 2) / 3), 'LEFT');
  const [food, next] = placeFood([...p1.body, ...p2.body], grid, seed);
  return { grid, players: [p1, p2], food, result: null, wins, seed: next };
};

export const queueTurn = (state: VersusState, player: 0 | 1, dir: Direction): VersusState => {
  const p = state.players[player];
  const last = p.queue.length ? p.queue[p.queue.length - 1] : p.dir;
  if (dir === last || dir === getOppositeDirection(last) || p.queue.length >= MAX_DIRECTION_QUEUE) return state;
  const players = [...state.players] as [Player, Player];
  players[player] = { ...p, queue: [...p.queue, dir] };
  return { ...state, players };
};

const same = (a: Position, b: Position) => a.x === b.x && a.y === b.y;

/** Advances both snakes one cell and resolves crashes, food and the round result. */
export const stepVersus = (state: VersusState): VersusState => {
  if (state.result !== null) return state;

  const moves = state.players.map(p => {
    const dir = p.queue[0] ?? p.dir;
    const head = getNextPosition(p.body[0], dir);
    return { dir, queue: p.queue.slice(1), head, eats: same(head, state.food) };
  });

  // Bodies after this tick: a snake that doesn't eat frees its tail cell.
  const nextBodies = state.players.map((p, i) =>
    moves[i].eats ? [moves[i].head, ...p.body] : [moves[i].head, ...p.body.slice(0, -1)]);

  const crashed = moves.map((m, i) => {
    if (isOutOfBounds(m.head, state.grid)) return true;
    const own = nextBodies[i].slice(1);
    const other = nextBodies[1 - i];
    return own.some(c => same(c, m.head)) || other.some(c => same(c, m.head));
  });
  // Swapping places head-on also counts as a crash for both.
  if (same(moves[0].head, state.players[1].body[0]) && same(moves[1].head, state.players[0].body[0])) {
    crashed[0] = crashed[1] = true;
  }

  const players = state.players.map((p, i) => ({
    ...p,
    dir: moves[i].dir,
    queue: moves[i].queue,
    body: crashed[i] ? p.body : nextBodies[i],
    alive: !crashed[i],
    apples: p.apples + (moves[i].eats && !crashed[i] ? 1 : 0),
  })) as [Player, Player];

  let food = state.food;
  let seed = state.seed;
  if (moves.some((m, i) => m.eats && !crashed[i])) {
    [food, seed] = placeFood([...players[0].body, ...players[1].body], state.grid, state.seed);
  }

  let result: RoundResult = null;
  const wins = [...state.wins] as [number, number];
  if (crashed[0] && crashed[1]) result = 'draw';
  else if (crashed[0]) result = 1;
  else if (crashed[1]) result = 0;
  if (result === 0 || result === 1) wins[result] += 1;

  return { ...state, players, food, result, wins, seed };
};

/** One tick with the given turns: what both online players compute independently. */
export const advance = (state: VersusState, inputs: TickInputs): VersusState => {
  let s = state;
  if (inputs[0]) s = queueTurn(s, 0, inputs[0]);
  if (inputs[1]) s = queueTurn(s, 1, inputs[1]);
  return stepVersus(s);
};

/** Short fingerprint of a state, to check both players still see the same game. */
export const hashState = (s: VersusState): number => {
  const text = JSON.stringify([s.players.map(p => [p.body, p.dir, p.alive, p.apples]), s.food, s.result, s.wins, s.seed]);
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193);
  return h >>> 0;
};

export const matchWinner = (state: VersusState): 0 | 1 | null =>
  state.wins[0] >= WINS_NEEDED ? 0 : state.wins[1] >= WINS_NEEDED ? 1 : null;
