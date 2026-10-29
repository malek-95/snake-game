// Core game types
export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type GameState = 'idle' | 'playing' | 'paused' | 'gameover';
export type GameMode = 'classic' | 'levels';
export type BoardSize = 'small' | 'medium' | 'large';
export type Language = 'fr' | 'en';

// Position types
export interface Position {
  x: number;
  y: number;
}

export interface Grid {
  cols: number;
  rows: number;
}

// Game configuration
export interface GameConfig {
  gridSize: number;
  speed: Record<Difficulty, number>;
  scorePerApple: Record<Difficulty, number>;
}

// Level configuration
export interface LevelConfig {
  obstacles: Position[];
  applesToComplete: number;
  speedMultiplier: number;
}

// Event types
export interface BonusEvent {
  id: number;
  multiplier: number;
  applesCount: number;
}

export interface LifeLostEvent {
  id: number;
  livesRemaining: number;
}

export interface LifeGainedEvent {
  id: number;
  lives: number;
}

export interface LevelCompleteEvent {
  id: number;
  level: number;
}

// Game state
export interface GameStateData {
  snake: Position[];
  food: Position;
  direction: Direction;
  gameState: GameState;
  score: number;
  highScore: number;
  difficulty: Difficulty;
  wrapAround: boolean;
  applesEaten: number;
  multiplier: number;
  lives: number;
  bonusLivesGiven: number;
  gameMode: GameMode;
  level: number;
  obstacles: Position[];
  levelApples: number;
  invincible: boolean;
}

// Hook return type
export interface UseSnakeGameReturn extends GameStateData {
  grid: Grid;
  setPreferredGrid: (grid: Grid) => void;
  bonusEvent: BonusEvent | null;
  lifeLostEvent: LifeLostEvent | null;
  lifeGainedEvent: LifeGainedEvent | null;
  levelCompleteEvent: LevelCompleteEvent | null;
  startGame: () => void;
  togglePause: () => void;
  changeDirection: (dir: Direction) => void;
  changeDifficulty: (difficulty: Difficulty) => void;
  toggleWrapAround: () => void;
  changeGameMode: (mode: GameMode) => void;
}
