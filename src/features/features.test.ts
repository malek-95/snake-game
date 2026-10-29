// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { qualifies, insertScore, bestPerName, cleanName, MAX_ENTRIES, type ScoreEntry } from './leaderboard';
import { newlyUnlocked, ACHIEVEMENTS, type Progress } from './achievements';
import { encodeCell, decodeCell, obstaclesAt, type Frame } from './replay';
import { canPlaceWall, cleanObstacles } from './customLevels';
import { SKINS, skinById, rivalSkin } from './look';
import { loadJSON, saveJSON } from '../utils/storage';

const entry = (score: number): ScoreEntry => ({ name: 'a', score, apples: 1, date: '2026-01-01' });

describe('leaderboard', () => {
  it('lets any positive score in while there is room', () => {
    expect(qualifies([], 5)).toBe(true);
    expect(qualifies([], 0)).toBe(false);
  });

  it('needs to beat the 10th score once full', () => {
    const full = Array.from({ length: MAX_ENTRIES }, (_, i) => entry(100 - i * 10)); // 100 .. 10
    expect(qualifies(full, 10)).toBe(false);
    expect(qualifies(full, 11)).toBe(true);
  });

  it('keeps the list sorted and capped at 10', () => {
    let list: ScoreEntry[] = [];
    for (const s of [30, 10, 50, 20, 40, 60, 70, 80, 90, 100, 5]) list = insertScore(list, { ...entry(s), name: `p${s}` });
    expect(list).toHaveLength(MAX_ENTRIES);
    expect(list.map(e => e.score)).toEqual([100, 90, 80, 70, 60, 50, 40, 30, 20, 10]);
  });

  it('keeps one entry per player: their best', () => {
    const named = (name: string, score: number): ScoreEntry => ({ ...entry(score), name });
    let list = insertScore([], named('Malek', 300));
    list = insertScore(list, named('Ali', 350));
    list = insertScore(list, named('malek ', 250)); // lower than Malek's best: nothing changes
    expect(list.map(e => [e.name, e.score])).toEqual([['Ali', 350], ['Malek', 300]]);
    list = insertScore(list, named('MALEK', 400)); // better: replaces it
    expect(list.map(e => [e.name, e.score])).toEqual([['MALEK', 400], ['Ali', 350]]);
  });

  it('merges duplicates saved by older versions', () => {
    const old = [entry(300), { ...entry(400), name: 'b' }, entry(500), { ...entry(200), name: 'B' }];
    expect(bestPerName(old).map(e => [e.name, e.score])).toEqual([['a', 500], ['b', 400]]);
  });

  it('trims names and never stores an empty one', () => {
    expect(cleanName('  Bob  ')).toBe('Bob');
    expect(cleanName('   ')).toBe('???');
    expect(cleanName('x'.repeat(40))).toHaveLength(16);
  });
});

describe('achievements', () => {
  const base: Progress = {
    mode: 'classic', difficulty: 'medium', gameState: 'playing', applesEaten: 0, score: 0,
    level: 1, multiplier: 1, goldenEaten: 0, length: 3, gamesPlayed: 0, versusWins: 0,
  };

  it('unlocks nothing at the start', () => {
    expect(newlyUnlocked(base, {})).toEqual([]);
  });

  it('unlocks what the progress earns, once', () => {
    const p = { ...base, applesEaten: 25, multiplier: 3, score: 600 };
    const ids = newlyUnlocked(p, {});
    expect(ids).toEqual(expect.arrayContaining(['first_bite', 'hungry', 'combo_x3', 'score_500']));
    expect(newlyUnlocked(p, Object.fromEntries(ids.map(id => [id, 'x'])))).toEqual([]);
  });

  it('only counts mode-specific goals in their mode', () => {
    expect(newlyUnlocked({ ...base, applesEaten: 30 }, {})).not.toContain('speed_demon');
    expect(newlyUnlocked({ ...base, mode: 'survival', applesEaten: 30 }, {})).toContain('speed_demon');
  });

  it('every skin lock points at a real achievement', () => {
    const ids = new Set(ACHIEVEMENTS.map(a => a.id));
    for (const s of SKINS) if (s.unlockedBy) expect(ids.has(s.unlockedBy)).toBe(true);
  });
});

describe('replay encoding', () => {
  const grid = { cols: 50, rows: 24 };

  it('round-trips cells on a wide grid', () => {
    for (const p of [{ x: 0, y: 0 }, { x: 49, y: 0 }, { x: 0, y: 23 }, { x: 49, y: 23 }, { x: 17, y: 9 }]) {
      expect(decodeCell(encodeCell(p, grid), grid)).toEqual(p);
    }
  });

  it('carries obstacles forward from the last frame that stored them', () => {
    const f = (o?: number[]): Frame => ({ t: 0, s: [], f: 0, sc: 0, o });
    const frames = [f([1, 2]), f(), f(), f([7]), f()];
    expect(obstaclesAt(frames, 2)).toEqual([1, 2]);
    expect(obstaclesAt(frames, 4)).toEqual([7]);
    expect(obstaclesAt([f()], 0)).toEqual([]);
  });
});

describe('custom levels', () => {
  it('keeps the start zone and the outside of the board wall-free', () => {
    expect(canPlaceWall({ x: 10, y: 10 })).toBe(false);
    expect(canPlaceWall({ x: 2, y: 2 })).toBe(true);
    expect(canPlaceWall({ x: 20, y: 2 })).toBe(false);
  });

  it('cleans bad, blocked and duplicate walls', () => {
    const cleaned = cleanObstacles([{ x: 2, y: 2 }, { x: 2, y: 2 }, { x: 10, y: 10 }, { x: -1, y: 0 }, { x: 1.5, y: 3 }, { x: 18, y: 1 }]);
    expect(cleaned).toEqual([{ x: 2, y: 2 }, { x: 18, y: 1 }]);
  });
});

describe('skins', () => {
  it('falls back to classic for unknown ids and gives player 2 a different skin', () => {
    expect(skinById('nope').id).toBe('classic');
    for (const s of SKINS) expect(rivalSkin(s).id).not.toBe(s.id);
  });
});

describe('storage', () => {
  beforeEach(() => localStorage.clear());

  it('returns the fallback for missing, broken or invalid data', () => {
    expect(loadJSON('k', 7)).toBe(7);
    localStorage.setItem('k', '{not json');
    expect(loadJSON('k', 7)).toBe(7);
    saveJSON('k', 'text');
    expect(loadJSON('k', 7, v => typeof v === 'number')).toBe(7);
    saveJSON('k', 3);
    expect(loadJSON('k', 7, v => typeof v === 'number')).toBe(3);
  });
});
