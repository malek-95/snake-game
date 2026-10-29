import type { Direction, Grid, Position } from '../types/game.types';
import { getNextPosition, getOppositeDirection, getRandomPosition, isOutOfBounds } from '../utils/game.utils';
import { MAX_DIRECTION_QUEUE } from '../constants/game.constants';

/** Local 2-player rules, as pure functions (apart from random food placement). */

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
}

export const WINS_NEEDED = 3;

const makePlayer = (x: number, y: number, dir: Direction): Player => {
  const step = dir === 'RIGHT' ? -1 : 1;
  return { body: [0, 1, 2].map(i => ({ x: x + i * step, y })), dir, queue: [], alive: true, apples: 0 };
};

/** New round: player 1 on the left heading right, player 2 on the right heading left, on different rows. */
export const newRound = (grid: Grid, wins: [number, number] = [0, 0]): VersusState => {
  const p1 = makePlayer(4, Math.floor(grid.rows / 3), 'RIGHT');
  const p2 = makePlayer(grid.cols - 5, Math.floor((grid.rows * 2) / 3), 'LEFT');
  const food = getRandomPosition([...p1.body, ...p2.body], [], grid);
  return { grid, players: [p1, p2], food, result: null, wins };
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

  const food = moves.some((m, i) => m.eats && !crashed[i])
    ? getRandomPosition([...players[0].body, ...players[1].body], [], state.grid)
    : state.food;

  let result: RoundResult = null;
  const wins = [...state.wins] as [number, number];
  if (crashed[0] && crashed[1]) result = 'draw';
  else if (crashed[0]) result = 1;
  else if (crashed[1]) result = 0;
  if (result === 0 || result === 1) wins[result] += 1;

  return { ...state, players, food, result, wins };
};

export const matchWinner = (state: VersusState): 0 | 1 | null =>
  state.wins[0] >= WINS_NEEDED ? 0 : state.wins[1] >= WINS_NEEDED ? 1 : null;
