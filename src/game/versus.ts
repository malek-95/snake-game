import type { Direction, Grid, Position } from '../types/game.types';
import { getNextPosition, getOppositeDirection, isOutOfBounds, wrapPosition } from '../utils/game.utils';
import { MAX_DIRECTION_QUEUE } from '../constants/game.constants';

/**
 * Versus rules (2 to 4 players) as pure functions. Food placement uses a seed stored in the state, so the same
 * starting state and the same turns always give the same game: online players can each run
 * the match locally and stay identical (see rollback.ts).
 */

export interface Player {
  body: Position[];
  dir: Direction;
  queue: Direction[];
  alive: boolean;
  apples: number;
  /** Ticks left as a ghost (passes through snakes and walls). */
  ghost?: number;
  /** Ticks left frozen (doesn't move). */
  frozen?: number;
}

export type PowerKind = 'ghost' | 'freeze' | 'scissors';
export const POWER_KINDS: PowerKind[] = ['ghost', 'freeze', 'scissors'];
export const POWER_ICONS: Record<PowerKind, string> = { ghost: '👻', freeze: '❄️', scissors: '✂️' };
export const POWER_CONFIG = { spawnChance: 0.35, ghostTicks: 15, freezeTicks: 6 };

/** Index of the round's winner (last snake standing), 'draw' when the last ones crash together. */
export type RoundResult = number | 'draw' | null;

export interface VersusState {
  grid: Grid;
  players: Player[];
  food: Position;
  /** Winner of the round that just ended; null while it's running. */
  result: RoundResult;
  /** Round wins per player; its length is the number of players. */
  wins: number[];
  /** Random generator state for food placement. */
  seed: number;
  /** Snakes pass through walls and come out the other side. */
  wrap?: boolean;
  /** Power-ups can appear after an apple is eaten. */
  powerUps?: boolean;
  powerUp?: { kind: PowerKind; pos: Position } | null;
}

/** Turns made by each player on one tick (null = kept going straight). */
export type TickInputs = (Direction | null)[];

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
  // The body trails behind the head.
  const back = getNextPosition({ x: 0, y: 0 }, getOppositeDirection(dir));
  return { body: [0, 1, 2].map(i => ({ x: x + i * back.x, y: y + i * back.y })), dir, queue: [], alive: true, apples: 0 };
};

/**
 * New round, one snake per entry in `wins`: player 1 on the left heading right, player 2 on the right
 * heading left, player 3 at the top heading down, player 4 at the bottom heading up.
 */
export const newRound = (grid: Grid, wins: number[] = [0, 0], seed = randomSeed(), wrap = false, powerUps = false): VersusState => {
  const { cols, rows } = grid;
  const players = [
    makePlayer(4, Math.floor(rows / 3), 'RIGHT'),
    makePlayer(cols - 5, Math.floor((rows * 2) / 3), 'LEFT'),
    makePlayer(Math.floor((cols * 2) / 3), 3, 'DOWN'),
    makePlayer(Math.floor(cols / 3), rows - 4, 'UP'),
  ].slice(0, wins.length);
  const [food, next] = placeFood(players.flatMap(p => p.body), grid, seed);
  return { grid, players, food, result: null, wins, seed: next, wrap, powerUps, powerUp: null };
};

export const queueTurn = (state: VersusState, player: number, dir: Direction): VersusState => {
  const p = state.players[player];
  const last = p.queue.length ? p.queue[p.queue.length - 1] : p.dir;
  if (dir === last || dir === getOppositeDirection(last) || p.queue.length >= MAX_DIRECTION_QUEUE) return state;
  const players = [...state.players];
  players[player] = { ...p, queue: [...p.queue, dir] };
  return { ...state, players };
};

const same = (a: Position, b: Position) => a.x === b.x && a.y === b.y;

/**
 * Advances every snake one cell and resolves crashes, food, power-ups and the round result.
 * A crashed snake is out for the rest of the round (it stops and no longer blocks anyone);
 * the round ends when one snake or none is left.
 */
export const stepVersus = (state: VersusState): VersusState => {
  if (state.result !== null) return state;
  const ghostly = state.players.map(p => (p.ghost ?? 0) > 0);
  const n = state.players.length;
  const others = (i: number) => state.players.map((_, j) => j).filter(j => j !== i && state.players[j].alive);

  const moves = state.players.map((p, i) => {
    if (!p.alive || (p.frozen ?? 0) > 0) return { dir: p.dir, queue: p.queue, head: p.body[0], eats: false, still: true };
    const dir = p.queue[0] ?? p.dir;
    const next = getNextPosition(p.body[0], dir);
    const head = (state.wrap || ghostly[i]) && isOutOfBounds(next, state.grid) ? wrapPosition(next, state.grid) : next;
    return { dir, queue: p.queue.slice(1), head, eats: same(head, state.food), still: false };
  });

  // Bodies after this tick: a snake that doesn't eat frees its tail cell; a frozen one stays put.
  const nextBodies = state.players.map((p, i) =>
    moves[i].still ? p.body : moves[i].eats ? [moves[i].head, ...p.body] : [moves[i].head, ...p.body.slice(0, -1)]);

  const crashed = moves.map((m, i) => {
    if (m.still) return false;
    if (isOutOfBounds(m.head, state.grid)) return true;
    if (ghostly[i]) return false; // ghosts pass through snakes
    if (nextBodies[i].slice(1).some(c => same(c, m.head))) return true;
    // ...and nobody crashes into a ghost
    return others(i).some(j => !ghostly[j] && nextBodies[j].some(c => same(c, m.head)));
  });
  // Swapping places head-on also counts as a crash for both (unless one of them is a ghost or frozen).
  for (let i = 0; i < n; i++) for (const j of others(i)) {
    if (!ghostly[i] && !ghostly[j] && !moves[i].still && !moves[j].still &&
        same(moves[i].head, state.players[j].body[0]) && same(moves[j].head, state.players[i].body[0])) {
      crashed[i] = crashed[j] = true;
    }
  }

  const players = state.players.map((p, i) => ({
    ...p,
    dir: moves[i].dir,
    queue: moves[i].queue,
    body: crashed[i] ? p.body : nextBodies[i],
    alive: p.alive && !crashed[i],
    apples: p.apples + (moves[i].eats && !crashed[i] ? 1 : 0),
    ghost: Math.max(0, (p.ghost ?? 0) - 1),
    frozen: Math.max(0, (p.frozen ?? 0) - 1),
  }));

  // Picking up a power-up (lowest player number first if several reach it on the same tick).
  // Freeze and scissors hit every other snake still in the round.
  let powerUp = state.powerUp ?? null;
  const taker = powerUp ? players.findIndex((_, i) => !crashed[i] && !moves[i].still && same(moves[i].head, powerUp!.pos)) : -1;
  if (powerUp && taker >= 0) {
    if (powerUp.kind === 'ghost') players[taker].ghost = POWER_CONFIG.ghostTicks;
    for (const other of players.filter((p, i) => i !== taker && p.alive)) {
      if (powerUp.kind === 'freeze') other.frozen = POWER_CONFIG.freezeTicks;
      else if (powerUp.kind === 'scissors') other.body = other.body.slice(0, Math.max(3, Math.ceil(other.body.length / 2)));
    }
    powerUp = null;
  }

  let food = state.food;
  let seed = state.seed;
  if (moves.some((m, i) => m.eats && !crashed[i])) {
    const bodies = [...players.flatMap(p => p.body), ...(powerUp ? [powerUp.pos] : [])];
    [food, seed] = placeFood(bodies, state.grid, seed);
    // Maybe a power-up, from the same seeded generator so both screens agree.
    if (state.powerUps && !powerUp) {
      let r: number;
      [r, seed] = nextRandom(seed);
      if (r < POWER_CONFIG.spawnChance) {
        let k: number;
        [k, seed] = nextRandom(seed);
        let pos: Position;
        [pos, seed] = placeFood([...bodies, food], state.grid, seed);
        powerUp = { kind: POWER_KINDS[Math.floor(k * POWER_KINDS.length)], pos };
      }
    }
  }

  let result: RoundResult = null;
  const wins = [...state.wins];
  const alive = players.flatMap((p, i) => (p.alive ? [i] : []));
  if (alive.length === 0) result = 'draw';
  else if (alive.length === 1) result = alive[0];
  if (typeof result === 'number') wins[result] += 1;

  return { ...state, players, food, result, wins, seed, powerUp };
};

/** One tick with the given turns: what every online player computes independently. */
export const advance = (state: VersusState, inputs: TickInputs): VersusState =>
  stepVersus(inputs.reduce((s, dir, i) => (dir ? queueTurn(s, i, dir) : s), state));

/** Short fingerprint of a state, to check both players still see the same game. */
export const hashState = (s: VersusState): number => {
  const text = JSON.stringify([s.players.map(p => [p.body, p.dir, p.alive, p.apples, p.ghost ?? 0, p.frozen ?? 0]), s.food, s.result, s.wins, s.seed, s.powerUp ?? null]);
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193);
  return h >>> 0;
};

export const matchWinner = (state: VersusState): number | null => {
  const i = state.wins.findIndex(w => w >= WINS_NEEDED);
  return i < 0 ? null : i;
};
