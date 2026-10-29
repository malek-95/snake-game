import type { Position, Direction, LevelConfig } from '../types/game.types';
import { GRID_SIZE, INITIAL_SNAKE } from '../constants/game.constants';

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
  obstacles: Position[] = []
): Position => {
  let pos: Position;
  let attempts = 0;
  
  do {
    pos = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    };
    attempts++;
    if (attempts > 100) break;
  } while (
    snake.some(segment => segment.x === pos.x && segment.y === pos.y) ||
    obstacles.some(obs => obs.x === pos.x && obs.y === pos.y)
  );
  
  return pos;
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
export const isOutOfBounds = (pos: Position): boolean => {
  return pos.x < 0 || pos.x >= GRID_SIZE || pos.y < 0 || pos.y >= GRID_SIZE;
};

/**
 * Wrap position around the grid
 */
export const wrapPosition = (pos: Position): Position => {
  return {
    x: (pos.x + GRID_SIZE) % GRID_SIZE,
    y: (pos.y + GRID_SIZE) % GRID_SIZE,
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
  obstacles: Position[]
): { x: number; y: number } | null => {
  const center = Math.floor(GRID_SIZE / 2);
  
  for (let offsetY = -3; offsetY <= 3; offsetY++) {
    for (let offsetX = -3; offsetX <= 5; offsetX++) {
      const testX = center + offsetX;
      const testY = center + offsetY;
      
      if (testX < 0 || testX >= GRID_SIZE || testY < 0 || testY >= GRID_SIZE) continue;
      
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
          if (aheadX >= GRID_SIZE || obstacles.some(obs => obs.x === aheadX && obs.y === testY)) {
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
