// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSnakeGame } from './useSnakeGame';
import { useTranslation } from '../i18n/useTranslation';
import { SPEED_CONFIG } from '../constants/game.constants';
import type { Position } from '../types/game.types';

// Food always appears right in front of the head, so the snake eats on every tick while moving right.
vi.mock('../utils/game.utils', async importOriginal => ({
  ...(await importOriginal<typeof import('../utils/game.utils')>()),
  getRandomPosition: (snake: Position[]) => ({ x: snake[0].x + 1, y: snake[0].y }),
}));

const tick = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
});
afterEach(() => vi.useRealTimers());

describe('useSnakeGame levels mode', () => {
  it('scores the apple that completes a level and speeds up the next level', () => {
    const setIntervalSpy = vi.spyOn(window, 'setInterval');
    const { result } = renderHook(() => useSnakeGame());
    act(() => result.current.changeGameMode('levels'));
    act(() => result.current.startGame());

    // Level 1 needs 7 apples; medium difficulty gives 10 points each.
    for (let i = 0; i < 7; i++) tick(SPEED_CONFIG.medium);

    expect(result.current.level).toBe(2);
    expect(result.current.score).toBe(70);
    expect(result.current.highScore).toBe(70);

    const lastDelay = setIntervalSpy.mock.lastCall![1];
    expect(lastDelay).toBeCloseTo(SPEED_CONFIG.medium / 1.1);
  });

  it('clears level obstacles when a classic game starts', () => {
    const { result } = renderHook(() => useSnakeGame());
    act(() => result.current.changeGameMode('levels'));
    act(() => result.current.startGame());
    expect(result.current.obstacles.length).toBeGreaterThan(0);

    act(() => result.current.togglePause());
    act(() => result.current.changeGameMode('classic'));
    act(() => result.current.startGame());
    expect(result.current.obstacles).toEqual([]);
  });
});

describe('useSnakeGame grid', () => {
  it('uses the requested grid for classic games and 20x20 for levels', () => {
    const { result } = renderHook(() => useSnakeGame());
    act(() => result.current.setPreferredGrid({ cols: 50, rows: 24 }));
    expect(result.current.grid).toEqual({ cols: 50, rows: 24 });
    expect(result.current.snake[0]).toEqual({ x: 25, y: 12 });

    act(() => result.current.startGame());
    expect(result.current.grid).toEqual({ cols: 50, rows: 24 });

    // Resizing mid-game must not change the board under the snake.
    act(() => result.current.setPreferredGrid({ cols: 30, rows: 30 }));
    expect(result.current.grid).toEqual({ cols: 50, rows: 24 });

    act(() => result.current.togglePause());
    act(() => result.current.changeGameMode('levels'));
    act(() => result.current.startGame());
    expect(result.current.grid).toEqual({ cols: 20, rows: 20 });
  });
});

describe('useTranslation', () => {
  it('falls back to French when storage holds an unknown language', () => {
    localStorage.setItem('snake-language', 'xx');
    const { result } = renderHook(() => useTranslation());
    expect(result.current.language).toBe('fr');
    expect(result.current.t('nextBonus')).toBe('Prochain bonus:');
  });
});

describe('useSnakeGame new modes', () => {
  afterEach(() => vi.restoreAllMocks());

  const startIn = (mode: Parameters<ReturnType<typeof useSnakeGame>['changeGameMode']>[0]) => {
    const hook = renderHook(() => useSnakeGame());
    act(() => hook.result.current.changeGameMode(mode));
    act(() => hook.result.current.startGame());
    return hook;
  };

  it('zen: biting yourself cuts the tail instead of ending the game', () => {
    const { result } = startIn('zen');
    for (let i = 0; i < 4; i++) tick(SPEED_CONFIG.medium); // eats every tick: length 7
    expect(result.current.snake).toHaveLength(7);

    // Down, left, up: the head turns back into its own body.
    for (const dir of ['DOWN', 'LEFT', 'UP'] as const) {
      act(() => result.current.changeDirection(dir));
      tick(SPEED_CONFIG.medium);
    }
    expect(result.current.gameState).toBe('playing');
    expect(result.current.tailCuts).toBe(1);
    expect(result.current.snake.length).toBeLessThan(7);
  });

  it('zen: walls wrap even with the wrap setting off', () => {
    const { result } = startIn('zen');
    act(() => result.current.changeDirection('UP'));
    for (let i = 0; i < 12; i++) tick(SPEED_CONFIG.medium);
    expect(result.current.gameState).toBe('playing');
  });

  it('golden: a golden apple is worth 5x', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0); // always spawn a golden apple
    const { result } = startIn('golden');
    tick(SPEED_CONFIG.medium); // normal apple: 10 points, golden apple appears ahead
    expect(result.current.goldenFood).not.toBeNull();
    tick(SPEED_CONFIG.medium); // eat the golden apple
    expect(result.current.goldenEaten).toBe(1);
    expect(result.current.score).toBe(10 + 10 * 5);
  });

  it('survival: every apple makes the loop faster', () => {
    const setIntervalSpy = vi.spyOn(window, 'setInterval');
    startIn('survival');
    tick(SPEED_CONFIG.medium);
    tick(SPEED_CONFIG.medium);
    expect(setIntervalSpy.mock.lastCall![1]).toBeCloseTo(SPEED_CONFIG.medium / 1.08);
  });

  it('time attack: the clock runs while playing and stops while paused', () => {
    const { result } = startIn('timeAttack');
    act(() => result.current.togglePause());
    act(() => result.current.toggleWrapAround());
    act(() => result.current.togglePause());
    tick(1000);
    expect(result.current.timeLeft).toBe(119);
    act(() => result.current.togglePause());
    tick(5000);
    expect(result.current.timeLeft).toBe(119);
  });

  it('custom: plays the drawn walls on a 20x20 board', () => {
    const { result } = renderHook(() => useSnakeGame());
    act(() => result.current.setPreferredGrid({ cols: 50, rows: 24 }));
    act(() => result.current.setCustomLevel([{ x: 2, y: 2 }, { x: 3, y: 2 }]));
    act(() => result.current.changeGameMode('custom'));
    act(() => result.current.startGame());
    expect(result.current.grid).toEqual({ cols: 20, rows: 20 });
    expect(result.current.obstacles).toEqual([{ x: 2, y: 2 }, { x: 3, y: 2 }]);
  });

  it('end game finishes a running game and new games get a new id', () => {
    const { result } = startIn('classic');
    const firstId = result.current.gameId;
    act(() => result.current.endGame());
    expect(result.current.gameState).toBe('gameover');
    act(() => result.current.startGame());
    expect(result.current.gameId).toBe(firstId + 1);
  });
});
