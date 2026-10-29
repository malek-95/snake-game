import type { Position, Direction, LevelConfig, Grid } from '../types/game.types';
import { GRID_SIZE, DEFAULT_GRID, TARGET_CELL_PX } from '../constants/game.constants';

/**
 * Grid that fills a w x h pixel area with square cells, never fewer than 20 cells per side.
 */
export const gridForArea = (w: number, h: number): Grid => {
  const cell = Math.min(TARGET_CELL_PX, w / GRID_SIZE, h / GRID_SIZE);
  if (!(cell > 0)) return DEFAULT_GRID;
  return { cols: Math.floor(w / cell), rows: Math.floor(h / cell) };
};

/**
 * 3-long snake in the middle of the grid, facing right.
 */
export const initialSnake = (grid: Grid = DEFAULT_GRID): Position[] => {
  const x = Math.floor(grid.cols / 2);
  const y = Math.floor(grid.rows / 2);
  return [{ x, y }, { x: x - 1, y }, { x: x - 2, y }];
};

/**
 * Check if a position is safe (not in spawn zone)
 */
export const isSafePosition = (x: number, y: number, center: number): boolean => {
  return !(x >= center - 5 && x <= center + 2 && y >= center - 2 && y <= center + 2);
};

/**
 * Get a random position that doesn't collide with snake or obstacles
 */
export const getRandomPosition = (
  snake: Position[],
  obstacles: Position[] = [],
  grid: Grid = DEFAULT_GRID,
  rng: () => number = Math.random,
): Position => {
  const taken = new Set([...snake, ...obstacles].map(p => `${p.x},${p.y}`));
  const free: Position[] = [];
  for (let y = 0; y < grid.rows; y++) {
    for (let x = 0; x < grid.cols; x++) {
      if (!taken.has(`${x},${y}`)) free.push({ x, y });
    }
  }
  // shortcut: a completely full board puts food off-grid (unreachable); add a "you win" state if that ever matters.
  if (free.length === 0) return { x: -1, y: -1 };
  return free[Math.floor(rng() * free.length)];
};

/**
 * Get the next position based on direction
 */
export const getNextPosition = (current: Position, direction: Direction): Position => {
  switch (direction) {
    case 'UP':
      return { x: current.x, y: current.y - 1 };
    case 'DOWN':
      return { x: current.x, y: current.y + 1 };
    case 'LEFT':
      return { x: current.x - 1, y: current.y };
    case 'RIGHT':
      return { x: current.x + 1, y: current.y };
  }
};

/**
 * Check if position is out of bounds
 */
export const isOutOfBounds = (pos: Position, grid: Grid = DEFAULT_GRID): boolean => {
  return pos.x < 0 || pos.x >= grid.cols || pos.y < 0 || pos.y >= grid.rows;
};

/**
 * Wrap position around the grid
 */
export const wrapPosition = (pos: Position, grid: Grid = DEFAULT_GRID): Position => {
  return {
    x: (pos.x + grid.cols) % grid.cols,
    y: (pos.y + grid.rows) % grid.rows,
  };
};

/**
 * Check if position collides with any obstacle
 */
export const collidesWithObstacle = (pos: Position, obstacles: Position[]): boolean => {
  return obstacles.some(obs => obs.x === pos.x && obs.y === pos.y);
};

/**
 * Check if position collides with snake body
 */
export const collidesWithSnake = (pos: Position, snake: Position[], excludeTail: boolean = false): boolean => {
  const bodyToCheck = excludeTail ? snake.slice(0, -1) : snake;
  return bodyToCheck.some(segment => segment.x === pos.x && segment.y === pos.y);
};

/**
 * Get opposite direction
 */
export const getOppositeDirection = (direction: Direction): Direction => {
  const opposites: Record<Direction, Direction> = {
    UP: 'DOWN',
    DOWN: 'UP',
    LEFT: 'RIGHT',
    RIGHT: 'LEFT',
  };
  return opposites[direction];
};

/**
 * Generate level configuration
 */
export const generateLevelConfig = (level: number): LevelConfig => {
  const obstacles: Position[] = [];
  const applesToComplete = 5 + level * 2;
  const speedMultiplier = 1 + (level - 1) * 0.1;
  const center = Math.floor(GRID_SIZE / 2);
  
  const addObstacle = (x: number, y: number) => {
    if (isSafePosition(x, y, center) && !obstacles.some(o => o.x === x && o.y === y)) {
      obstacles.push({ x, y });
    }
  };

  // Level 1: Simple corners
  if (level >= 1) {
    addObstacle(4, 4); addObstacle(4, 5); addObstacle(5, 4);
    addObstacle(15, 15); addObstacle(15, 14); addObstacle(14, 15);
  }
  
  // Level 2: Horizontal walls
  if (level >= 2) {
    for (let i = 6; i <= 13; i++) {
      addObstacle(i, 3);
      addObstacle(i, 16);
    }
  }
  
  // Level 3: Vertical walls + corners
  if (level >= 3) {
    for (let i = 4; i <= 7; i++) {
      addObstacle(3, i);
    }
    for (let i = 12; i <= 15; i++) {
      addObstacle(16, i);
    }
    addObstacle(5, 5); addObstacle(6, 6);
    addObstacle(14, 14); addObstacle(15, 15);
  }
  
  // Level 4: Cross pattern
  if (level >= 4) {
    for (let i = 5; i <= 14; i++) {
      if (i !== center) {
        addObstacle(i, center - 4);
        addObstacle(i, center + 4);
      }
    }
  }
  
  // Level 5: Diagonal walls
  if (level >= 5) {
    for (let i = 0; i < 5; i++) {
      addObstacle(3 + i, 3 + i);
      addObstacle(16 - i, 3 + i);
      addObstacle(3 + i, 16 - i);
      addObstacle(16 - i, 16 - i);
    }
  }
  
  // Level 6+: Random obstacles
  if (level >= 6) {
    const extraObstacles = Math.min((level - 5) * 4, 25);
    for (let i = 0; i < extraObstacles; i++) {
      let pos: Position;
      let attempts = 0;
      do {
        pos = {
          x: Math.floor(Math.random() * GRID_SIZE),
          y: Math.floor(Math.random() * GRID_SIZE),
        };
        attempts++;
      } while (
        attempts < 100 &&
        (obstacles.some(o => o.x === pos.x && o.y === pos.y) ||
         !isSafePosition(pos.x, pos.y, center))
      );
      if (attempts < 100) obstacles.push(pos);
    }
  }

  return { obstacles, applesToComplete, speedMultiplier };
};

/**
 * Find safe spawn position for snake
 */
export const findSafeSpawnPosition = (
  snakeLength: number,
  obstacles: Position[],
  grid: Grid = DEFAULT_GRID
): { x: number; y: number } | null => {
  const centerX = Math.floor(grid.cols / 2);
  const centerY = Math.floor(grid.rows / 2);
  
  for (let offsetY = -3; offsetY <= 3; offsetY++) {
    for (let offsetX = -3; offsetX <= 5; offsetX++) {
      const testX = centerX + offsetX;
      const testY = centerY + offsetY;
      
      if (testX < 0 || testX >= grid.cols || testY < 0 || testY >= grid.rows) continue;
      
      let fits = true;
      for (let i = 0; i < snakeLength && fits; i++) {
        const segX = testX - i;
        if (segX < 0 || obstacles.some(obs => obs.x === segX && obs.y === testY)) {
          fits = false;
          break;
        }
      }
      
      if (fits) {
        for (let ahead = 1; ahead <= 3; ahead++) {
          const aheadX = testX + ahead;
          if (aheadX >= grid.cols || obstacles.some(obs => obs.x === aheadX && obs.y === testY)) {
            fits = false;
            break;
          }
        }
      }
      
      if (fits) {
        return { x: testX, y: testY };
      }
    }
  }
  
  return null;
};

/** Seeded random numbers (mulberry32): the same seed always gives the same sequence. */
export const seededRandom = (seed: number) => {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let r = Math.imul(s ^ (s >>> 15), 1 | s);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
};

/** Today's date in UTC (YYYY-MM-DD): the daily challenge changes at midnight UTC for everyone. */
export const todayKey = (now = new Date()) => now.toISOString().slice(0, 10);

const hashString = (text: string) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193);
  return h >>> 0;
};

/**
 * The daily challenge for a date: everyone gets the same asteroid layout and, through `seed`,
 * the same apple positions. Walls stay out of the snake's start zone.
 */
export const dailyChallenge = (day: string) => {
  const seed = hashString(`snake-daily-${day}`);
  const rng = seededRandom(seed);
  const center = Math.floor(GRID_SIZE / 2);
  const walls = new Map<string, Position>();
  const clusters = 5 + Math.floor(rng() * 3);
  for (let c = 0; c < clusters; c++) {
    let x = Math.floor(rng() * GRID_SIZE);
    let y = Math.floor(rng() * GRID_SIZE);
    const size = 2 + Math.floor(rng() * 4);
    for (let i = 0; i < size; i++) {
      if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE && isSafePosition(x, y, center)) walls.set(`${x},${y}`, { x, y });
      if (rng() < 0.5) x += rng() < 0.5 ? 1 : -1;
      else y += rng() < 0.5 ? 1 : -1;
    }
  }
  return { seed, obstacles: [...walls.values()] };
};
