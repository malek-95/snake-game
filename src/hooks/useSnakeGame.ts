import { useState, useCallback, useEffect, useRef } from 'react';

export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type GameState = 'idle' | 'playing' | 'paused' | 'gameover';
export type GameMode = 'classic' | 'levels';

interface Position {
  x: number;
  y: number;
}

const GRID_SIZE = 20;

const SPEED_MAP: Record<Difficulty, number> = {
  easy: 160,
  medium: 100,
  hard: 60,
};

const SCORE_MAP: Record<Difficulty, number> = {
  easy: 5,
  medium: 10,
  hard: 20,
};

interface LevelConfig {
  obstacles: Position[];
  applesToComplete: number;
  speedMultiplier: number;
}

const generateLevelConfig = (level: number): LevelConfig => {
  const obstacles: Position[] = [];
  const applesToComplete = 5 + level * 2;
  const speedMultiplier = 1 + (level - 1) * 0.1;
  const center = Math.floor(GRID_SIZE / 2);
  
  // Helper to check if position is safe (not in spawn zone)
  const isSafe = (x: number, y: number) => {
    // Keep a larger center area clear for snake spawn (can accommodate longer snakes)
    return !(x >= center - 5 && x <= center + 2 && y >= center - 2 && y <= center + 2);
  };
  
  // Helper to add obstacle if safe
  const addObstacle = (x: number, y: number) => {
    if (isSafe(x, y) && !obstacles.some(o => o.x === x && o.y === y)) {
      obstacles.push({ x, y });
    }
  };

  // Level 1: Simple corners (6 obstacles)
  if (level >= 1) {
    addObstacle(4, 4); addObstacle(4, 5); addObstacle(5, 4);
    addObstacle(15, 15); addObstacle(15, 14); addObstacle(14, 15);
  }
  
  // Level 2: Horizontal walls (14 obstacles)
  if (level >= 2) {
    for (let i = 6; i <= 13; i++) {
      addObstacle(i, 3);
    }
    for (let i = 6; i <= 13; i++) {
      addObstacle(i, 16);
    }
  }
  
  // Level 3: Vertical walls + corners (16 obstacles)
  if (level >= 3) {
    for (let i = 4; i <= 7; i++) {
      addObstacle(3, i);
    }
    for (let i = 12; i <= 15; i++) {
      addObstacle(16, i);
    }
    // Move corner obstacles further from center
    addObstacle(5, 5); addObstacle(6, 6);
    addObstacle(14, 14); addObstacle(15, 15);
  }
  
  // Level 4: Cross pattern (16 obstacles)
  if (level >= 4) {
    for (let i = 5; i <= 14; i++) {
      if (i !== center) {
        addObstacle(i, center - 4);
        addObstacle(i, center + 4);
      }
    }
  }
  
  // Level 5: Diagonal walls (20 obstacles)
  if (level >= 5) {
    for (let i = 0; i < 5; i++) {
      addObstacle(3 + i, 3 + i);
      addObstacle(16 - i, 3 + i);
      addObstacle(3 + i, 16 - i);
      addObstacle(16 - i, 16 - i);
    }
  }
  
  // Level 6+: Add more random obstacles based on level
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
         !isSafe(pos.x, pos.y))
      );
      if (attempts < 100) obstacles.push(pos);
    }
  }

  return { obstacles, applesToComplete, speedMultiplier };
};

function getRandomPosition(snake: Position[], obstacles: Position[] = []): Position {
  let pos: Position;
  let attempts = 0;
  do {
    pos = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    };
    attempts++;
    if (attempts > 100) break; // Safety fallback
  } while (
    snake.some(segment => segment.x === pos.x && segment.y === pos.y) ||
    obstacles.some(obs => obs.x === pos.x && obs.y === pos.y)
  );
  return pos;
}

const INITIAL_SNAKE: Position[] = [
  { x: 10, y: 10 },
  { x: 9, y: 10 },
  { x: 8, y: 10 },
];

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

export function useSnakeGame() {
  const [snake, setSnake] = useState<Position[]>(INITIAL_SNAKE);
  const [food, setFood] = useState<Position>({ x: 15, y: 10 });
  const [direction, setDirection] = useState<Direction>('RIGHT');
  const [gameState, setGameState] = useState<GameState>('idle');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    try {
      const saved = localStorage.getItem('snake-high-score');
      return saved ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  });
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [wrapAround, setWrapAround] = useState(false);
  const [applesEaten, setApplesEaten] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [bonusEvent, setBonusEvent] = useState<BonusEvent | null>(null);
  const [lives, setLives] = useState(1);
  const [bonusLivesGiven, setBonusLivesGiven] = useState(0);
  const [lifeLostEvent, setLifeLostEvent] = useState<LifeLostEvent | null>(null);
  const [lifeGainedEvent, setLifeGainedEvent] = useState<LifeGainedEvent | null>(null);
  const lifeGainedEventIdRef = useRef(0);
  
  // Levels mode
  const [gameMode, setGameMode] = useState<GameMode>('classic');
  const [level, setLevel] = useState(1);
  const [obstacles, setObstacles] = useState<Position[]>([]);
  const [levelApples, setLevelApples] = useState(0);
  const [levelCompleteEvent, setLevelCompleteEvent] = useState<{ id: number; level: number } | null>(null);
  const levelCompleteEventIdRef = useRef(0);
  const [invincible, setInvincible] = useState(false);

  const directionRef = useRef<Direction>('RIGHT');
  const gameLoopRef = useRef<number | null>(null);
  const snakeRef = useRef<Position[]>(INITIAL_SNAKE);
  const foodRef = useRef<Position>({ x: 15, y: 10 });
  const scoreRef = useRef(0);
  const gameStateRef = useRef<GameState>('idle');
  const wrapAroundRef = useRef(false);
  const applesEatenRef = useRef(0);
  const multiplierRef = useRef(1);
  const bonusEventIdRef = useRef(0);
  const livesRef = useRef(1);
  const bonusLivesGivenRef = useRef(0);
  const lifeLostEventIdRef = useRef(0);
  const gameModeRef = useRef<GameMode>('classic');
  const levelRef = useRef(1);
  const obstaclesRef = useRef<Position[]>([]);
  const levelApplesRef = useRef(0);
  const levelConfigRef = useRef<LevelConfig>(generateLevelConfig(1));
  const directionQueueRef = useRef<Direction[]>([]);
  const invincibleTicksRef = useRef(0);

  // Keep refs in sync
  useEffect(() => { snakeRef.current = snake; }, [snake]);
  useEffect(() => { foodRef.current = food; }, [food]);
  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);
  useEffect(() => { wrapAroundRef.current = wrapAround; }, [wrapAround]);
  useEffect(() => { applesEatenRef.current = applesEaten; }, [applesEaten]);
  useEffect(() => { multiplierRef.current = multiplier; }, [multiplier]);
  useEffect(() => { livesRef.current = lives; }, [lives]);
  useEffect(() => { bonusLivesGivenRef.current = bonusLivesGiven; }, [bonusLivesGiven]);
  useEffect(() => { gameModeRef.current = gameMode; }, [gameMode]);
  useEffect(() => { levelRef.current = level; }, [level]);
  useEffect(() => { obstaclesRef.current = obstacles; }, [obstacles]);
  useEffect(() => { levelApplesRef.current = levelApples; }, [levelApples]);
  
  // Auto-dismiss bonus notification
  useEffect(() => {
    if (bonusEvent) {
      const timer = setTimeout(() => {
        setBonusEvent(null);
      }, 1800);
      return () => clearTimeout(timer);
    }
  }, [bonusEvent]);

  // Auto-dismiss life lost notification
  useEffect(() => {
    if (lifeLostEvent) {
      const timer = setTimeout(() => {
        setLifeLostEvent(null);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [lifeLostEvent]);

  // Auto-dismiss life gained notification
  useEffect(() => {
    if (lifeGainedEvent) {
      const timer = setTimeout(() => {
        setLifeGainedEvent(null);
      }, 1800);
      return () => clearTimeout(timer);
    }
  }, [lifeGainedEvent]);

  // Auto-dismiss level complete notification
  useEffect(() => {
    if (levelCompleteEvent) {
      const timer = setTimeout(() => {
        setLevelCompleteEvent(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [levelCompleteEvent]);

  const clearGameLoop = useCallback(() => {
    if (gameLoopRef.current !== null) {
      clearInterval(gameLoopRef.current);
      gameLoopRef.current = null;
    }
  }, []);

  const handleDeath = useCallback(() => {
    const currentLives = livesRef.current;
    if (currentLives > 1) {
      // Use a life and respawn
      const newLives = currentLives - 1;
      livesRef.current = newLives;
      setLives(newLives);
      
      // Trigger life lost notification
      lifeLostEventIdRef.current += 1;
      setLifeLostEvent({
        id: lifeLostEventIdRef.current,
        livesRemaining: newLives,
      });
      
      // Keep snake size but reposition it safely
      const currentSnake = snakeRef.current;
      const snakeLength = currentSnake.length;
      const obstacles = obstaclesRef.current;
      
      // Find a safe spawn position
      const center = Math.floor(GRID_SIZE / 2);
      let spawnX = center;
      let spawnY = center;
      
      // Try to find a position where the entire snake fits without hitting obstacles
      // Also ensure there's space in front (RIGHT direction) for the first move
      let foundSafePosition = false;
      for (let offsetY = -3; offsetY <= 3 && !foundSafePosition; offsetY++) {
        for (let offsetX = -3; offsetX <= 5 && !foundSafePosition; offsetX++) {
          const testX = center + offsetX;
          const testY = center + offsetY;
          
          // Must be within bounds
          if (testX < 0 || testX >= GRID_SIZE || testY < 0 || testY >= GRID_SIZE) continue;
          
          // Check if snake fits here (going left from spawn point)
          // Also check 2 cells ahead (RIGHT) for first moves
          let fits = true;
          for (let i = 0; i < snakeLength && fits; i++) {
            const segX = testX - i;
            if (segX < 0) {
              fits = false;
              break;
            }
            // Check if this segment hits an obstacle
            if (obstacles.some(obs => obs.x === segX && obs.y === testY)) {
              fits = false;
              break;
            }
          }
          
          // Check space ahead (RIGHT direction)
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
            spawnX = testX;
            spawnY = testY;
            foundSafePosition = true;
          }
        }
      }
      
      // If no safe position found, reduce snake length to fit
      if (!foundSafePosition) {
        // Find maximum length that fits at center, also checking ahead
        let maxLength = 1;
        for (let i = 0; i < snakeLength; i++) {
          const segX = center - i;
          if (segX < 0 || obstacles.some(obs => obs.x === segX && obs.y === center)) {
            break;
          }
          maxLength = i + 1;
        }
        
        // Also check that there's space ahead
        let safeAhead = true;
        for (let ahead = 1; ahead <= 3; ahead++) {
          if (center + ahead >= GRID_SIZE || obstacles.some(obs => obs.x === center + ahead && obs.y === center)) {
            safeAhead = false;
            break;
          }
        }
        
        // If not safe ahead, try other rows
        if (!safeAhead) {
          for (let row = 0; row < GRID_SIZE; row++) {
            if (row === center) continue;
            let rowMaxLen = 0;
            for (let i = 0; i < snakeLength; i++) {
              const segX = center - i;
              if (segX < 0 || obstacles.some(obs => obs.x === segX && obs.y === row)) break;
              rowMaxLen = i + 1;
            }
            let rowSafeAhead = true;
            for (let ahead = 1; ahead <= 3; ahead++) {
              if (center + ahead >= GRID_SIZE || obstacles.some(obs => obs.x === center + ahead && obs.y === row)) {
                rowSafeAhead = false;
                break;
              }
            }
            if (rowSafeAhead && rowMaxLen >= 3) {
              const newSnake: Position[] = [];
              for (let i = 0; i < rowMaxLen; i++) {
                newSnake.push({ x: center - i, y: row });
              }
              setSnake(newSnake);
              snakeRef.current = newSnake;
              foundSafePosition = true;
              break;
            }
          }
        }
        
        if (!foundSafePosition) {
          // Last resort: create snake with reduced length at center
          const newSnake: Position[] = [];
          for (let i = 0; i < maxLength; i++) {
            newSnake.push({ x: center - i, y: center });
          }
          setSnake(newSnake);
          snakeRef.current = newSnake;
        }
      } else {
        // Create snake at safe position
        const newSnake: Position[] = [];
        for (let i = 0; i < snakeLength; i++) {
          newSnake.push({ x: spawnX - i, y: spawnY });
        }
        
        setSnake(newSnake);
        snakeRef.current = newSnake;
      }
      
      // Reset direction and clear queue
      directionRef.current = 'RIGHT';
      directionQueueRef.current = [];
      setDirection('RIGHT');
      
      // Generate new food away from snake and obstacles
      const newFood = getRandomPosition(snakeRef.current, obstacles);
      setFood(newFood);
      foodRef.current = newFood;
      
      // Reset multiplier on death
      multiplierRef.current = 1;
      setMultiplier(1);
      
      // Grant brief invincibility after respawn (3 ticks)
      invincibleTicksRef.current = 3;
      setInvincible(true);
    } else {
      // No lives left, game over
      setGameState('gameover');
    }
  }, []);

  const moveSnake = useCallback(() => {
    if (gameStateRef.current !== 'playing') return;

    // Consume next direction from queue if available
    if (directionQueueRef.current.length > 0) {
      const nextDir = directionQueueRef.current.shift()!;
      directionRef.current = nextDir;
      setDirection(nextDir);
    }

    const currentSnake = snakeRef.current;
    const currentFood = foodRef.current;
    const currentDir = directionRef.current;
    const head = currentSnake[0];

    let newHead: Position;
    switch (currentDir) {
      case 'UP':
        newHead = { x: head.x, y: head.y - 1 };
        break;
      case 'DOWN':
        newHead = { x: head.x, y: head.y + 1 };
        break;
      case 'LEFT':
        newHead = { x: head.x - 1, y: head.y };
        break;
      case 'RIGHT':
        newHead = { x: head.x + 1, y: head.y };
        break;
    }

    // Check wall collision or wrap around
    if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
      if (wrapAroundRef.current) {
        // Wrap around: teleport to the other side
        newHead = {
          x: (newHead.x + GRID_SIZE) % GRID_SIZE,
          y: (newHead.y + GRID_SIZE) % GRID_SIZE,
        };
      } else {
        handleDeath();
        return;
      }
    }

    // Check self collision (exclude tail since it will move)
    const willEatFood = newHead.x === currentFood.x && newHead.y === currentFood.y;
    const bodyToCheck = willEatFood ? currentSnake : currentSnake.slice(0, -1);
    if (bodyToCheck.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
      handleDeath();
      return;
    }

    // Check obstacle collision (in levels mode) - skip if invincible
    if (invincibleTicksRef.current > 0) {
      invincibleTicksRef.current--;
      if (invincibleTicksRef.current === 0) {
        setInvincible(false);
      }
    } else if (gameModeRef.current === 'levels' && obstaclesRef.current.some(obs => obs.x === newHead.x && obs.y === newHead.y)) {
      handleDeath();
      return;
    }

    let newSnake: Position[];
    if (willEatFood) {
      newSnake = [newHead, ...currentSnake];
      
      // Increment apple counter
      const newApplesEaten = applesEatenRef.current + 1;
      applesEatenRef.current = newApplesEaten;
      setApplesEaten(newApplesEaten);
      
      // Check for bonus (every 10 apples)
      let currentMultiplier = multiplierRef.current;
      if (newApplesEaten % 10 === 0) {
        currentMultiplier = Math.floor(newApplesEaten / 10) + 1;
        multiplierRef.current = currentMultiplier;
        setMultiplier(currentMultiplier);
        
        // Trigger bonus event notification
        bonusEventIdRef.current += 1;
        setBonusEvent({
          id: bonusEventIdRef.current,
          multiplier: currentMultiplier,
          applesCount: newApplesEaten,
        });
      }
      
      // Check for extra life (every 30 apples, max 3 bonus lives)
      if (newApplesEaten % 30 === 0 && bonusLivesGivenRef.current < 3) {
        bonusLivesGivenRef.current += 1;
        setBonusLivesGiven(bonusLivesGivenRef.current);
        
        const newLives = livesRef.current + 1;
        livesRef.current = newLives;
        setLives(newLives);
        
        // Trigger life gained notification
        lifeGainedEventIdRef.current += 1;
        setLifeGainedEvent({
          id: lifeGainedEventIdRef.current,
          lives: newLives,
        });
      }
      
      // Level mode: track apples and check level completion
      if (gameModeRef.current === 'levels') {
        const newLevelApples = levelApplesRef.current + 1;
        levelApplesRef.current = newLevelApples;
        setLevelApples(newLevelApples);
        
        if (newLevelApples >= levelConfigRef.current.applesToComplete) {
          // Level complete!
          const completedLevel = levelRef.current;
          const nextLevel = completedLevel + 1;
          
          levelCompleteEventIdRef.current += 1;
          setLevelCompleteEvent({
            id: levelCompleteEventIdRef.current,
            level: completedLevel,
          });
          
          // Advance to next level
          levelRef.current = nextLevel;
          setLevel(nextLevel);
          levelApplesRef.current = 0;
          setLevelApples(0);
          
          // Generate new obstacles for next level
          const nextLevelConfig = generateLevelConfig(nextLevel);
          levelConfigRef.current = nextLevelConfig;
          setObstacles(nextLevelConfig.obstacles);
          obstaclesRef.current = nextLevelConfig.obstacles;
          
          // Reset snake and food for new level
          const resetSnake = [...INITIAL_SNAKE];
          setSnake(resetSnake);
          snakeRef.current = resetSnake;
          directionRef.current = 'RIGHT';
          directionQueueRef.current = [];
          setDirection('RIGHT');
          
          const newFood = getRandomPosition([...resetSnake, ...nextLevelConfig.obstacles]);
          setFood(newFood);
          foodRef.current = newFood;
        }
      }
      
      // Calculate score with multiplier
      const basePoints = SCORE_MAP[difficulty];
      const earnedPoints = basePoints * currentMultiplier;
      const newScore = scoreRef.current + earnedPoints;
      setScore(newScore);
      scoreRef.current = newScore;

      // Update high score
      setHighScore(prev => {
        if (newScore > prev) {
          try {
            localStorage.setItem('snake-high-score', newScore.toString());
          } catch { /* ignore */ }
          return newScore;
        }
        return prev;
      });

      // Generate new food
      const newFood = getRandomPosition(newSnake, obstaclesRef.current);
      setFood(newFood);
      foodRef.current = newFood;
    } else {
      newSnake = [newHead, ...currentSnake.slice(0, -1)];
    }

    setSnake(newSnake);
    snakeRef.current = newSnake;
  }, [difficulty]);

  const startGameLoop = useCallback(() => {
    clearGameLoop();
    const baseSpeed = SPEED_MAP[difficulty];
    const speedMultiplier = gameModeRef.current === 'levels' ? levelConfigRef.current.speedMultiplier : 1;
    const actualSpeed = Math.max(40, baseSpeed / speedMultiplier);
    gameLoopRef.current = window.setInterval(moveSnake, actualSpeed);
  }, [clearGameLoop, moveSnake, difficulty]);

  const startGame = useCallback(() => {
    const initialSnake = [...INITIAL_SNAKE];
    
    // Initialize level config if in levels mode
    let initialObstacles: Position[] = [];
    if (gameModeRef.current === 'levels') {
      const levelConfig = generateLevelConfig(1);
      levelConfigRef.current = levelConfig;
      initialObstacles = levelConfig.obstacles;
      setObstacles(initialObstacles);
      obstaclesRef.current = initialObstacles;
      setLevel(1);
      levelRef.current = 1;
      setLevelApples(0);
      levelApplesRef.current = 0;
      setLevelCompleteEvent(null);
    }
    
    const initialFood = getRandomPosition(initialSnake, initialObstacles);
    
    setSnake(initialSnake);
    snakeRef.current = initialSnake;
    setFood(initialFood);
    foodRef.current = initialFood;
    setDirection('RIGHT');
    directionRef.current = 'RIGHT';
    directionQueueRef.current = [];
    invincibleTicksRef.current = 0;
    setScore(0);
    scoreRef.current = 0;
    setApplesEaten(0);
    applesEatenRef.current = 0;
    setMultiplier(1);
    multiplierRef.current = 1;
    setBonusEvent(null);
    setLives(1);
    livesRef.current = 1;
    setBonusLivesGiven(0);
    bonusLivesGivenRef.current = 0;
    setGameState('playing');
    gameStateRef.current = 'playing';
  }, []);

  const togglePause = useCallback(() => {
    if (gameStateRef.current === 'playing') {
      setGameState('paused');
      gameStateRef.current = 'paused';
    } else if (gameStateRef.current === 'paused') {
      setGameState('playing');
      gameStateRef.current = 'playing';
    }
  }, []);

  // Manage game loop based on game state
  useEffect(() => {
    if (gameState === 'playing') {
      startGameLoop();
    } else {
      clearGameLoop();
    }
    return clearGameLoop;
  }, [gameState, startGameLoop, clearGameLoop]);

  const changeDirection = useCallback((newDir: Direction) => {
    const opposites: Record<Direction, Direction> = {
      UP: 'DOWN',
      DOWN: 'UP',
      LEFT: 'RIGHT',
      RIGHT: 'LEFT',
    };
    
    // Get the last direction to validate against (from queue or current)
    const queue = directionQueueRef.current;
    const lastDir = queue.length > 0 ? queue[queue.length - 1] : directionRef.current;
    
    // Only add to queue if it's not opposite and not the same as last direction
    if (opposites[newDir] !== lastDir && newDir !== lastDir) {
      // Limit queue size to prevent buildup
      if (queue.length < 2) {
        queue.push(newDir);
      }
    }
  }, []);

  const changeDifficulty = useCallback((newDifficulty: Difficulty) => {
    setDifficulty(newDifficulty);
  }, []);

  const toggleWrapAround = useCallback(() => {
    setWrapAround(prev => !prev);
  }, []);

  const changeGameMode = useCallback((mode: GameMode) => {
    setGameMode(mode);
    gameModeRef.current = mode;
    if (mode === 'levels') {
      // In levels mode, wrap around is not allowed
      setWrapAround(false);
      wrapAroundRef.current = false;
    }
  }, []);

  return {
    snake,
    food,
    direction,
    gameState,
    score,
    highScore,
    difficulty,
    wrapAround,
    applesEaten,
    multiplier,
    bonusEvent,
    lives,
    bonusLivesGiven,
    lifeLostEvent,
    lifeGainedEvent,
    gameMode,
    level,
    obstacles,
    levelApples,
    levelCompleteEvent,
    invincible,
    gridSize: GRID_SIZE,
    startGame,
    togglePause,
    changeDirection,
    changeDifficulty,
    toggleWrapAround,
    changeGameMode,
  };
}
