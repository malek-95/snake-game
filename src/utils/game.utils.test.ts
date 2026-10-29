import { describe, it, expect } from 'vitest';
import {
  getRandomPosition,
  getNextPosition,
  wrapPosition,
  collidesWithSnake,
  generateLevelConfig,
  findSafeSpawnPosition,
  isSafePosition,
  isOutOfBounds,
  gridForArea,
  initialSnake,
} from './game.utils';
import { GRID_SIZE } from '../constants/game.constants';
import type { Position } from '../types/game.types';

const allCells = (): Position[] =>
  Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, i) => ({ x: i % GRID_SIZE, y: Math.floor(i / GRID_SIZE) }));

describe('getRandomPosition', () => {
  it('finds the only free cell on an almost full board', () => {
    const cells = allCells().filter(c => !(c.x === 7 && c.y === 13));
    const half = Math.floor(cells.length / 2);
    for (let i = 0; i < 20; i++) {
      expect(getRandomPosition(cells.slice(0, half), cells.slice(half))).toEqual({ x: 7, y: 13 });
    }
  });

  it('never lands on the snake or an obstacle', () => {
    const snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
    const { obstacles } = generateLevelConfig(5);
    for (let i = 0; i < 200; i++) {
      const p = getRandomPosition(snake, obstacles);
      expect([...snake, ...obstacles]).not.toContainEqual(p);
    }
  });

  it('returns an off-grid cell when the board is full', () => {
    expect(getRandomPosition(allCells())).toEqual({ x: -1, y: -1 });
  });
});

describe('movement', () => {
  it('moves one cell per direction', () => {
    expect(getNextPosition({ x: 5, y: 5 }, 'UP')).toEqual({ x: 5, y: 4 });
    expect(getNextPosition({ x: 5, y: 5 }, 'LEFT')).toEqual({ x: 4, y: 5 });
  });

  it('wraps around both edges', () => {
    expect(wrapPosition({ x: -1, y: GRID_SIZE })).toEqual({ x: GRID_SIZE - 1, y: 0 });
  });

  it('ignores the tail when it is about to move away', () => {
    const snake = [{ x: 2, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 0 }];
    expect(collidesWithSnake({ x: 0, y: 0 }, snake, true)).toBe(false);
    expect(collidesWithSnake({ x: 0, y: 0 }, snake, false)).toBe(true);
  });
});

describe('levels', () => {
  it('keeps the spawn zone clear on every level', () => {
    const center = Math.floor(GRID_SIZE / 2);
    for (let level = 1; level <= 10; level++) {
      for (const o of generateLevelConfig(level).obstacles) {
        expect(isSafePosition(o.x, o.y, center)).toBe(true);
      }
    }
  });

  it('gets harder each level', () => {
    const l1 = generateLevelConfig(1);
    const l2 = generateLevelConfig(2);
    expect(l2.applesToComplete).toBeGreaterThan(l1.applesToComplete);
    expect(l2.speedMultiplier).toBeGreaterThan(l1.speedMultiplier);
  });

  it('finds a respawn spot clear of obstacles', () => {
    const { obstacles } = generateLevelConfig(5);
    const spot = findSafeSpawnPosition(5, obstacles)!;
    for (let i = 0; i < 5; i++) {
      expect(obstacles).not.toContainEqual({ x: spot.x - i, y: spot.y });
    }
  });
});

describe('rectangular grids (full-size board)', () => {
  const wide = { cols: 50, rows: 24 };

  it('fills a big area with ~28px cells instead of bigger ones', () => {
    expect(gridForArea(1400, 672)).toEqual({ cols: 50, rows: 24 });
  });

  it('never goes below 20 cells per side on small areas', () => {
    const g = gridForArea(300, 500);
    expect(g.cols).toBe(20);
    expect(g.rows).toBeGreaterThanOrEqual(20);
  });

  it('falls back to 20x20 before the area is measured', () => {
    expect(gridForArea(0, 0)).toEqual({ cols: 20, rows: 20 });
  });

  it('starts the snake in the middle', () => {
    expect(initialSnake(wide)[0]).toEqual({ x: 25, y: 12 });
    expect(initialSnake()).toEqual([{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }]);
  });

  it('uses columns and rows separately for walls and wrapping', () => {
    expect(isOutOfBounds({ x: 30, y: 5 }, wide)).toBe(false);
    expect(isOutOfBounds({ x: 5, y: 24 }, wide)).toBe(true);
    expect(wrapPosition({ x: 50, y: -1 }, wide)).toEqual({ x: 0, y: 23 });
  });

  it('places food anywhere on the wide grid, never outside it', () => {
    const seen = new Set<number>();
    for (let i = 0; i < 300; i++) {
      const p = getRandomPosition(initialSnake(wide), [], wide);
      expect(isOutOfBounds(p, wide)).toBe(false);
      seen.add(p.x);
    }
    expect(Math.max(...seen)).toBeGreaterThanOrEqual(20);
  });
});
