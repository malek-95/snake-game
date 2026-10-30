import { describe, it, expect } from 'vitest';
import { newRound, stepVersus, advance, hashState, matchWinner, nextRandom, WINS_NEEDED, type VersusState } from './versus';
import { RollbackSession, type InputMessage } from './rollback';
import type { Direction, Position } from '../types/game.types';

const grid = { cols: 20, rows: 20 };
const row = (y: number, ...xs: number[]) => xs.map(x => ({ x, y }));
const col = (x: number, ...ys: number[]) => ys.map(y => ({ x, y }));

/** A party round with snakes exactly where the test wants them. */
const setup = (snakes: [Position[], Direction][], food = { x: 0, y: 19 }): VersusState => {
  const s = newRound(grid, snakes.map(() => 0));
  return { ...s, food, players: snakes.map(([body, dir], i) => ({ ...s.players[i], body, dir })) };
};

describe('party rules (3-4 players)', () => {
  it('starts every snake in its own place with food on a free cell', () => {
    for (const n of [3, 4]) {
      const s = newRound({ cols: 36, rows: 24 }, Array(n).fill(0));
      expect(s.players).toHaveLength(n);
      const cells = s.players.flatMap(p => p.body).map(c => `${c.x},${c.y}`);
      expect(new Set(cells).size).toBe(cells.length);
      expect(cells).not.toContain(`${s.food.x},${s.food.y}`);
      // Nobody crashes in the first ticks if no one turns.
      let t = s;
      for (let i = 0; i < 3; i++) t = stepVersus(t);
      expect(t.players.every(p => p.alive)).toBe(true);
    }
  });

  it('eliminates a crashed snake and lets the others play on', () => {
    let s = setup([
      [row(5, 19, 18, 17), 'RIGHT'], // about to hit the wall
      [row(10, 5, 4, 3), 'RIGHT'],
      [row(15, 5, 4, 3), 'RIGHT'],
    ]);
    s = stepVersus(s);
    expect(s.players.map(p => p.alive)).toEqual([false, true, true]);
    expect(s.result).toBeNull();
    const out = s.players[0].body;
    s = stepVersus(s);
    expect(s.players[0].body).toEqual(out); // an eliminated snake stays put
    expect(s.players[1].body[0]).toEqual({ x: 7, y: 10 });
  });

  it("an eliminated snake doesn't block anyone", () => {
    let s = setup([
      [row(5, 19, 18, 17), 'RIGHT'],
      [col(18, 2, 1, 0), 'DOWN'], // goes down through x=18, where the dead body lies on row 5
      [row(15, 5, 4, 3), 'RIGHT'],
    ]);
    for (let i = 0; i < 4; i++) s = stepVersus(s);
    expect(s.players[0].alive).toBe(false);
    expect(s.players[1].body[0]).toEqual({ x: 18, y: 6 });
    expect(s.players[1].alive).toBe(true);
  });

  it('the last snake standing wins the round, in elimination order', () => {
    let s = setup([
      [row(5, 19, 18, 17), 'RIGHT'], // out on tick 1
      [row(10, 17, 16, 15), 'RIGHT'], // out on tick 3
      [row(15, 5, 4, 3), 'RIGHT'],
    ]);
    s = stepVersus(s);
    expect(s.players.map(p => p.alive)).toEqual([false, true, true]);
    s = stepVersus(stepVersus(s));
    expect(s.players.map(p => p.alive)).toEqual([false, false, true]);
    expect(s.result).toBe(2);
    expect(s.wins).toEqual([0, 0, 1]);
    expect(stepVersus(s)).toBe(s); // the round is over
  });

  it('is a draw when the last snakes crash on the same tick', () => {
    let s = setup([
      [row(5, 19, 18, 17), 'RIGHT'], // out on tick 1
      [row(10, 18, 17, 16), 'RIGHT'], // out on tick 2
      [row(15, 1, 2, 3), 'LEFT'], // out on tick 2 too
    ]);
    s = stepVersus(s);
    expect(s.result).toBeNull();
    s = stepVersus(s);
    expect(s.players.map(p => p.alive)).toEqual([false, false, false]);
    expect(s.result).toBe('draw');
    expect(s.wins).toEqual([0, 0, 0]);
  });

  it('two snakes meeting head-on both go out, the third wins', () => {
    const s = stepVersus(setup([
      [row(5, 5, 4, 3), 'RIGHT'],
      [row(5, 7, 8, 9), 'LEFT'], // both want (6, 5)
      [row(15, 5, 4, 3), 'RIGHT'],
    ]));
    expect(s.players.map(p => p.alive)).toEqual([false, false, true]);
    expect(s.result).toBe(2);
  });

  it('a freeze freezes every other snake still in the round', () => {
    let s = setup([
      [row(5, 5, 4, 3), 'RIGHT'],
      [row(10, 5, 4, 3), 'RIGHT'],
      [row(15, 5, 4, 3), 'RIGHT'],
    ]);
    s = { ...s, powerUp: { kind: 'freeze', pos: { x: 6, y: 5 } } };
    s = stepVersus(s);
    expect(s.players.map(p => p.frozen ?? 0)).toEqual([0, 6, 6]);
  });

  it('the match goes to the first player with enough round wins', () => {
    expect(matchWinner(newRound(grid, [1, 0, WINS_NEEDED, 2]))).toBe(2);
    expect(matchWinner(newRound(grid, [0, 1, 2]))).toBeNull();
  });
});

/** Seeded random numbers for the test itself. */
const rngFrom = (seed: number) => {
  let s = seed;
  return () => {
    const [r, next] = nextRandom(s);
    s = next;
    return r;
  };
};

const DIRS: Direction[] = ['UP', 'DOWN', 'LEFT', 'RIGHT'];

/** n players broadcasting to each other over a laggy, lossy network, playing randomly. */
const playParty = (n: number, seed: number, { delay = 3, jitter = 3, drop = 0.1, leaveAt = -1 } = {}) => {
  const rand = rngFrom(seed);
  const initial = newRound({ cols: 50, rows: 40 }, Array(n).fill(0), seed);
  const players = Array.from({ length: n }, (_, i) => new RollbackSession(initial, i, 12, i % 2));
  let queue: { at: number; from: number; to: number; msg: InputMessage }[] = [];
  let gone = -1;

  for (let frame = 0; frame < 3000 && !players.every((p, i) => i === gone || p.roundOver); frame++) {
    // The last player leaves: the host (player 0) drops them and tells the others.
    if (frame === leaveAt) {
      gone = n - 1;
      queue = queue.filter(m => m.from !== gone);
      const turns = players[0].knownTurns(gone);
      players.forEach((p, i) => i !== gone && p.dropPlayer(gone, turns));
    }
    const lossy = frame < 300;
    players.forEach((p, i) => {
      if (i === gone || p.shouldWait(delay)) return;
      const turn = p.tick === 4 ? DIRS[i] : p.tick > 4 && frame < 300 && rand() < 0.08 ? DIRS[Math.floor(rand() * 4)] : null;
      const msg = p.step(turn) ?? p.resend();
      if (!msg) return;
      for (let to = 0; to < n; to++) {
        if (to === i || (lossy && rand() < drop)) continue;
        queue.push({ at: frame + delay + Math.floor(rand() * (jitter + 1)), from: i, to, msg });
      }
    });
    const due = queue.filter(m => m.at <= frame).sort((a, b) => a.at - b.at);
    queue = queue.filter(m => m.at > frame);
    for (const m of due) if (m.to !== gone) players[m.to].receive(m.msg, m.from);
  }
  return players.filter((_, i) => i !== gone);
};

describe('rollback with 3+ players', () => {
  it.each([
    { n: 3, seed: 31 },
    { n: 4, seed: 32 },
    { n: 4, seed: 33 },
  ])('every player ends with the real game ($n players, seed $seed)', ({ n, seed }) => {
    const players = playParty(n, seed);
    expect(players.every(p => p.roundOver)).toBe(true);
    const ticks = players[0].confirmedTick;
    expect(players.every(p => p.confirmedTick === ticks)).toBe(true);
    // Replay everyone's real turns without a network: same game, tick by tick.
    let ref = players[0].stateAt(0)!;
    for (let t = 0; t <= ticks; t++) {
      for (const p of players) expect(hashState(p.stateAt(t)!)).toBe(hashState(ref));
      ref = advance(ref, players.map(p => p.myTurns()[t] ?? null));
    }
    expect(players.reduce((sum, p) => sum + p.rollbacks, 0)).toBeGreaterThan(0);
  });

  it('a player who leaves mid-round is dropped the same way on every screen', () => {
    const players = playParty(4, 41, { leaveAt: 15 });
    expect(players).toHaveLength(3);
    expect(players.every(p => p.roundOver)).toBe(true);
    const ticks = players[0].confirmedTick;
    expect(players.every(p => p.confirmedTick === ticks)).toBe(true);
    for (let t = 0; t <= ticks; t++) {
      const h = hashState(players[0].stateAt(t)!);
      for (const p of players) expect(hashState(p.stateAt(t)!)).toBe(h);
    }
  });
});
