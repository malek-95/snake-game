import { useState, useCallback, useEffect, useRef } from 'react';
import type {
  Direction,
  Difficulty,
  GameState,
  GameMode,
  Position,
  Grid,
  BonusEvent,
  LifeLostEvent,
  LifeGainedEvent,
  LevelCompleteEvent,
  UseSnakeGameReturn,
} from '../types/game.types';
import {
  DEFAULT_GRID,
  SPEED_CONFIG,
  SCORE_CONFIG,
  BONUS_CONFIG,
  INVINCIBILITY_TICKS,
  MAX_DIRECTION_QUEUE,
  TIME_ATTACK_SECONDS,
  SURVIVAL_SPEEDUP_PER_APPLE,
  GOLDEN_CONFIG,
  MIN_TICK_MS,
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
  initialSnake,
  dailyChallenge,
  seededRandom,
  todayKey,
} from '../utils/game.utils';

// Levels and custom levels use hand-placed walls, so they keep the 20x20 grid.
const usesFixedGrid = (mode: GameMode) => mode === 'levels' || mode === 'custom' || mode === 'daily';
const hasWalls = usesFixedGrid;

export const useSnakeGame = (): UseSnakeGameReturn => {
  // Board grid. Locked while a game runs; between games it follows the size the UI asks for.
  const [grid, setGrid] = useState<Grid>(DEFAULT_GRID);
  const gridRef = useRef<Grid>(DEFAULT_GRID);
  const [preferredGrid, setPreferredGridState] = useState<Grid>(DEFAULT_GRID);
  const preferredGridRef = useRef<Grid>(DEFAULT_GRID);

  // Game state
  const [snake, setSnake] = useState<Position[]>(initialSnake);
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
  // The daily challenge is the same for everyone: medium speed and points, seeded apples.
  const playDifficulty: Difficulty = gameMode === 'daily' ? 'medium' : difficulty;
  const rngRef = useRef<() => number>(Math.random);
  
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
  
  // Extra modes
  const [goldenFood, setGoldenFood] = useState<Position | null>(null);
  const goldenFoodRef = useRef<Position | null>(null);
  const goldenTicksRef = useRef(0);
  const [goldenEaten, setGoldenEaten] = useState(0);
  const goldenEatenRef = useRef(0);
  const [timeLeft, setTimeLeft] = useState(TIME_ATTACK_SECONDS);
  const timeLeftRef = useRef(TIME_ATTACK_SECONDS);
  const [tailCuts, setTailCuts] = useState(0);
  const [gameId, setGameId] = useState(0);
  const [tickMs, setTickMs] = useState(SPEED_CONFIG.medium);
  const [customObstacles, setCustomObstacles] = useState<Position[]>([]);
  const customObstaclesRef = useRef<Position[]>([]);

  // Events
  const [bonusEvent, setBonusEvent] = useState<BonusEvent | null>(null);
  const [lifeLostEvent, setLifeLostEvent] = useState<LifeLostEvent | null>(null);
  const [lifeGainedEvent, setLifeGainedEvent] = useState<LifeGainedEvent | null>(null);
  const [levelCompleteEvent, setLevelCompleteEvent] = useState<LevelCompleteEvent | null>(null);

  // Refs for game loop
  const directionRef = useRef<Direction>('RIGHT');
  const gameLoopRef = useRef<number | null>(null);
  const snakeRef = useRef<Position[]>(snake);
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
      
      const safePos = findSafeSpawnPosition(snakeLength, obstacles, gridRef.current);
      
      if (safePos) {
        const newSnake: Position[] = [];
        for (let i = 0; i < snakeLength; i++) {
          newSnake.push({ x: safePos.x - i, y: safePos.y });
        }
        setSnake(newSnake);
        snakeRef.current = newSnake;
      } else {
        let maxLength = 1;
        const centerX = Math.floor(gridRef.current.cols / 2);
        const centerY = Math.floor(gridRef.current.rows / 2);
        for (let i = 0; i < snakeLength; i++) {
          const segX = centerX - i;
          if (segX < 0 || obstacles.some(obs => obs.x === segX && obs.y === centerY)) {
            break;
          }
          maxLength = i + 1;
        }
        
        const newSnake: Position[] = [];
        for (let i = 0; i < maxLength; i++) {
          newSnake.push({ x: centerX - i, y: centerY });
        }
        setSnake(newSnake);
        snakeRef.current = newSnake;
      }
      
      directionRef.current = 'RIGHT';
      directionQueueRef.current = [];
      setDirection('RIGHT');
      
      const newFood = getRandomPosition(snakeRef.current, obstacles, gridRef.current, rngRef.current);
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

    const mode = gameModeRef.current;

    if (isOutOfBounds(newHead, gridRef.current)) {
      if (wrapAroundRef.current || mode === 'zen') {
        newHead = wrapPosition(newHead, gridRef.current);
      } else {
        handleDeath();
        return;
      }
    }

    const willEatFood = newHead.x === currentFood.x && newHead.y === currentFood.y;
    const golden = goldenFoodRef.current;
    const willEatGolden = !!golden && newHead.x === golden.x && newHead.y === golden.y;

    // Golden apples fade after a while.
    if (golden && !willEatGolden && --goldenTicksRef.current <= 0) {
      goldenFoodRef.current = null;
      setGoldenFood(null);
    }

    if (collidesWithSnake(newHead, currentSnake, !(willEatFood || willEatGolden))) {
      if (mode !== 'zen') {
        handleDeath();
        return;
      }
      // Zen: no game over, the snake just loses everything behind the bite.
      const hit = currentSnake.findIndex(seg => seg.x === newHead.x && seg.y === newHead.y);
      const cut = [newHead, ...currentSnake.slice(0, hit)];
      setSnake(cut);
      snakeRef.current = cut;
      setTailCuts(c => c + 1);
      return;
    }

    if (invincibleTicksRef.current > 0) {
      invincibleTicksRef.current--;
      if (invincibleTicksRef.current === 0) {
        setInvincible(false);
      }
    } else if (hasWalls(mode) && collidesWithObstacle(newHead, obstaclesRef.current)) {
      handleDeath();
      return;
    }

    const addScore = (points: number) => {
      const newScore = scoreRef.current + points;
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
    };

    let newSnake: Position[];
    
    if (willEatGolden) {
      newSnake = [newHead, ...currentSnake];
      addScore(SCORE_CONFIG[playDifficulty] * multiplierRef.current * GOLDEN_CONFIG.pointsMultiplier);
      goldenEatenRef.current += 1;
      setGoldenEaten(goldenEatenRef.current);
      goldenFoodRef.current = null;
      setGoldenFood(null);
    } else if (willEatFood) {
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
      
      // Score before the level check: the level-completing apple counts too.
      addScore(SCORE_CONFIG[playDifficulty] * currentMultiplier);

      if (mode === 'levels') {
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
          
          const resetSnake = initialSnake(gridRef.current);
          setSnake(resetSnake);
          snakeRef.current = resetSnake;
          directionRef.current = 'RIGHT';
          directionQueueRef.current = [];
          setDirection('RIGHT');
          
          const newFood = getRandomPosition(resetSnake, nextLevelConfig.obstacles, gridRef.current, rngRef.current);
          setFood(newFood);
          foodRef.current = newFood;
          
          return;
        }
      }
      
      const blocked = goldenFoodRef.current ? [...obstaclesRef.current, goldenFoodRef.current] : obstaclesRef.current;
      const newFood = getRandomPosition(newSnake, blocked, gridRef.current, rngRef.current);
      setFood(newFood);
      foodRef.current = newFood;

      if (mode === 'golden' && !goldenFoodRef.current && Math.random() < GOLDEN_CONFIG.spawnChance) {
        const g = getRandomPosition(newSnake, [...obstaclesRef.current, newFood], gridRef.current);
        goldenFoodRef.current = g;
        goldenTicksRef.current = GOLDEN_CONFIG.lifetimeTicks;
        setGoldenFood(g);
      }
    } else {
      newSnake = [newHead, ...currentSnake.slice(0, -1)];
    }

    setSnake(newSnake);
    snakeRef.current = newSnake;
  }, [playDifficulty, handleDeath]);

  // Survival speeds up with every apple; only then does the apple count restart the loop.
  const survivalApples = gameMode === 'survival' ? applesEaten : 0;

  const startGameLoop = useCallback(() => {
    clearGameLoop();
    const baseSpeed = SPEED_CONFIG[playDifficulty];
    const speedMultiplier =
      gameMode === 'levels' ? generateLevelConfig(level).speedMultiplier
      : gameMode === 'survival' ? 1 + survivalApples * SURVIVAL_SPEEDUP_PER_APPLE
      : 1;
    const actualSpeed = Math.max(MIN_TICK_MS, baseSpeed / speedMultiplier);
    setTickMs(actualSpeed);
    gameLoopRef.current = window.setInterval(moveSnake, actualSpeed);
  }, [clearGameLoop, moveSnake, playDifficulty, gameMode, level, survivalApples]); // level/apples in deps: the loop restarts faster

  // Time attack clock (stops while paused).
  useEffect(() => {
    if (gameState !== 'playing' || gameMode !== 'timeAttack') return;
    const id = window.setInterval(() => {
      timeLeftRef.current = Math.max(0, timeLeftRef.current - 1);
      setTimeLeft(timeLeftRef.current);
      if (timeLeftRef.current === 0) setGameState('gameover');
    }, 1000);
    return () => clearInterval(id);
  }, [gameState, gameMode]);

  const obstaclesFor = (mode: GameMode): Position[] =>
    mode === 'levels' ? generateLevelConfig(1).obstacles
    : mode === 'custom' ? customObstaclesRef.current
    : mode === 'daily' ? dailyChallenge(todayKey()).obstacles
    : [];

  const startGame = useCallback(() => {
    const startGrid = usesFixedGrid(gameModeRef.current) ? DEFAULT_GRID : preferredGridRef.current;
    rngRef.current = gameModeRef.current === 'daily' ? seededRandom(dailyChallenge(todayKey()).seed) : Math.random;
    gridRef.current = startGrid;
    setGrid(startGrid);
    const startSnake = initialSnake(startGrid);
    
    // Always reset level state so obstacles from a previous levels game don't linger in classic mode.
    const initialObstacles = obstaclesFor(gameModeRef.current);
    setObstacles(initialObstacles);
    obstaclesRef.current = initialObstacles;
    setLevel(1);
    levelRef.current = 1;
    setLevelApples(0);
    levelApplesRef.current = 0;
    setLevelCompleteEvent(null);
    
    const initialFood = getRandomPosition(startSnake, initialObstacles, startGrid, rngRef.current);
    
    setSnake(startSnake);
    snakeRef.current = startSnake;
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
    setInvincible(false);
    goldenFoodRef.current = null;
    setGoldenFood(null);
    goldenEatenRef.current = 0;
    setGoldenEaten(0);
    timeLeftRef.current = TIME_ATTACK_SECONDS;
    setTimeLeft(TIME_ATTACK_SECONDS);
    setTailCuts(0);
    setGameId(id => id + 1);
    setGameState('playing');
    gameStateRef.current = 'playing';
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- obstaclesFor only reads refs

  const endGame = useCallback(() => {
    if (gameStateRef.current === 'playing' || gameStateRef.current === 'paused') {
      setGameState('gameover');
      gameStateRef.current = 'gameover';
    }
  }, []);

  const setCustomLevel = useCallback((next: Position[]) => {
    customObstaclesRef.current = next;
    setCustomObstacles(next);
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

  const setPreferredGrid = useCallback((next: Grid) => {
    preferredGridRef.current = next;
    setPreferredGridState(next);
  }, []);

  // Before the first game, show the board (and a centred snake) at the size the next game will use.
  useEffect(() => {
    if (gameState !== 'idle') return;
    const next = usesFixedGrid(gameMode) ? DEFAULT_GRID : preferredGrid;
    gridRef.current = next;
    setGrid(next);
    const obs = obstaclesFor(gameMode);
    setObstacles(obs);
    obstaclesRef.current = obs;
    const s = initialSnake(next);
    setSnake(s);
    snakeRef.current = s;
    const f = getRandomPosition(s, obs, next);
    setFood(f);
    foodRef.current = f;
  }, [gameState, gameMode, preferredGrid, customObstacles]); // eslint-disable-line react-hooks/exhaustive-deps

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
    grid,
    setPreferredGrid,
    goldenFood,
    goldenEaten,
    timeLeft,
    tailCuts,
    tickMs,
    gameId,
    setCustomLevel,
    endGame,
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
