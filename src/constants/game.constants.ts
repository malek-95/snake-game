import type { GameConfig, Difficulty } from '../types/game.types';

// Grid configuration
export const GRID_SIZE = 20;

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

// Initial snake position
export const INITIAL_SNAKE = [
  { x: 10, y: 10 },
  { x: 9, y: 10 },
  { x: 8, y: 10 },
];

// Bonus thresholds
export const BONUS_CONFIG = {
  multiplierEvery: 10, // Every 10 apples
  lifeEvery: 30, // Every 30 apples
  maxBonusLives: 3,
};

// Invincibility duration (in ticks)
export const INVINCIBILITY_TICKS = 3;

// Direction queue limit
export const MAX_DIRECTION_QUEUE = 2;

// Direction debounce (milliseconds)
export const DIRECTION_DEBOUNCE = 50;
