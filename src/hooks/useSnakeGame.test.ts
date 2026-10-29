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
