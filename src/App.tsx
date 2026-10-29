import { useEffect, useRef, useCallback, useState } from 'react';
import { useSnakeGame } from './hooks/useSnakeGame';
import { useTranslation } from './i18n/useTranslation';
import { gridForArea } from './utils/game.utils';
import { DEFAULT_GRID } from './constants/game.constants';
import type { Direction, Difficulty, BoardSize } from './types/game.types';

function App() {
  const {
    snake,
    food,
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
    grid,
    setPreferredGrid,
    startGame,
    togglePause,
    changeDirection,
    changeDifficulty,
    toggleWrapAround,
    changeGameMode,
  } = useSnakeGame();

  const [boardSize, setBoardSize] = useState<BoardSize>('medium');
  const [showSettings, setShowSettings] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { language, setLanguage, t } = useTranslation();
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const boardAreaRef = useRef<HTMLDivElement>(null);
  const [area, setArea] = useState({ w: 0, h: 0 });

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState === 'idle' || gameState === 'gameover') {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          startGame();
          return;
        }
      }

      if (gameState === 'playing' || gameState === 'paused') {
        if (e.key === ' ' || e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
          e.preventDefault();
          togglePause();
          return;
        }
      }

      if (gameState === 'playing') {
        let dir: Direction | null = null;
        switch (e.key) {
          case 'ArrowUp':
          case 'w':
          case 'W':
            dir = 'UP';
            break;
          case 'ArrowDown':
          case 's':
          case 'S':
            dir = 'DOWN';
            break;
          case 'ArrowLeft':
          case 'a':
          case 'A':
            dir = 'LEFT';
            break;
          case 'ArrowRight':
          case 'd':
          case 'D':
            dir = 'RIGHT';
            break;
        }
        if (dir) {
          e.preventDefault();
          changeDirection(dir);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, startGame, togglePause, changeDirection]);

  // Touch controls (swipe)
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current || gameState !== 'playing') return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    const minSwipe = 30;

    if (Math.abs(dx) < minSwipe && Math.abs(dy) < minSwipe) return;

    if (Math.abs(dx) > Math.abs(dy)) {
      changeDirection(dx > 0 ? 'RIGHT' : 'LEFT');
    } else {
      changeDirection(dy > 0 ? 'DOWN' : 'UP');
    }
    touchStartRef.current = null;
  }, [gameState, changeDirection]);

  // D-pad button handler
  const handleDPad = useCallback((dir: Direction) => {
    if (gameState === 'playing') {
      changeDirection(dir);
    }
  }, [gameState, changeDirection]);

  // Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Handle language change
  const handleLanguageChange = (lang: 'fr' | 'en') => {
    setLanguage(lang);
  };

  // Large board and real fullscreen share one layout: the board is the biggest square that fits the leftover space.
  const fill = boardSize === 'large' || isFullscreen;

  // In fill mode, measure the space left for the board; bigger screens get more cells, not bigger ones.
  useEffect(() => {
    const el = boardAreaRef.current;
    if (!fill || !el) return;
    const ro = new ResizeObserver(([entry]) => setArea({ w: entry.contentRect.width, h: entry.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, [fill]);

  const preferredGrid = fill && area.w > 0 ? gridForArea(area.w, area.h) : DEFAULT_GRID;
  useEffect(() => {
    setPreferredGrid(preferredGrid);
  }, [preferredGrid.cols, preferredGrid.rows, setPreferredGrid]); // eslint-disable-line react-hooks/exhaustive-deps

  // The grid is locked during a game, so fit it to the current space with square cells.
  const cellPx = Math.min(area.w / grid.cols, area.h / grid.rows);
  const boardStyle: React.CSSProperties = fill
    ? { width: grid.cols * cellPx, height: grid.rows * cellPx }
    : { aspectRatio: `${grid.cols} / ${grid.rows}` };

  const boardSizeClasses: Record<BoardSize, string> = {
    small: 'w-full max-w-[80vw] sm:max-w-md',
    medium: 'w-full max-w-[90vw] sm:max-w-lg',
    large: '',
  };



  return (
    <div ref={containerRef} className={`min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-900 flex flex-col items-center select-none ${fill ? 'h-[100dvh] overflow-y-auto' : 'p-3 md:p-4 pb-8'}`}>
      {/* Main content wrapper */}
      <div className={`w-full flex flex-col items-center ${fill ? 'flex-1 py-2 gap-2' : 'flex-grow justify-center py-4 gap-3 md:gap-4'}`}>
      {/* Header */}
      <div className={`w-full shrink-0 ${fill ? 'max-w-full px-4' : 'max-w-[90vw] sm:max-w-md md:max-w-lg'}`}>
        <div className="flex items-center justify-between mb-2">
          <h1 className={`font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400 ${fill ? 'text-xl md:text-3xl' : 'text-2xl md:text-4xl'}`}>
            🐍 Snake
          </h1>
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 bg-gray-700/60 hover:bg-gray-600 rounded-xl transition-colors border border-gray-600/50"
            title={t('settings')}
          >
            <span className="text-xl">⚙️</span>
          </button>
        </div>

        {/* Score Board */}
        <div className={`flex justify-between items-center bg-gray-800/60 backdrop-blur-sm rounded-2xl border border-gray-700/50 shadow-lg ${fill ? 'px-3 py-1.5' : 'px-2 sm:px-4 py-2 sm:py-3'}`}>
          <div className="text-center flex-1">
            <p className={`text-gray-400 uppercase tracking-widest font-medium ${fill ? 'text-[9px]' : 'text-[9px] sm:text-xs'}`}>{t('score')}</p>
            <p className={`font-bold text-white tabular-nums ${fill ? 'text-lg' : 'text-lg sm:text-2xl'}`}>{score}</p>
          </div>
          <div className="bg-gray-700 w-px h-6" />
          <div className="text-center flex-1">
            <p className={`text-gray-400 uppercase tracking-widest font-medium ${fill ? 'text-[9px]' : 'text-[10px] md:text-xs'}`}>{t('record')}</p>
            <p className={`font-bold text-yellow-400 tabular-nums ${fill ? 'text-lg' : 'text-xl md:text-2xl'}`}>{highScore}</p>
          </div>
          <div className="bg-gray-700 w-px h-6" />
          <div className="text-center flex-1">
            <p className={`text-gray-400 uppercase tracking-widest font-medium ${fill ? 'text-[9px]' : 'text-[10px] md:text-xs'}`}>{t('bonus')}</p>
            <p className={`font-bold tabular-nums ${multiplier > 1 ? 'text-orange-400' : 'text-gray-500'} ${fill ? 'text-lg' : 'text-lg md:text-xl'}`}>
              x{multiplier}
            </p>
          </div>
          <div className="bg-gray-700 w-px h-6" />
          <div className="text-center flex-1">
            <p className={`text-gray-400 uppercase tracking-widest font-medium ${fill ? 'text-[9px]' : 'text-[10px] md:text-xs'}`}>{t('apples')}</p>
            <p className={`font-bold text-red-400 tabular-nums ${fill ? 'text-lg' : 'text-lg md:text-xl'}`}>{applesEaten}</p>
          </div>
          <div className="bg-gray-700 w-px h-6" />
          <div className="text-center flex-1">
            <p className={`text-gray-400 uppercase tracking-widest font-medium ${fill ? 'text-[9px]' : 'text-[10px] md:text-xs'}`}>{t('lives')}</p>
            <p className={`font-bold ${fill ? 'text-lg' : 'text-lg md:text-xl'}`}>
              {Array.from({ length: lives }).map((_, i) => (
                <span key={i} className="text-red-500">❤️</span>
              ))}
              {lives === 0 && <span className="text-gray-500">💀</span>}
            </p>
          </div>
        </div>
        
        {/* Lives bonus indicator */}
        {bonusLivesGiven < 3 && (
          <div className="mt-1 px-2">
            <p className="text-[10px] text-gray-500 text-center">
              {t('livesBonus')} {30 - (applesEaten % 30)} {t('applesWord')} • {3 - bonusLivesGiven} {3 - bonusLivesGiven > 1 ? t('remainingPlural') : t('remaining')}
            </p>
          </div>
        )}
        
        {/* Bonus Progress Bar */}
        <div className="mt-2 px-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 whitespace-nowrap">{t('nextBonus')}</span>
            <div className="flex-1 h-2 bg-gray-700/50 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-orange-500 to-yellow-400 transition-all duration-300 rounded-full"
                style={{ width: `${(applesEaten % 10) * 10}%` }}
              />
            </div>
            <span className="text-xs text-gray-400 tabular-nums">{applesEaten % 10}/10</span>
          </div>
        </div>

        {/* Notifications - Outside game board */}
        <div className={`relative ${fill ? 'h-0' : 'h-16 mt-2'}`}>
          {/* Bonus notification */}
          {bonusEvent && gameState === 'playing' && (
            <div
              key={bonusEvent.id}
              className="absolute top-0 left-1/2 -translate-x-1/2 z-30 pointer-events-none"
            >
              <div className="bg-gradient-to-r from-orange-500/90 to-yellow-500/90 backdrop-blur-sm px-4 py-2 rounded-xl shadow-2xl shadow-orange-500/50 border border-yellow-300/50 animate-bonus-pop">
                <div className="text-center">
                  <p className="text-white font-bold text-sm md:text-base">{t('bonusNotification')}</p>
                  <p className="text-yellow-100 text-xs md:text-sm font-semibold">
                    x{bonusEvent.multiplier} • {bonusEvent.applesCount} 🍎
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Life lost notification */}
          {lifeLostEvent && gameState === 'playing' && (
            <div
              key={lifeLostEvent.id}
              className="absolute top-0 left-1/2 -translate-x-1/2 z-30 pointer-events-none"
            >
              <div className="bg-gradient-to-r from-red-600/90 to-rose-600/90 backdrop-blur-sm px-4 py-2 rounded-xl shadow-2xl shadow-red-500/50 border border-red-300/50 animate-life-lost-pop">
                <div className="text-center">
                  <p className="text-white font-bold text-sm md:text-base">{t('lifeLost')}</p>
                  <p className="text-red-100 text-xs md:text-sm font-semibold">
                    {lifeLostEvent.livesRemaining} {t('remaining2')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Life gained notification */}
          {lifeGainedEvent && gameState === 'playing' && (
            <div
              key={lifeGainedEvent.id}
              className="absolute top-0 left-1/2 -translate-x-1/2 z-30 pointer-events-none"
            >
              <div className="bg-gradient-to-r from-green-500/90 to-emerald-500/90 backdrop-blur-sm px-4 py-2 rounded-xl shadow-2xl shadow-green-500/50 border border-green-300/50 animate-life-gained-pop">
                <div className="text-center">
                  <p className="text-white font-bold text-sm md:text-base">{t('lifeGained')}</p>
                  <p className="text-green-100 text-xs md:text-sm font-semibold">
                    {lifeGainedEvent.lives} {lifeGainedEvent.lives > 1 ? t('totalPlural') : t('total')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Level complete notification */}
          {levelCompleteEvent && gameState === 'playing' && (
            <div
              key={levelCompleteEvent.id}
              className="absolute top-0 left-1/2 -translate-x-1/2 z-30 pointer-events-none"
            >
              <div className="bg-gradient-to-r from-purple-600/90 to-pink-600/90 backdrop-blur-sm px-4 py-2 rounded-xl shadow-2xl shadow-purple-500/50 border border-purple-300/50 animate-level-complete-pop">
                <div className="text-center">
                  <p className="text-white font-bold text-sm md:text-base">{t('levelComplete')} {levelCompleteEvent.level} {t('levelCompleteEnd')}</p>
                  <p className="text-purple-100 text-xs md:text-sm font-semibold">
                    {t('nextLevel')} {levelCompleteEvent.level + 1}{t('nextLevelEnd')}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Game Board */}
      <div
        ref={boardAreaRef}
        className={fill ? 'flex-1 min-h-[16rem] w-full px-2 flex items-center justify-center' : 'w-full flex justify-center'}
      >
      <div
        className={`relative @container ${fill ? '' : boardSizeClasses[boardSize]} bg-gray-900/80 rounded-2xl border-2 overflow-hidden transition-all duration-300 ${
          gameMode === 'levels'
            ? 'border-purple-500/60 shadow-2xl shadow-purple-900/30'
            : wrapAround
              ? 'border-purple-500/60 shadow-2xl shadow-purple-900/30'
              : 'border-gray-600/50 shadow-2xl shadow-green-900/10'
        }`}
        style={boardStyle}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Subtle grid */}
        <div className="absolute inset-0" style={{ opacity: 0.06 }}>
          <div className="w-full h-full" style={{
            backgroundImage: `linear-gradient(to right, #6b7280 1px, transparent 1px), linear-gradient(to bottom, #6b7280 1px, transparent 1px)`,
            backgroundSize: `calc(100% / ${grid.cols}) calc(100% / ${grid.rows})`,
          }} />
        </div>

        {/* Wrap around portal indicators on edges */}
        {wrapAround && gameState === 'playing' && (
          <>
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-purple-400 to-transparent opacity-60 animate-pulse z-20" />
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-purple-400 to-transparent opacity-60 animate-pulse z-20" />
            <div className="absolute top-0 bottom-0 left-0 w-1 bg-gradient-to-b from-transparent via-purple-400 to-transparent opacity-60 animate-pulse z-20" />
            <div className="absolute top-0 bottom-0 right-0 w-1 bg-gradient-to-b from-transparent via-purple-400 to-transparent opacity-60 animate-pulse z-20" />
          </>
        )}

        {/* Snake body segments */}
        {snake.map((segment, index) => {
          const isHead = index === 0;
          const opacity = isHead ? 1 : Math.max(0.4, 1 - (index / snake.length) * 0.6);
          return (
            <div
              key={index}
              className={`absolute rounded-md ${isHead ? 'z-20' : 'z-10'} ${invincible ? 'animate-pulse' : ''}`}
              style={{
                left: `calc(${segment.x} * 100% / ${grid.cols} + 1px)`,
                top: `calc(${segment.y} * 100% / ${grid.rows} + 1px)`,
                width: `calc(100% / ${grid.cols} - 2px)`,
                height: `calc(100% / ${grid.rows} - 2px)`,
                backgroundColor: isHead ? '#4ade80' : '#22c55e',
                opacity,
                boxShadow: isHead ? '0 0 12px rgba(74, 222, 128, 0.5)' : 'none',
              }}
            >
              {isHead && (
                <div className="w-full h-full flex items-center justify-center text-[10px] md:text-xs leading-none">
                  👀
                </div>
              )}
            </div>
          );
        })}

        {/* Food */}
        <div
          className="absolute z-10"
          style={{
            left: `calc(${food.x} * 100% / ${grid.cols})`,
            top: `calc(${food.y} * 100% / ${grid.rows})`,
            width: `calc(100% / ${grid.cols})`,
            height: `calc(100% / ${grid.rows})`,
          }}
        >
          <div className="w-full h-full flex items-center justify-center animate-pulse">
            <span className="text-sm md:text-lg drop-shadow-lg">🍎</span>
          </div>
        </div>

        {/* Obstacles (Levels Mode) */}
        {gameMode === 'levels' && obstacles.map((obs, index) => (
          <div
            key={`obs-${index}`}
            className="absolute rounded-sm bg-gradient-to-br from-gray-500 to-gray-700 border border-gray-400/30 shadow-inner"
            style={{
              left: `calc(${obs.x} * 100% / ${grid.cols} + 1px)`,
              top: `calc(${obs.y} * 100% / ${grid.rows} + 1px)`,
              width: `calc(100% / ${grid.cols} - 2px)`,
              height: `calc(100% / ${grid.rows} - 2px)`,
            }}
          >
            <div className="w-full h-full flex items-center justify-center text-[8px] md:text-[10px] opacity-60">
              🧱
            </div>
          </div>
        ))}

        {/* Idle Overlay */}
        {gameState === 'idle' && (
          <div className={`absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center-safe overflow-y-auto py-2 z-30 rounded-2xl`}>
            <div className={`${fill ? 'text-6xl md:text-7xl mb-4' : 'text-5xl md:text-6xl mb-4'} animate-bounce @max-xs:hidden`}>🐍</div>
            <h2 className={`${fill ? 'text-2xl md:text-3xl mb-2' : 'text-xl md:text-2xl mb-2'} font-bold text-white`}>{t('snakeGame')}</h2>
            <p className={`text-gray-300 text-center px-6 max-w-xs ${fill ? 'text-xs md:text-sm mb-2' : 'text-xs md:text-sm mb-2'}`}>
              {gameMode === 'classic' 
                ? t('classicDescription')
                : t('levelsDescription')}
            </p>
            <p className={`text-gray-400 mb-4 ${fill ? 'text-[10px] md:text-xs' : 'text-[10px]'}`}>
              {t('mode')}: {gameMode === 'classic' ? t('classic') : t('levels')}
            </p>
            <button
              onClick={startGame}
              className={`bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-green-500/25 hover:shadow-green-500/40 hover:scale-105 active:scale-95 transition-all duration-200 ${fill ? 'px-10 py-3 text-lg md:text-xl' : 'px-8 py-3 text-lg'}`}
            >
              {t('play')}
            </button>
            <p className={`text-gray-500 mt-3 ${fill ? 'text-[10px] md:text-xs' : 'text-[10px]'}`}>{t('pressEnterOrSpace')}</p>
          </div>
        )}

        {/* Paused Overlay */}
        {gameState === 'paused' && (
          <div className={`absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center-safe overflow-y-auto py-2 z-30 rounded-2xl`}>
            <div className={`${fill ? 'text-5xl md:text-6xl mb-4' : 'text-4xl md:text-5xl mb-4'} @max-xs:hidden`}>⏸️</div>
            <h2 className={`${fill ? 'text-2xl md:text-3xl mb-2' : 'text-xl md:text-2xl mb-2'} font-bold text-white`}>{t('paused')}</h2>
            <p className={`text-gray-400 mb-4 ${fill ? 'text-base md:text-lg' : 'text-sm'}`}>{t('currentScore')} {score}</p>
            <button
              onClick={togglePause}
              className={`bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-105 active:scale-95 transition-all duration-200 ${fill ? 'px-10 py-3 text-lg md:text-xl' : 'px-8 py-3'}`}
            >
              {t('resume')}
            </button>
          </div>
        )}

        {/* Game Over Overlay */}
        {gameState === 'gameover' && (
          <div className={`absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center-safe overflow-y-auto py-2 z-30 rounded-2xl`}>
            <div className={`${fill ? 'text-5xl md:text-6xl mb-3' : 'text-4xl md:text-5xl mb-3'} @max-xs:hidden`}>💀</div>
            <h2 className={`${fill ? 'text-2xl md:text-3xl mb-3' : 'text-xl md:text-2xl mb-3'} font-bold text-red-400`}>{t('gameOver')}</h2>
            <div className={`bg-gray-800/80 rounded-xl border border-gray-700 space-y-2 mb-3 ${fill ? 'px-6 py-3' : 'px-6 py-3'}`}>
              <p className="text-white text-center">
                {t('score')}: <span className={`font-bold text-green-400 ${fill ? 'text-2xl md:text-3xl' : 'text-xl'}`}>{score}</span>
              </p>
              <p className={`text-gray-300 text-center ${fill ? 'text-sm md:text-base' : 'text-sm'}`}>
                🍎 {applesEaten} {t('applesEaten')}
              </p>
              {gameMode === 'levels' && (
                <p className={`text-purple-300 text-center ${fill ? 'text-sm md:text-base' : 'text-sm'}`}>
                  {t('levelReached')} <span className="font-bold">{level}</span>
                </p>
              )}
              <p className={`text-gray-300 text-center ${fill ? 'text-sm md:text-base' : 'text-sm'}`}>
                ❤️ {bonusLivesGiven}/3 {t('bonusLivesUsed')}
              </p>
              {score >= highScore && score > 0 && (
                <p className={`text-yellow-400 text-center mt-2 animate-pulse font-semibold ${fill ? 'text-sm md:text-base' : 'text-sm'}`}>
                  {t('newRecord')}
                </p>
              )}
            </div>
            <button
              onClick={startGame}
              className={`bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-green-500/25 hover:shadow-green-500/40 hover:scale-105 active:scale-95 transition-all duration-200 ${fill ? 'px-10 py-3 text-lg md:text-xl' : 'px-8 py-3'}`}
            >
              {t('playAgain')}
            </button>
          </div>
        )}
      </div>
      </div>

      {/* Controls Section */}
      <div className={`w-full shrink-0 ${fill ? 'max-w-full px-4 space-y-2' : 'max-w-[90vw] sm:max-w-md md:max-w-lg space-y-3'}`}>
        {/* Action Buttons */}
        <div className="flex gap-2 justify-center">
          {gameState === 'playing' && (
            <button
              onClick={togglePause}
              className={`bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-semibold rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg ${fill ? 'px-4 py-1.5 text-xs md:text-sm' : 'px-5 py-2.5 text-sm md:text-base'}`}
            >
              {t('pause')}
            </button>
          )}
          {(gameState === 'playing' || gameState === 'paused') && (
            <button
              onClick={startGame}
              className={`bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 text-white font-semibold rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg ${fill ? 'px-4 py-1.5 text-xs md:text-sm' : 'px-5 py-2.5 text-sm md:text-base'}`}
            >
              {t('restart')}
            </button>
          )}
        </div>

        {/* Level Progress (Levels Mode) */}
        {gameMode === 'levels' && (
          <div className="bg-gray-800/60 backdrop-blur-sm rounded-xl px-4 py-2 border border-purple-700/50">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-purple-300 font-semibold">{t('level')} {level}</span>
              <span className="text-xs text-gray-400">{levelApples}/{5 + level * 2} {t('applesProgress')}</span>
            </div>
            <div className="w-full h-2 bg-gray-700/50 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300 rounded-full"
                style={{ width: `${(levelApples / (5 + level * 2)) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Mobile D-Pad Controls */}
        <div className={`md:hidden ${fill ? 'mt-2' : 'mt-3'}`}>
          <div className={`flex flex-col items-center ${fill ? 'gap-1' : 'gap-1.5'}`}>
            <button
              onPointerDown={(e) => { e.preventDefault(); handleDPad('UP'); }}
              className={`w-14 h-14 text-xl bg-gray-700/80 active:bg-green-600 rounded-xl flex items-center justify-center text-white shadow-lg border border-gray-600/50 transition-colors touch-none select-none`}
            >
              ▲
            </button>
            <div className={`flex ${fill ? 'gap-1' : 'gap-1.5'}`}>
              <button
                onPointerDown={(e) => { e.preventDefault(); handleDPad('LEFT'); }}
                className={`w-14 h-14 text-xl bg-gray-700/80 active:bg-green-600 rounded-xl flex items-center justify-center text-white shadow-lg border border-gray-600/50 transition-colors touch-none select-none`}
              >
                ◀
              </button>
              <div className={`w-14 h-14 rounded-xl bg-gray-800/40 border border-gray-700/30 flex items-center justify-center text-gray-600 text-xs`}>
                ●
              </div>
              <button
                onPointerDown={(e) => { e.preventDefault(); handleDPad('RIGHT'); }}
                className={`w-14 h-14 text-xl bg-gray-700/80 active:bg-green-600 rounded-xl flex items-center justify-center text-white shadow-lg border border-gray-600/50 transition-colors touch-none select-none`}
              >
                ▶
              </button>
            </div>
            <button
              onPointerDown={(e) => { e.preventDefault(); handleDPad('DOWN'); }}
              className={`w-14 h-14 text-xl bg-gray-700/80 active:bg-green-600 rounded-xl flex items-center justify-center text-white shadow-lg border border-gray-600/50 transition-colors touch-none select-none`}
            >
              ▼
            </button>
          </div>
          <p className="text-center text-gray-500 text-[10px] mt-2">{t('swipeOrButtons')}</p>
        </div>

        {/* Desktop Instructions */}
        <div className="hidden md:block text-center text-gray-500 text-xs mt-2 space-y-1">
          <p>{t('arrowsOrWasd')}</p>
          <p>{t('spacePause')}</p>
        </div>
      </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-2xl border border-gray-700 shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white">⚙️ {t('settings')}</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <span className="text-xl">✕</span>
              </button>
            </div>
            
            <div className="p-4 space-y-5">
              {/* Language */}
              <div>
                <label className="text-sm font-semibold text-gray-300 mb-2 block">🌐 Language / Langue</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleLanguageChange('fr')}
                    className={`py-2.5 px-3 rounded-xl text-sm font-bold transition-all ${
                      language === 'fr'
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg scale-105'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    🇫🇷 Français
                  </button>
                  <button
                    onClick={() => handleLanguageChange('en')}
                    className={`py-2.5 px-3 rounded-xl text-sm font-bold transition-all ${
                      language === 'en'
                        ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg scale-105'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    🇬🇧 English
                  </button>
                </div>
              </div>

              {/* Board Size */}
              <div>
                <label className="text-sm font-semibold text-gray-300 mb-2 block">{t('boardSize')}</label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { key: 'small' as BoardSize, label: t('small'), emoji: '' },
                    { key: 'medium' as BoardSize, label: t('mediumSize'), emoji: '' },
                    { key: 'large' as BoardSize, label: t('large'), emoji: '' },
                  ]).map(size => (
                    <button
                      key={size.key}
                      onClick={() => setBoardSize(size.key)}
                      className={`py-2 px-3 rounded-xl text-sm font-bold transition-all ${
                        boardSize === size.key
                          ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg scale-105'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {size.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fullscreen */}
              <div>
                <label className="text-sm font-semibold text-gray-300 mb-2 block">{t('display')}</label>
                <button
                  onClick={toggleFullscreen}
                  className={`w-full py-2.5 px-4 rounded-xl text-sm font-bold transition-all ${
                    isFullscreen
                      ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {isFullscreen ? t('exitFullscreen') : t('fullscreen')}
                </button>
              </div>

              {/* Game Mode */}
              <div>
                <label className="text-sm font-semibold text-gray-300 mb-2 block">{t('gameMode')}</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => changeGameMode('classic')}
                    disabled={gameState === 'playing' || gameState === 'paused'}
                    className={`py-2.5 px-3 rounded-xl text-sm font-bold transition-all ${
                      gameMode === 'classic'
                        ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg scale-105'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    } ${(gameState === 'playing' || gameState === 'paused') ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    {t('classic')}
                  </button>
                  <button
                    onClick={() => changeGameMode('levels')}
                    disabled={gameState === 'playing' || gameState === 'paused'}
                    className={`py-2.5 px-3 rounded-xl text-sm font-bold transition-all ${
                      gameMode === 'levels'
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg scale-105'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    } ${(gameState === 'playing' || gameState === 'paused') ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    {t('levels')}
                  </button>
                </div>
              </div>

              {/* Difficulty */}
              <div>
                <label className="text-sm font-semibold text-gray-300 mb-2 block">{t('difficulty')}</label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { key: 'easy' as Difficulty, label: t('easy'), color: 'from-green-500 to-green-600' },
                    { key: 'medium' as Difficulty, label: t('medium'), color: 'from-yellow-500 to-orange-500' },
                    { key: 'hard' as Difficulty, label: t('hard'), color: 'from-red-500 to-red-600' },
                  ]).map(d => (
                    <button
                      key={d.key}
                      onClick={() => changeDifficulty(d.key)}
                      disabled={gameState === 'playing' || gameState === 'paused'}
                      className={`py-2 px-3 rounded-xl text-sm font-bold transition-all ${
                        difficulty === d.key
                          ? `bg-gradient-to-r ${d.color} text-white shadow-lg scale-105`
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      } ${(gameState === 'playing' || gameState === 'paused') ? 'opacity-40 cursor-not-allowed' : ''}`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Wrap Around */}
              <div>
                <label className="text-sm font-semibold text-gray-300 mb-2 block">{t('wrapAround')}</label>
                <button
                  onClick={toggleWrapAround}
                  disabled={gameState === 'playing' || gameState === 'paused' || gameMode === 'levels'}
                  className={`w-full py-2.5 px-4 rounded-xl text-sm font-bold transition-all ${
                    wrapAround
                      ? 'bg-gradient-to-r from-purple-600 to-violet-600 text-white shadow-lg'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  } ${(gameState === 'playing' || gameState === 'paused' || gameMode === 'levels') ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  {wrapAround ? t('wrapAroundOn') : t('wrapAroundOff')}
                  {gameMode === 'levels' && t('disabledInLevels')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
