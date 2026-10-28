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

  // Generate obstacles based on level
  if (level >= 1) {
    // Level 1: Simple corners
    obstacles.push({ x: 5, y: 5 }, { x: 5, y: 6 }, { x: 6, y: 5 });
    obstacles.push({ x: 14, y: 14 }, { x: 14, y: 13 }, { x: 13, y: 14 });
  }
  
  if (level >= 2) {
    // Level 2: Add walls
    for (let i = 8; i <= 12; i++) {
      obstacles.push({ x: i, y: 3 });
    }
  }
  
  if (level >= 3) {
    // Level 3: Add more walls
    for (let i = 8; i <= 12; i++) {
      obstacles.push({ x: i, y: 16 });
    }
    obstacles.push({ x: 3, y: 10 }, { x: 4, y: 10 }, { x: 3, y: 11 });
    obstacles.push({ x: 16, y: 10 }, { x: 15, y: 10 }, { x: 16, y: 11 });
  }
  
  if (level >= 4) {
    // Level 4: Maze-like
    for (let i = 7; i <= 13; i++) {
      if (i !== 10) obstacles.push({ x: i, y: 7 });
      if (i !== 10) obstacles.push({ x: i, y: 12 });
    }
  }
  
  if (level >= 5) {
    // Level 5+: Add random obstacles
    const extraObstacles = Math.min(level - 4, 10);
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
        attempts < 50 &&
        (obstacles.some(o => o.x === pos.x && o.y === pos.y) ||
         INITIAL_SNAKE.some(s => s.x === pos.x && s.y === pos.y) ||
         (pos.x >= 8 && pos.x <= 12 && pos.y >= 8 && pos.y <= 12))
      );
      if (attempts < 50) obstacles.push(pos);
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
      
      // Reset snake position
      const newSnake = [...INITIAL_SNAKE];
      setSnake(newSnake);
      snakeRef.current = newSnake;
      
      // Reset direction
      directionRef.current = 'RIGHT';
      setDirection('RIGHT');
      
      // Generate new food away from snake and obstacles
      const newFood = getRandomPosition(newSnake, obstaclesRef.current);
      setFood(newFood);
      foodRef.current = newFood;
      
      // Reset multiplier on death
      multiplierRef.current = 1;
      setMultiplier(1);
    } else {
      // No lives left, game over
      setGameState('gameover');
    }
  }, []);

  const moveSnake = useCallback(() => {
    if (gameStateRef.current !== 'playing') return;

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

    // Check obstacle collision (in levels mode)
    if (gameModeRef.current === 'levels' && obstaclesRef.current.some(obs => obs.x === newHead.x && obs.y === newHead.y)) {
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

  const lastDirectionChangeRef = useRef<number>(0);

  const changeDirection = useCallback((newDir: Direction) => {
    // Prevent rapid direction changes (debounce 50ms)
    const now = Date.now();
    if (now - lastDirectionChangeRef.current < 50) return;
    lastDirectionChangeRef.current = now;

    const opposites: Record<Direction, Direction> = {
      UP: 'DOWN',
      DOWN: 'UP',
      LEFT: 'RIGHT',
      RIGHT: 'LEFT',
    };
    const currentDir = directionRef.current;
    if (opposites[newDir] !== currentDir && newDir !== currentDir) {
      directionRef.current = newDir;
      setDirection(newDir);
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
    gridSize: GRID_SIZE,
    startGame,
    togglePause,
    changeDirection,
    changeDifficulty,
    toggleWrapAround,
    changeGameMode,
  };
}
