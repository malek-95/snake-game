import { useState, useCallback, useEffect, useRef } from 'react';

export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type GameState = 'idle' | 'playing' | 'paused' | 'gameover';

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

function getRandomPosition(snake: Position[]): Position {
  let pos: Position;
  do {
    pos = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    };
  } while (snake.some(segment => segment.x === pos.x && segment.y === pos.y));
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
      
      // Generate new food away from snake
      const newFood = getRandomPosition(newSnake);
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
      const newFood = getRandomPosition(newSnake);
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
    gameLoopRef.current = window.setInterval(moveSnake, SPEED_MAP[difficulty]);
  }, [clearGameLoop, moveSnake, difficulty]);

  const startGame = useCallback(() => {
    const initialSnake = [...INITIAL_SNAKE];
    const initialFood = getRandomPosition(initialSnake);
    
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

  const changeDirection = useCallback((newDir: Direction) => {
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
    gridSize: GRID_SIZE,
    startGame,
    togglePause,
    changeDirection,
    changeDifficulty,
    toggleWrapAround,
  };
}
