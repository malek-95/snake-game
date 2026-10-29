// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSnakeGame } from './useSnakeGame';
import { dailyChallenge, todayKey } from '../utils/game.utils';
import { SPEED_CONFIG } from '../constants/game.constants';

const playDaily = () => {
  const { result } = renderHook(() => useSnakeGame());
  act(() => result.current.changeDifficulty('hard'));
  act(() => result.current.changeGameMode('daily'));
  act(() => result.current.startGame());
  return result.current;
};

describe('daily challenge game', () => {
  it('gives every player the same walls and the same first apple', () => {
    const a = playDaily();
    const b = playDaily();
    expect(a.obstacles).toEqual(dailyChallenge(todayKey()).obstacles);
    expect(b.obstacles).toEqual(a.obstacles);
    expect(b.food).toEqual(a.food);
    expect(a.grid).toEqual({ cols: 20, rows: 20 });
  });

  it('plays at medium speed whatever difficulty is selected', () => {
    expect(playDaily().tickMs).toBe(SPEED_CONFIG.medium);
  });
});
