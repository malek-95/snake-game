import type { GameConfig, Difficulty, Grid, GameMode } from '../types/game.types';

// Grid configuration
export const GRID_SIZE = 20;
// Normal boards and levels mode (level layouts are hand-placed for 20x20).
export const DEFAULT_GRID: Grid = { cols: GRID_SIZE, rows: GRID_SIZE };
// Full-size board: cells aim for this size, so big screens get more cells instead of bigger ones.
export const TARGET_CELL_PX = 28;

// Speed settings (milliseconds per tick)
export const SPEED_CONFIG: Record<Difficulty, number> = {
  easy: 160,
  medium: 100,
  hard: 60,
};

// Score configuration
export const SCORE_CONFIG: Record<Difficulty, number> = {
  easy: 5,
  medium: 10,
  hard: 20,
};

// Game configuration
export const GAME_CONFIG: GameConfig = {
  gridSize: GRID_SIZE,
  speed: SPEED_CONFIG,
  scorePerApple: SCORE_CONFIG,
};

// Bonus thresholds
export const BONUS_CONFIG = {
  multiplierEvery: 10, // Every 10 apples
  lifeEvery: 30, // Every 30 apples
  maxBonusLives: 3,
};

// Time attack length (seconds)
export const TIME_ATTACK_SECONDS = 120;

// Survival: each apple makes the game this much faster (10 apples = 1.4x)
export const SURVIVAL_SPEEDUP_PER_APPLE = 0.04;

// Golden apples: chance to appear after a normal apple, lifetime in ticks, point multiplier
export const GOLDEN_CONFIG = {
  spawnChance: 0.25,
  lifetimeTicks: 40,
  pointsMultiplier: 5,
};

// Fastest allowed tick (ms)
export const MIN_TICK_MS = 40;

// Invincibility duration (in ticks)
export const INVINCIBILITY_TICKS = 3;

// Direction queue limit
export const MAX_DIRECTION_QUEUE = 2;

// Direction debounce (milliseconds)
export const DIRECTION_DEBOUNCE = 50;

// Single-player modes, in menu order (2 players is a separate screen).
export const GAME_MODES: GameMode[] = ['classic', 'levels', 'timeAttack', 'survival', 'zen', 'golden', 'custom', 'daily'];
export const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];
