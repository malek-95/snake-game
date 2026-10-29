import { useState, useCallback, useEffect, useRef } from 'react';
import type {
  Direction,
  Difficulty,
  GameState,
  GameMode,
  Position,
  BonusEvent,
  LifeLostEvent,
  LifeGainedEvent,
  LevelCompleteEvent,
  UseSnakeGameReturn,
} from '../types/game.types';
import {
  GRID_SIZE,
  SPEED_CONFIG,
  SCORE_CONFIG,
  INITIAL_SNAKE,
  BONUS_CONFIG,
  INVINCIBILITY_TICKS,
  MAX_DIRECTION_QUEUE,
} from '../constants/game.constants';
import {
  getRandomPosition,
  getNextPosition,
  isOutOfBounds,
  wrapPosition,
  collidesWithObstacle,
  collidesWithSnake,
  getOppositeDirection,
  generateLevelConfig,
  findSafeSpawnPosition,
} from '../utils/game.utils';

export const useSnakeGame = (): UseSnakeGameReturn => {
  // Game state
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
  
  // Game settings
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [wrapAround, setWrapAround] = useState(false);
  const [gameMode, setGameMode] = useState<GameMode>('classic');
  
  // Progress tracking
  const [applesEaten, setApplesEaten] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [lives, setLives] = useState(1);
  const [bonusLivesGiven, setBonusLivesGiven] = useState(0);
  
  // Level mode
  const [level, setLevel] = useState(1);
  const [obstacles, setObstacles] = useState<Position[]>([]);
  const [levelApples, setLevelApples] = useState(0);
  
  // Invincibility
  const [invincible, setInvincible] = useState(false);
  
  // Events
  const [bonusEvent, setBonusEvent] = useState<BonusEvent | null>(null);
  const [lifeLostEvent, setLifeLostEvent] = useState<LifeLostEvent | null>(null);
  const [lifeGainedEvent, setLifeGainedEvent] = useState<LifeGainedEvent | null>(null);
  const [levelCompleteEvent, setLevelCompleteEvent] = useState<LevelCompleteEvent | null>(null);

  // Refs for game loop
  const directionRef = useRef<Direction>('RIGHT');
  const gameLoopRef = useRef<number | null>(null);
  const snakeRef = useRef<Position[]>(INITIAL_SNAKE);
  const foodRef = useRef<Position>({ x: 15, y: 10 });
  const scoreRef = useRef(0);
  const gameStateRef = useRef<GameState>('idle');
  const wrapAroundRef = useRef(false);
  const applesEatenRef = useRef(0);
  const multiplierRef = useRef(1);
  const livesRef = useRef(1);
  const bonusLivesGivenRef = useRef(0);
  const gameModeRef = useRef<GameMode>('classic');
  const levelRef = useRef(1);
  const obstaclesRef = useRef<Position[]>([]);
  const levelApplesRef = useRef(0);
  const directionQueueRef = useRef<Direction[]>([]);
  const invincibleTicksRef = useRef(0);
  const eventIdRef = useRef(0);

  // Sync refs with state
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

  // Auto-dismiss events
  useEffect(() => {
    if (bonusEvent) {
      const timer = setTimeout(() => setBonusEvent(null), 1800);
      return () => clearTimeout(timer);
    }
  }, [bonusEvent]);

  useEffect(() => {
    if (lifeLostEvent) {
      const timer = setTimeout(() => setLifeLostEvent(null), 1500);
      return () => clearTimeout(timer);
    }
  }, [lifeLostEvent]);

  useEffect(() => {
    if (lifeGainedEvent) {
      const timer = setTimeout(() => setLifeGainedEvent(null), 1800);
      return () => clearTimeout(timer);
    }
  }, [lifeGainedEvent]);

  useEffect(() => {
    if (levelCompleteEvent) {
      const timer = setTimeout(() => setLevelCompleteEvent(null), 2000);
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
      const newLives = currentLives - 1;
      livesRef.current = newLives;
      setLives(newLives);
      
      eventIdRef.current += 1;
      setLifeLostEvent({
        id: eventIdRef.current,
        livesRemaining: newLives,
      });
      
      const currentSnake = snakeRef.current;
      const snakeLength = currentSnake.length;
      const obstacles = obstaclesRef.current;
      
      const safePos = findSafeSpawnPosition(snakeLength, obstacles);
      
      if (safePos) {
        const newSnake: Position[] = [];
        for (let i = 0; i < snakeLength; i++) {
          newSnake.push({ x: safePos.x - i, y: safePos.y });
        }
        setSnake(newSnake);
        snakeRef.current = newSnake;
      } else {
        let maxLength = 1;
        const center = Math.floor(GRID_SIZE / 2);
        for (let i = 0; i < snakeLength; i++) {
          const segX = center - i;
          if (segX < 0 || obstacles.some(obs => obs.x === segX && obs.y === center)) {
            break;
          }
          maxLength = i + 1;
        }
        
        const newSnake: Position[] = [];
        for (let i = 0; i < maxLength; i++) {
          newSnake.push({ x: center - i, y: center });
        }
        setSnake(newSnake);
        snakeRef.current = newSnake;
      }
      
      directionRef.current = 'RIGHT';
      directionQueueRef.current = [];
      setDirection('RIGHT');
      
      const newFood = getRandomPosition(snakeRef.current, obstacles);
      setFood(newFood);
      foodRef.current = newFood;
      
      multiplierRef.current = 1;
      setMultiplier(1);
      
      invincibleTicksRef.current = INVINCIBILITY_TICKS;
      setInvincible(true);
    } else {
      setGameState('gameover');
    }
  }, []);

  const moveSnake = useCallback(() => {
    if (gameStateRef.current !== 'playing') return;

    if (directionQueueRef.current.length > 0) {
      const nextDir = directionQueueRef.current.shift()!;
      directionRef.current = nextDir;
      setDirection(nextDir);
    }

    const currentSnake = snakeRef.current;
    const currentFood = foodRef.current;
    const currentDir = directionRef.current;
    const head = currentSnake[0];
    
    let newHead = getNextPosition(head, currentDir);

    if (isOutOfBounds(newHead)) {
      if (wrapAroundRef.current) {
        newHead = wrapPosition(newHead);
      } else {
        handleDeath();
        return;
      }
    }

    const willEatFood = newHead.x === currentFood.x && newHead.y === currentFood.y;
    
    if (collidesWithSnake(newHead, currentSnake, !willEatFood)) {
      handleDeath();
      return;
    }

    if (invincibleTicksRef.current > 0) {
      invincibleTicksRef.current--;
      if (invincibleTicksRef.current === 0) {
        setInvincible(false);
      }
    } else if (gameModeRef.current === 'levels' && collidesWithObstacle(newHead, obstaclesRef.current)) {
      handleDeath();
      return;
    }

    let newSnake: Position[];
    
    if (willEatFood) {
      newSnake = [newHead, ...currentSnake];
      
      const newApplesEaten = applesEatenRef.current + 1;
      applesEatenRef.current = newApplesEaten;
      setApplesEaten(newApplesEaten);
      
      let currentMultiplier = multiplierRef.current;
      if (newApplesEaten % BONUS_CONFIG.multiplierEvery === 0) {
        currentMultiplier = Math.floor(newApplesEaten / BONUS_CONFIG.multiplierEvery) + 1;
        multiplierRef.current = currentMultiplier;
        setMultiplier(currentMultiplier);
        
        eventIdRef.current += 1;
        setBonusEvent({
          id: eventIdRef.current,
          multiplier: currentMultiplier,
          applesCount: newApplesEaten,
        });
      }
      
      if (newApplesEaten % BONUS_CONFIG.lifeEvery === 0 && bonusLivesGivenRef.current < BONUS_CONFIG.maxBonusLives) {
        bonusLivesGivenRef.current += 1;
        setBonusLivesGiven(bonusLivesGivenRef.current);
        
        const newLives = livesRef.current + 1;
        livesRef.current = newLives;
        setLives(newLives);
        
        eventIdRef.current += 1;
        setLifeGainedEvent({
          id: eventIdRef.current,
          lives: newLives,
        });
      }
      
      if (gameModeRef.current === 'levels') {
        const newLevelApples = levelApplesRef.current + 1;
        levelApplesRef.current = newLevelApples;
        setLevelApples(newLevelApples);
        
        const levelConfig = generateLevelConfig(levelRef.current);
        if (newLevelApples >= levelConfig.applesToComplete) {
          const completedLevel = levelRef.current;
          const nextLevel = completedLevel + 1;
          
          eventIdRef.current += 1;
          setLevelCompleteEvent({
            id: eventIdRef.current,
            level: completedLevel,
          });
          
          levelRef.current = nextLevel;
          setLevel(nextLevel);
          levelApplesRef.current = 0;
          setLevelApples(0);
          
          const nextLevelConfig = generateLevelConfig(nextLevel);
          setObstacles(nextLevelConfig.obstacles);
          obstaclesRef.current = nextLevelConfig.obstacles;
          
          const resetSnake = [...INITIAL_SNAKE];
          setSnake(resetSnake);
          snakeRef.current = resetSnake;
          directionRef.current = 'RIGHT';
          directionQueueRef.current = [];
          setDirection('RIGHT');
          
          const newFood = getRandomPosition(resetSnake, nextLevelConfig.obstacles);
          setFood(newFood);
          foodRef.current = newFood;
          
          return;
        }
      }
      
      const basePoints = SCORE_CONFIG[difficulty];
      const earnedPoints = basePoints * currentMultiplier;
      const newScore = scoreRef.current + earnedPoints;
      setScore(newScore);
      scoreRef.current = newScore;

      setHighScore(prev => {
        if (newScore > prev) {
          try {
            localStorage.setItem('snake-high-score', newScore.toString());
          } catch { /* ignore */ }
          return newScore;
        }
        return prev;
      });

      const newFood = getRandomPosition(newSnake, obstaclesRef.current);
      setFood(newFood);
      foodRef.current = newFood;
    } else {
      newSnake = [newHead, ...currentSnake.slice(0, -1)];
    }

    setSnake(newSnake);
    snakeRef.current = newSnake;
  }, [difficulty, handleDeath]);

  const startGameLoop = useCallback(() => {
    clearGameLoop();
    const baseSpeed = SPEED_CONFIG[difficulty];
    const speedMultiplier = gameModeRef.current === 'levels' ? generateLevelConfig(levelRef.current).speedMultiplier : 1;
    const actualSpeed = Math.max(40, baseSpeed / speedMultiplier);
    gameLoopRef.current = window.setInterval(moveSnake, actualSpeed);
  }, [clearGameLoop, moveSnake, difficulty]);

  const startGame = useCallback(() => {
    const initialSnake = [...INITIAL_SNAKE];
    
    let initialObstacles: Position[] = [];
    if (gameModeRef.current === 'levels') {
      const levelConfig = generateLevelConfig(1);
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
    invincibleTicksRef.current = 0;
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

  useEffect(() => {
    if (gameState === 'playing') {
      startGameLoop();
    } else {
      clearGameLoop();
    }
    return clearGameLoop;
  }, [gameState, startGameLoop, clearGameLoop]);

  const changeDirection = useCallback((newDir: Direction) => {
    const queue = directionQueueRef.current;
    const lastDir = queue.length > 0 ? queue[queue.length - 1] : directionRef.current;
    
    if (getOppositeDirection(newDir) !== lastDir && newDir !== lastDir) {
      if (queue.length < MAX_DIRECTION_QUEUE) {
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
    lives,
    bonusLivesGiven,
    gameMode,
    level,
    obstacles,
    levelApples,
    invincible,
    gridSize: GRID_SIZE,
    bonusEvent,
    lifeLostEvent,
    lifeGainedEvent,
    levelCompleteEvent,
    startGame,
    togglePause,
    changeDirection,
    changeDifficulty,
    toggleWrapAround,
    changeGameMode,
  };
};
