import { describe, it, expect } from 'vitest';
import { newRound, queueTurn, stepVersus, matchWinner, type VersusState } from './versus';
import type { Direction, Position } from '../types/game.types';

const grid = { cols: 20, rows: 20 };

/** A round with snakes and food exactly where the test wants them. */
const setup = (b1: Position[], dir1: Direction, b2: Position[], dir2: Direction, food = { x: 0, y: 19 }): VersusState => {
  const s = newRound(grid);
  return {
    ...s,
    food,
    players: [
      { ...s.players[0], body: b1, dir: dir1 },
      { ...s.players[1], body: b2, dir: dir2 },
    ],
  };
};

const row = (y: number, ...xs: number[]) => xs.map(x => ({ x, y }));

describe('versus', () => {
  it('starts the players apart, facing each other on different rows', () => {
    const s = newRound(grid);
    expect(s.players[0].dir).toBe('RIGHT');
    expect(s.players[1].dir).toBe('LEFT');
    expect(s.players[0].body[0].y).not.toBe(s.players[1].body[0].y);
    expect([...s.players[0].body, ...s.players[1].body]).not.toContainEqual(s.food);
  });

  it('moves both snakes one cell per step', () => {
    const s = stepVersus(setup(row(5, 5, 4, 3), 'RIGHT', row(15, 10, 11, 12), 'LEFT'));
    expect(s.players[0].body).toEqual(row(5, 6, 5, 4));
    expect(s.players[1].body).toEqual(row(15, 9, 10, 11));
    expect(s.result).toBeNull();
  });

  it('gives the round to the other player when one hits a wall', () => {
    const s = stepVersus(setup(row(5, 19, 18, 17), 'RIGHT', row(15, 10, 11, 12), 'LEFT'));
    expect(s.players[0].alive).toBe(false);
    expect(s.result).toBe(1);
    expect(s.wins).toEqual([0, 1]);
  });

  it('kills a snake that runs into the other one', () => {
    // P1 heads down into P2's body.
    const s = stepVersus(setup([{ x: 10, y: 4 }, { x: 10, y: 3 }, { x: 10, y: 2 }], 'DOWN', row(5, 8, 9, 10, 11), 'LEFT'));
    expect(s.result).toBe(1);
  });

  it('is a draw when both heads meet', () => {
    const s = stepVersus(setup(row(5, 8, 7, 6), 'RIGHT', row(5, 10, 11, 12), 'LEFT'));
    expect(s.result).toBe('draw');
    expect(s.wins).toEqual([0, 0]);
  });

  it('is a draw when the heads swap places', () => {
    const s = stepVersus(setup(row(5, 8, 7, 6), 'RIGHT', row(5, 9, 10, 11), 'LEFT'));
    expect(s.result).toBe('draw');
  });

  it('grows the snake that eats and moves the food', () => {
    const s = stepVersus(setup(row(5, 5, 4, 3), 'RIGHT', row(15, 10, 11, 12), 'LEFT', { x: 6, y: 5 }));
    expect(s.players[0].body).toHaveLength(4);
    expect(s.players[0].apples).toBe(1);
    expect(s.food).not.toEqual({ x: 6, y: 5 });
  });

  it('ignores reversing straight back and applies queued turns in order', () => {
    let s = setup(row(5, 5, 4, 3), 'RIGHT', row(15, 10, 11, 12), 'LEFT');
    expect(queueTurn(s, 0, 'LEFT')).toBe(s);
    s = queueTurn(queueTurn(s, 0, 'DOWN'), 0, 'LEFT');
    s = stepVersus(s);
    expect(s.players[0].body[0]).toEqual({ x: 5, y: 6 });
    s = stepVersus(s);
    expect(s.players[0].body[0]).toEqual({ x: 4, y: 6 });
  });

  it('ends the match at 3 round wins', () => {
    const s = setup(row(5, 5, 4, 3), 'RIGHT', row(15, 10, 11, 12), 'LEFT');
    expect(matchWinner({ ...s, wins: [2, 1] })).toBeNull();
    expect(matchWinner({ ...s, wins: [1, 3] })).toBe(1);
  });

  it('passes through walls when wall passing is on', () => {
    const base = setup(row(5, 19, 18, 17), 'RIGHT', row(15, 10, 11, 12), 'LEFT');
    expect(stepVersus(base).result).toBe(1); // off: the wall kills player 1
    const s = stepVersus({ ...base, wrap: true });
    expect(s.result).toBeNull();
    expect(s.players[0].body[0]).toEqual({ x: 0, y: 5 });
  });

  it('carries the wall setting into a new round', () => {
    expect(newRound(grid, [0, 0], 1, true).wrap).toBe(true);
    expect(newRound(grid).wrap).toBe(false);
  });

  it('ghost: passes through walls and the other snake, then wears off', () => {
    const base = setup(row(5, 19, 18, 17), 'RIGHT', row(15, 10, 11, 12), 'LEFT');
    const s1 = stepVersus({ ...base, players: [{ ...base.players[0], ghost: 2 }, base.players[1]] });
    expect(s1.result).toBeNull();
    expect(s1.players[0].body[0]).toEqual({ x: 0, y: 5 }); // came out the other side
    expect(s1.players[0].ghost).toBe(1);
    // Through the other snake's body, too.
    const cross = setup([{ x: 10, y: 4 }, { x: 10, y: 3 }, { x: 10, y: 2 }], 'DOWN', row(5, 8, 9, 10, 11), 'LEFT');
    expect(stepVersus({ ...cross, players: [{ ...cross.players[0], ghost: 5 }, cross.players[1]] }).result).toBeNull();
  });

  it('freeze: the frozen snake stays put while the other moves', () => {
    const base = setup(row(5, 5, 4, 3), 'RIGHT', row(15, 10, 11, 12), 'LEFT');
    const s1 = stepVersus({ ...base, players: [base.players[0], { ...base.players[1], frozen: 2 }] });
    expect(s1.players[1].body).toEqual(row(15, 10, 11, 12));
    expect(s1.players[0].body[0]).toEqual({ x: 6, y: 5 });
    expect(s1.players[1].frozen).toBe(1);
  });

  it('picking up a power-up applies it: scissors halves the other tail', () => {
    const long = row(15, 10, 11, 12, 13, 14, 15, 16, 17);
    const base = setup(row(5, 5, 4, 3), 'RIGHT', long, 'LEFT');
    const s1 = stepVersus({ ...base, powerUp: { kind: 'scissors', pos: { x: 6, y: 5 } } });
    expect(s1.powerUp).toBeNull();
    expect(s1.players[1].body).toHaveLength(4); // 8 cells after moving, cut in half
    const s2 = stepVersus({ ...base, powerUp: { kind: 'freeze', pos: { x: 6, y: 5 } } });
    expect(s2.players[1].frozen).toBeGreaterThan(0);
    const s3 = stepVersus({ ...base, powerUp: { kind: 'ghost', pos: { x: 6, y: 5 } } });
    expect(s3.players[0].ghost).toBeGreaterThan(0);
  });

  it('power-ups appear after apples, the same way from the same seed, only when enabled', () => {
    const spawned = (powerUps: boolean) => {
      const found = [];
      for (let seed = 1; seed <= 40; seed++) {
        const base = { ...setup(row(5, 5, 4, 3), 'RIGHT', row(15, 10, 11, 12), 'LEFT', { x: 6, y: 5 }), seed, powerUps, powerUp: null };
        found.push(stepVersus(base).powerUp);
      }
      return found;
    };
    const on = spawned(true);
    expect(on.filter(Boolean).length).toBeGreaterThan(0);
    expect(spawned(true)).toEqual(on);
    expect(spawned(false).every(p => p === null)).toBe(true);
  });
});
