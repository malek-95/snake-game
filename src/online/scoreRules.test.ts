import { describe, it, expect } from 'vitest';
import {
  validateScore, maxScore, POINTS_PER_APPLE, TICK_MS, MULTIPLIER_EVERY, GOLDEN_FACTOR, FASTEST_TICK_MS, MODES,
} from '../../supabase/functions/submit-score/validate.ts';
import { SCORE_CONFIG, SPEED_CONFIG, BONUS_CONFIG, GOLDEN_CONFIG, MIN_TICK_MS, GAME_MODES } from '../constants/game.constants';

const good = { name: 'Malek', mode: 'classic', difficulty: 'medium', score: 70, apples: 7, golden: 0, durationMs: 5000 };

describe('world score rules', () => {
  it('use the same numbers as the game', () => {
    expect(POINTS_PER_APPLE).toEqual(SCORE_CONFIG);
    expect(TICK_MS).toEqual(SPEED_CONFIG);
    expect(MULTIPLIER_EVERY).toBe(BONUS_CONFIG.multiplierEvery);
    expect(GOLDEN_FACTOR).toBe(GOLDEN_CONFIG.pointsMultiplier);
    expect(FASTEST_TICK_MS).toBe(MIN_TICK_MS);
    expect([...MODES]).toEqual(GAME_MODES);
  });

  it('know the best possible score: the bonus grows every 10 apples', () => {
    expect(maxScore('medium', 9, 0)).toBe(90);
    expect(maxScore('medium', 10, 0)).toBe(110); // the 10th apple already counts double
    expect(maxScore('easy', 20, 0)).toBe(9 * 5 + 10 * 10 + 15);
    expect(maxScore('medium', 1, 1)).toBe(10 + 50);
  });

  it('accept scores real games produce', () => {
    expect(validateScore(good)).toMatchObject({ ok: true, row: { name: 'Malek', score: 70, level: null } });
    // From the game tests: a level-1 clear (7 apples, medium) and a golden apple run.
    expect(validateScore({ ...good, mode: 'levels', level: 2 }).ok).toBe(true);
    expect(validateScore({ ...good, mode: 'golden', score: 60, apples: 1, golden: 1 }).ok).toBe(true);
    expect(validateScore({ ...good, name: '  Malek  ' })).toMatchObject({ row: { name: 'Malek' } });
  });

  it.each([
    ['too high for the apples', { score: 120, apples: 10 }, 'score too high'],
    ['not a whole number of apples', { score: 75 }, 'score'],
    ['golden apples outside golden mode', { golden: 1 }, 'golden'],
    ['impossibly fast', { durationMs: 100 }, 'too fast'],
    ['empty name', { name: '   ' }, 'name'],
    ['name too long', { name: 'x'.repeat(17) }, 'name'],
    ['unknown mode', { mode: 'god' }, 'mode'],
    ['unknown difficulty', { difficulty: 'insane' }, 'difficulty'],
    ['a level outside levels mode', { level: 3 }, 'level'],
    ['zero score', { score: 0 }, 'score'],
    ['missing duration', { durationMs: undefined }, 'duration'],
    ['fractional apples', { apples: 6.5 }, 'apples'],
  ])('reject %s', (_, change, error) => {
    expect(validateScore({ ...good, ...change })).toEqual({ ok: false, error });
  });

  it('reject anything that is not a score at all', () => {
    expect(validateScore(null)).toEqual({ ok: false, error: 'body' });
    expect(validateScore('hi')).toEqual({ ok: false, error: 'body' });
  });
});
