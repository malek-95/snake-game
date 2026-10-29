import { describe, it, expect } from 'vitest';
import { RollbackSession, type InputMessage } from './rollback';
import { advance, hashState, newRound, nextRandom, type VersusState } from './versus';
import type { Direction } from '../types/game.types';

const DIRS: Direction[] = ['UP', 'DOWN', 'LEFT', 'RIGHT'];

/** Seeded random numbers for the test itself, so every run is the same. */
const rngFrom = (seed: number) => {
  let s = seed;
  return () => {
    const [r, next] = nextRandom(s);
    s = next;
    return r;
  };
};

interface NetConfig {
  delay: number;   // ticks a message takes
  jitter: number;  // extra random ticks
  drop: number;    // chance a message is lost
  seed: number;
}

/** Two players, a simulated network, random play; then let the round finish. */
const playMatch = ({ delay, jitter, drop, seed }: NetConfig) => {
  const rand = rngFrom(seed);
  const initial = newRound({ cols: 80, rows: 60 }, [0, 0], seed);
  const players = [new RollbackSession(initial, 0), new RollbackSession(initial, 1)];
  let queue: { at: number; to: number; msg: InputMessage }[] = [];

  const send = (from: number, msg: InputMessage | null, frame: number, lossy: boolean) => {
    if (!msg || (lossy && rand() < drop)) return;
    queue.push({ at: frame + delay + Math.floor(rand() * (jitter + 1)), to: 1 - from, msg });
  };
  const deliver = (frame: number) => {
    const due = queue.filter(m => m.at <= frame).sort((a, b) => a.at - b.at);
    queue = queue.filter(m => m.at > frame);
    for (const m of due) players[m.to].receive(m.msg);
  };

  for (let frame = 0; frame < 2000 && !players.every(p => p.roundOver); frame++) {
    const lossy = frame < 300; // random play on a bad network, then a clean network to finish
    players.forEach((p, i) => {
      if (p.shouldWait(delay)) return;
      // Everyone turns once early on (so every case exercises rewinds), then plays randomly.
      const turn = frame === 4 ? (i === 0 ? 'DOWN' : 'UP') : frame < 300 && rand() < 0.08 ? DIRS[Math.floor(rand() * 4)] : null;
      send(i, p.step(turn) ?? p.resend(), frame, lossy);
    });
    deliver(frame);
  }
  return players;
};

/** The game as it really happened: both players' actual turns, no network. */
const reference = (initial: VersusState, a: readonly (Direction | null)[], b: readonly (Direction | null)[], ticks: number) => {
  const states = [initial];
  for (let t = 0; t < ticks; t++) states.push(advance(states[t], [a[t] ?? null, b[t] ?? null]));
  return states;
};

describe('rollback netcode', () => {
  const configs: NetConfig[] = [
    { delay: 1, jitter: 0, drop: 0, seed: 1 },
    { delay: 2, jitter: 2, drop: 0, seed: 2 },
    { delay: 3, jitter: 3, drop: 0.15, seed: 3 },
    { delay: 6, jitter: 4, drop: 0.1, seed: 4 },
    { delay: 0, jitter: 5, drop: 0.2, seed: 5 },
  ];

  it.each(configs)('both players end with the real game (delay $delay, jitter $jitter, drop $drop)', cfg => {
    const [a, b] = playMatch(cfg);
    expect(a.roundOver && b.roundOver).toBe(true);
    expect(a.confirmedTick).toBe(b.confirmedTick);

    const ticks = a.confirmedTick;
    // A real round was played: both players turned, and the network forced at least one rewind.
    expect(a.myTurns().filter(Boolean).length).toBeGreaterThan(0);
    expect(b.myTurns().filter(Boolean).length).toBeGreaterThan(0);
    expect(a.rollbacks + b.rollbacks).toBeGreaterThan(0);
    const ref = reference(a.stateAt(0)!, a.myTurns(), b.myTurns(), ticks);
    for (let t = 0; t <= ticks; t++) {
      const expected = hashState(ref[t]);
      expect(hashState(a.stateAt(t)!)).toBe(expected);
      expect(hashState(b.stateAt(t)!)).toBe(expected);
    }
    expect(a.confirmed.result).toBe(ref[ticks].result);
    expect(a.confirmed.wins).toEqual(b.confirmed.wins);
  });

  it('actually rewinds when the network is slow', () => {
    const [a, b] = playMatch({ delay: 4, jitter: 2, drop: 0, seed: 9 });
    expect(a.rollbacks + b.rollbacks).toBeGreaterThan(0);
  });

  it('moves my own snake the moment I turn, before the other player hears about it', () => {
    const s = new RollbackSession(newRound({ cols: 30, rows: 20 }, [0, 0], 7), 0);
    const head = s.current.players[0].body[0];
    s.step('DOWN');
    expect(s.current.players[0].dir).toBe('DOWN');
    expect(s.current.players[0].body[0]).toEqual({ x: head.x, y: head.y + 1 });
    expect(s.confirmedTick).toBe(0); // nothing confirmed yet: the other player hasn't answered
  });

  it('waits instead of running away when the other player goes silent', () => {
    const s = new RollbackSession(newRound({ cols: 60, rows: 20 }, [0, 0], 7), 0, 12);
    let played = 0;
    for (let i = 0; i < 30; i++) if (s.step(null)) played++;
    expect(played).toBe(12);
    expect(s.shouldWait(2)).toBe(true);
  });

  it('does not end the round on a guessed crash that the real turns avoid', () => {
    // Player 2 heads left at the wall and turns away on the last tick; the host doesn't know yet.
    const start = newRound({ cols: 12, rows: 20 }, [0, 0], 3);
    const host = new RollbackSession(start, 0);
    const guest = new RollbackSession(start, 1);
    const wallIn = start.players[1].body[0].x + 1; // ticks until player 2 would leave the board
    for (let t = 0; t < wallIn; t++) {
      guest.receive(host.step(t === 0 ? 'DOWN' : null)!); // the guest hears the host straight away
      guest.step(t === wallIn - 1 ? 'UP' : null);
    }
    // Guessing "straight on", the host sees player 2 crash...
    expect(host.current.result).toBe(0);
    expect(host.roundOver).toBe(false);
    // ...until the guest's real turns arrive.
    host.receive(guest.resend()!);
    expect(host.current.result).toBeNull();
    expect(hashState(host.current)).toBe(hashState(guest.current));
  });

  it('can be put back on track from the host\'s copy', () => {
    const start = newRound({ cols: 30, rows: 20 }, [0, 0], 11);
    const s = new RollbackSession(start, 1);
    for (let i = 0; i < 5; i++) s.step(null);
    s.applySnapshot(0, { ...start, food: { x: 0, y: 0 } });
    expect(s.stateAt(0)!.food).toEqual({ x: 0, y: 0 });
    expect(s.tick).toBe(5);
  });
});

describe('deterministic 2-player rules', () => {
  it('places food the same way from the same seed', () => {
    const g = { cols: 30, rows: 20 };
    expect(newRound(g, [0, 0], 42).food).toEqual(newRound(g, [0, 0], 42).food);
    expect(newRound(g, [0, 0], 42).seed).toBe(newRound(g, [0, 0], 42).seed);
  });

  it('never depends on Math.random once a round has started', () => {
    const g = { cols: 30, rows: 20 };
    const run = () => {
      let s = newRound(g, [0, 0], 5);
      const turns: (Direction | null)[] = [null, 'DOWN', null, null, 'LEFT', null, null, 'UP', null, 'RIGHT'];
      for (let i = 0; i < 60; i++) s = advance(s, [turns[i % turns.length], turns[(i + 3) % turns.length]]);
      return hashState(s);
    };
    const first = run();
    const real = Math.random;
    Math.random = () => 0.999;
    try {
      expect(run()).toBe(first);
    } finally {
      Math.random = real;
    }
  });
});
