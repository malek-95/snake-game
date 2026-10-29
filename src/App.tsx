import { useEffect, useRef, useCallback, useState } from 'react';
import { useSnakeGame, Direction, Difficulty } from './hooks/useSnakeGame';

type BoardSize = 'small' | 'medium' | 'large';

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
    gridSize,
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
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
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

  // Board size classes
  const boardSizeClasses: Record<BoardSize, string> = {
    small: 'w-full max-w-[80vw] sm:max-w-md',
    medium: 'w-full max-w-[90vw] sm:max-w-lg',
    large: 'w-screen h-screen max-w-none max-h-none',
  };



  return (
    <div ref={containerRef} className={`min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-900 flex flex-col items-center select-none ${boardSize === 'large' ? 'p-0' : 'p-3 md:p-4 pb-8'}`}>
      {/* Main content wrapper */}
      <div className={`w-full flex flex-col items-center justify-center flex-grow ${boardSize === 'large' ? 'py-0' : 'py-4'}`}>
      {/* Header */}
      <div className={`w-full mb-3 md:mb-4 ${boardSize === 'large' ? 'max-w-full px-4' : 'max-w-[90vw] sm:max-w-md md:max-w-lg'}`}>
        <div className="flex items-center justify-between mb-3">
          <h1 className={`font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400 ${boardSize === 'large' ? 'text-3xl md:text-5xl' : 'text-2xl md:text-4xl'}`}>
            🐍 Snake
          </h1>
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 bg-gray-700/60 hover:bg-gray-600 rounded-xl transition-colors border border-gray-600/50"
            title="Paramètres"
          >
            <span className="text-xl">⚙️</span>
          </button>
        </div>

        {/* Score Board */}
        <div className={`flex justify-between items-center bg-gray-800/60 backdrop-blur-sm rounded-2xl border border-gray-700/50 shadow-lg ${boardSize === 'large' ? 'px-6 py-4' : 'px-2 sm:px-4 py-2 sm:py-3'}`}>
          <div className="text-center flex-1">
            <p className={`text-gray-400 uppercase tracking-widest font-medium ${boardSize === 'large' ? 'text-xs sm:text-sm' : 'text-[9px] sm:text-xs'}`}>Score</p>
            <p className={`font-bold text-white tabular-nums ${boardSize === 'large' ? 'text-2xl sm:text-3xl' : 'text-lg sm:text-2xl'}`}>{score}</p>
          </div>
          <div className={`bg-gray-700 ${boardSize === 'large' ? 'w-px h-10' : 'w-px h-8'}`} />
          <div className="text-center flex-1">
            <p className={`text-gray-400 uppercase tracking-widest font-medium ${boardSize === 'large' ? 'text-xs sm:text-sm' : 'text-[10px] md:text-xs'}`}>🏆 Record</p>
            <p className={`font-bold text-yellow-400 tabular-nums ${boardSize === 'large' ? 'text-2xl sm:text-3xl' : 'text-xl md:text-2xl'}`}>{highScore}</p>
          </div>
          <div className={`bg-gray-700 ${boardSize === 'large' ? 'w-px h-10' : 'w-px h-8'}`} />
          <div className="text-center flex-1">
            <p className={`text-gray-400 uppercase tracking-widest font-medium ${boardSize === 'large' ? 'text-xs sm:text-sm' : 'text-[10px] md:text-xs'}`}>Bonus</p>
            <p className={`font-bold tabular-nums ${multiplier > 1 ? 'text-orange-400' : 'text-gray-500'} ${boardSize === 'large' ? 'text-2xl sm:text-3xl' : 'text-lg md:text-xl'}`}>
              x{multiplier}
            </p>
          </div>
          <div className={`bg-gray-700 ${boardSize === 'large' ? 'w-px h-10' : 'w-px h-8'}`} />
          <div className="text-center flex-1">
            <p className={`text-gray-400 uppercase tracking-widest font-medium ${boardSize === 'large' ? 'text-xs sm:text-sm' : 'text-[10px] md:text-xs'}`}>Pommes</p>
            <p className={`font-bold text-red-400 tabular-nums ${boardSize === 'large' ? 'text-2xl sm:text-3xl' : 'text-lg md:text-xl'}`}>{applesEaten}</p>
          </div>
          <div className={`bg-gray-700 ${boardSize === 'large' ? 'w-px h-10' : 'w-px h-8'}`} />
          <div className="text-center flex-1">
            <p className={`text-gray-400 uppercase tracking-widest font-medium ${boardSize === 'large' ? 'text-xs sm:text-sm' : 'text-[10px] md:text-xs'}`}>Vies</p>
            <p className={`font-bold ${boardSize === 'large' ? 'text-2xl sm:text-3xl' : 'text-lg md:text-xl'}`}>
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
              💚 Vie bonus à {30 - (applesEaten % 30)} pommes • {3 - bonusLivesGiven} restante{3 - bonusLivesGiven > 1 ? 's' : ''}
            </p>
          </div>
        )}
        
        {/* Bonus Progress Bar */}
        <div className="mt-2 px-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 whitespace-nowrap">Prochain bonus:</span>
            <div className="flex-1 h-2 bg-gray-700/50 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-orange-500 to-yellow-400 transition-all duration-300 rounded-full"
                style={{ width: `${(applesEaten % 10) * 10}%` }}
              />
            </div>
            <span className="text-xs text-gray-400 tabular-nums">{applesEaten % 10}/10</span>
          </div>
        </div>
      </div>

      {/* Game Board */}
      <div
        className={`relative ${boardSizeClasses[boardSize]} ${boardSize === 'large' ? 'flex-1 min-h-0' : 'aspect-square'} bg-gray-900/80 ${boardSize === 'large' ? 'rounded-none' : 'rounded-2xl'} border-2 overflow-hidden transition-all duration-300 ${
          gameMode === 'levels'
            ? 'border-purple-500/60 shadow-2xl shadow-purple-900/30'
            : wrapAround
              ? 'border-purple-500/60 shadow-2xl shadow-purple-900/30'
              : 'border-gray-600/50 shadow-2xl shadow-green-900/10'
        }`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Subtle grid */}
        <div className="absolute inset-0" style={{ opacity: 0.06 }}>
          <div className="w-full h-full" style={{
            backgroundImage: `linear-gradient(to right, #6b7280 1px, transparent 1px), linear-gradient(to bottom, #6b7280 1px, transparent 1px)`,
            backgroundSize: `calc(100% / ${gridSize}) calc(100% / ${gridSize})`,
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

        {/* Bonus notification */}
        {bonusEvent && gameState === 'playing' && (
          <div
            key={bonusEvent.id}
            className="absolute top-2 left-1/2 -translate-x-1/2 z-30 pointer-events-none"
          >
            <div className="bg-gradient-to-r from-orange-500/90 to-yellow-500/90 backdrop-blur-sm px-4 py-2 rounded-xl shadow-2xl shadow-orange-500/50 border border-yellow-300/50 animate-bonus-pop">
              <div className="text-center">
                <p className="text-white font-bold text-sm md:text-base">🎉 BONUS!</p>
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
            className="absolute top-2 left-1/2 -translate-x-1/2 z-30 pointer-events-none"
          >
            <div className="bg-gradient-to-r from-red-600/90 to-rose-600/90 backdrop-blur-sm px-4 py-2 rounded-xl shadow-2xl shadow-red-500/50 border border-red-300/50 animate-life-lost-pop">
              <div className="text-center">
                <p className="text-white font-bold text-sm md:text-base">💔 Vie perdue!</p>
                <p className="text-red-100 text-xs md:text-sm font-semibold">
                  {lifeLostEvent.livesRemaining} restante{lifeLostEvent.livesRemaining > 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Life gained notification */}
        {lifeGainedEvent && gameState === 'playing' && (
          <div
            key={lifeGainedEvent.id}
            className="absolute top-2 left-1/2 -translate-x-1/2 z-30 pointer-events-none"
          >
            <div className="bg-gradient-to-r from-green-500/90 to-emerald-500/90 backdrop-blur-sm px-4 py-2 rounded-xl shadow-2xl shadow-green-500/50 border border-green-300/50 animate-life-gained-pop">
              <div className="text-center">
                <p className="text-white font-bold text-sm md:text-base">💚 +1 Vie!</p>
                <p className="text-green-100 text-xs md:text-sm font-semibold">
                  {lifeGainedEvent.lives} totale{lifeGainedEvent.lives > 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Level complete notification */}
        {levelCompleteEvent && gameState === 'playing' && (
          <div
            key={levelCompleteEvent.id}
            className="absolute top-2 left-1/2 -translate-x-1/2 z-30 pointer-events-none"
          >
            <div className="bg-gradient-to-r from-purple-600/90 to-pink-600/90 backdrop-blur-sm px-4 py-2 rounded-xl shadow-2xl shadow-purple-500/50 border border-purple-300/50 animate-level-complete-pop">
              <div className="text-center">
                <p className="text-white font-bold text-sm md:text-base">🎊 Niveau {levelCompleteEvent.level}!</p>
                <p className="text-purple-100 text-xs md:text-sm font-semibold">
                  Niveau {levelCompleteEvent.level + 1}...
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Snake body segments */}
        {snake.map((segment, index) => {
          const isHead = index === 0;
          const opacity = isHead ? 1 : Math.max(0.4, 1 - (index / snake.length) * 0.6);
          const isInvincibleVisible = invincible && Math.floor(Date.now() / 100) % 2 === 0;
          return (
            <div
              key={index}
              className={`absolute rounded-md ${isHead ? 'z-20' : 'z-10'} ${invincible ? 'animate-pulse' : ''}`}
              style={{
                left: `calc(${segment.x} * 100% / ${gridSize} + 1px)`,
                top: `calc(${segment.y} * 100% / ${gridSize} + 1px)`,
                width: `calc(100% / ${gridSize} - 2px)`,
                height: `calc(100% / ${gridSize} - 2px)`,
                backgroundColor: invincible ? (isInvincibleVisible ? '#fbbf24' : '#4ade80') : (isHead ? '#4ade80' : '#22c55e'),
                opacity: invincible ? (isInvincibleVisible ? 0.6 : 1) : opacity,
                boxShadow: isHead ? (invincible ? '0 0 12px rgba(251, 191, 36, 0.7)' : '0 0 12px rgba(74, 222, 128, 0.5)') : 'none',
              }}
            >
              {isHead && (
                <div className="w-full h-full flex items-center justify-center text-[10px] md:text-xs leading-none">
                  {invincible ? '🛡️' : '👀'}
                </div>
              )}
            </div>
          );
        })}

        {/* Food */}
        <div
          className="absolute z-10"
          style={{
            left: `calc(${food.x} * 100% / ${gridSize})`,
            top: `calc(${food.y} * 100% / ${gridSize})`,
            width: `calc(100% / ${gridSize})`,
            height: `calc(100% / ${gridSize})`,
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
              left: `calc(${obs.x} * 100% / ${gridSize} + 1px)`,
              top: `calc(${obs.y} * 100% / ${gridSize} + 1px)`,
              width: `calc(100% / ${gridSize} - 2px)`,
              height: `calc(100% / ${gridSize} - 2px)`,
            }}
          >
            <div className="w-full h-full flex items-center justify-center text-[8px] md:text-[10px] opacity-60">
              🧱
            </div>
          </div>
        ))}

        {/* Idle Overlay */}
        {gameState === 'idle' && (
          <div className={`absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center z-30 ${boardSize === 'large' ? '' : 'rounded-2xl'}`}>
            <div className={`${boardSize === 'large' ? 'text-7xl md:text-8xl mb-6' : 'text-5xl md:text-6xl mb-4'} animate-bounce`}>🐍</div>
            <h2 className={`${boardSize === 'large' ? 'text-3xl md:text-4xl mb-3' : 'text-xl md:text-2xl mb-2'} font-bold text-white`}>Jeu du Serpent</h2>
            <p className={`text-gray-300 text-center px-6 max-w-xs ${boardSize === 'large' ? 'text-sm md:text-base mb-3' : 'text-xs md:text-sm mb-2'}`}>
              {gameMode === 'classic' 
                ? 'Dirigez le serpent pour manger les pommes. Ne touchez pas les murs ni vous-même!'
                : 'Traversez les niveaux avec des obstacles. Mangez assez de pommes pour avancer!'}
            </p>
            <p className={`text-gray-400 mb-6 ${boardSize === 'large' ? 'text-xs md:text-sm' : 'text-[10px]'}`}>
              Mode: {gameMode === 'classic' ? '🎮 Classique' : '🏆 Niveaux'}
            </p>
            <button
              onClick={startGame}
              className={`bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-green-500/25 hover:shadow-green-500/40 hover:scale-105 active:scale-95 transition-all duration-200 ${boardSize === 'large' ? 'px-12 py-4 text-xl md:text-2xl' : 'px-8 py-3 text-lg'}`}
            >
              ▶ Jouer
            </button>
            <p className={`text-gray-500 mt-4 ${boardSize === 'large' ? 'text-xs md:text-sm' : 'text-[10px]'}`}>Appuyez sur Entrée ou Espace</p>
          </div>
        )}

        {/* Paused Overlay */}
        {gameState === 'paused' && (
          <div className={`absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center z-30 ${boardSize === 'large' ? '' : 'rounded-2xl'}`}>
            <div className={`${boardSize === 'large' ? 'text-6xl md:text-7xl mb-6' : 'text-4xl md:text-5xl mb-4'}`}>⏸️</div>
            <h2 className={`${boardSize === 'large' ? 'text-3xl md:text-4xl mb-3' : 'text-xl md:text-2xl mb-2'} font-bold text-white`}>Pause</h2>
            <p className={`text-gray-400 mb-6 ${boardSize === 'large' ? 'text-lg md:text-xl' : 'text-sm'}`}>Score actuel: {score}</p>
            <button
              onClick={togglePause}
              className={`bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-105 active:scale-95 transition-all duration-200 ${boardSize === 'large' ? 'px-12 py-4 text-xl md:text-2xl' : 'px-8 py-3'}`}
            >
              ▶ Reprendre
            </button>
          </div>
        )}

        {/* Game Over Overlay */}
        {gameState === 'gameover' && (
          <div className={`absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center z-30 ${boardSize === 'large' ? '' : 'rounded-2xl'}`}>
            <div className={`${boardSize === 'large' ? 'text-6xl md:text-7xl mb-4' : 'text-4xl md:text-5xl mb-3'}`}>💀</div>
            <h2 className={`${boardSize === 'large' ? 'text-3xl md:text-4xl mb-4' : 'text-xl md:text-2xl mb-3'} font-bold text-red-400`}>Game Over!</h2>
            <div className={`bg-gray-800/80 rounded-xl border border-gray-700 space-y-2 mb-4 ${boardSize === 'large' ? 'px-8 py-5' : 'px-6 py-3'}`}>
              <p className="text-white text-center">
                Score: <span className={`font-bold text-green-400 ${boardSize === 'large' ? 'text-3xl md:text-4xl' : 'text-xl'}`}>{score}</span>
              </p>
              <p className={`text-gray-300 text-center ${boardSize === 'large' ? 'text-base md:text-lg' : 'text-sm'}`}>
                🍎 {applesEaten} pommes mangées
              </p>
              {gameMode === 'levels' && (
                <p className={`text-purple-300 text-center ${boardSize === 'large' ? 'text-base md:text-lg' : 'text-sm'}`}>
                  🏆 Niveau atteint: <span className="font-bold">{level}</span>
                </p>
              )}
              <p className={`text-gray-300 text-center ${boardSize === 'large' ? 'text-base md:text-lg' : 'text-sm'}`}>
                ❤️ {bonusLivesGiven}/3 vies bonus utilisées
              </p>
              {score >= highScore && score > 0 && (
                <p className={`text-yellow-400 text-center mt-2 animate-pulse font-semibold ${boardSize === 'large' ? 'text-base md:text-lg' : 'text-sm'}`}>
                  🏆 Nouveau record!
                </p>
              )}
            </div>
            <button
              onClick={startGame}
              className={`bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-green-500/25 hover:shadow-green-500/40 hover:scale-105 active:scale-95 transition-all duration-200 ${boardSize === 'large' ? 'px-12 py-4 text-xl md:text-2xl' : 'px-8 py-3'}`}
            >
              🔄 Rejouer
            </button>
          </div>
        )}
      </div>

      {/* Controls Section */}
      <div className={`w-full mt-3 md:mt-4 space-y-3 ${boardSize === 'large' ? 'max-w-full px-4' : 'max-w-[90vw] sm:max-w-md md:max-w-lg'}`}>
        {/* Action Buttons */}
        <div className="flex gap-3 justify-center">
          {gameState === 'playing' && (
            <button
              onClick={togglePause}
              className={`bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-semibold rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg ${boardSize === 'large' ? 'px-8 py-3 text-base md:text-lg' : 'px-5 py-2.5 text-sm md:text-base'}`}
            >
              ⏸ Pause
            </button>
          )}
          {(gameState === 'playing' || gameState === 'paused') && (
            <button
              onClick={startGame}
              className={`bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 text-white font-semibold rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg ${boardSize === 'large' ? 'px-8 py-3 text-base md:text-lg' : 'px-5 py-2.5 text-sm md:text-base'}`}
            >
              🔄 Restart
            </button>
          )}
        </div>

        {/* Level Progress (Levels Mode) */}
        {gameMode === 'levels' && (
          <div className="bg-gray-800/60 backdrop-blur-sm rounded-xl px-4 py-2 border border-purple-700/50">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-purple-300 font-semibold">Niveau {level}</span>
              <span className="text-xs text-gray-400">{levelApples}/{5 + level * 2} pommes</span>
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
        <div className="md:hidden mt-3">
          <div className="flex flex-col items-center gap-1.5">
            <button
              onPointerDown={(e) => { e.preventDefault(); handleDPad('UP'); }}
              className={`${boardSize === 'large' ? 'w-20 h-20 text-3xl' : 'w-14 h-14 text-xl'} bg-gray-700/80 active:bg-green-600 rounded-xl flex items-center justify-center text-white shadow-lg border border-gray-600/50 transition-colors touch-none select-none`}
            >
              ▲
            </button>
            <div className="flex gap-1.5">
              <button
                onPointerDown={(e) => { e.preventDefault(); handleDPad('LEFT'); }}
                className={`${boardSize === 'large' ? 'w-20 h-20 text-3xl' : 'w-14 h-14 text-xl'} bg-gray-700/80 active:bg-green-600 rounded-xl flex items-center justify-center text-white shadow-lg border border-gray-600/50 transition-colors touch-none select-none`}
              >
                ◀
              </button>
              <div className={`${boardSize === 'large' ? 'w-20 h-20' : 'w-14 h-14'} rounded-xl bg-gray-800/40 border border-gray-700/30 flex items-center justify-center text-gray-600 text-xs`}>
                ●
              </div>
              <button
                onPointerDown={(e) => { e.preventDefault(); handleDPad('RIGHT'); }}
                className={`${boardSize === 'large' ? 'w-20 h-20 text-3xl' : 'w-14 h-14 text-xl'} bg-gray-700/80 active:bg-green-600 rounded-xl flex items-center justify-center text-white shadow-lg border border-gray-600/50 transition-colors touch-none select-none`}
              >
                ▶
              </button>
            </div>
            <button
              onPointerDown={(e) => { e.preventDefault(); handleDPad('DOWN'); }}
              className={`${boardSize === 'large' ? 'w-20 h-20 text-3xl' : 'w-14 h-14 text-xl'} bg-gray-700/80 active:bg-green-600 rounded-xl flex items-center justify-center text-white shadow-lg border border-gray-600/50 transition-colors touch-none select-none`}
            >
              ▼
            </button>
          </div>
          <p className="text-center text-gray-500 text-[10px] mt-2">Glissez ou utilisez les boutons</p>
        </div>

        {/* Desktop Instructions */}
        <div className="hidden md:block text-center text-gray-500 text-xs mt-2 space-y-1">
          <p>🎮 <span className="text-gray-400">Flèches</span> ou <span className="text-gray-400">WASD</span> pour diriger le serpent</p>
          <p>⏸ <span className="text-gray-400">Espace</span> pour pause • <span className="text-gray-400">Entrée</span> pour démarrer</p>
        </div>
      </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-2xl border border-gray-700 shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white">⚙️ Paramètres</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <span className="text-xl">✕</span>
              </button>
            </div>
            
            <div className="p-4 space-y-5">
              {/* Board Size */}
              <div>
                <label className="text-sm font-semibold text-gray-300 mb-2 block">📐 Taille du plateau</label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { key: 'small' as BoardSize, label: 'Petit', emoji: '🔹' },
                    { key: 'medium' as BoardSize, label: 'Moyen', emoji: '🔷' },
                    { key: 'large' as BoardSize, label: 'Grand', emoji: '🟦' },
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
                      {size.emoji} {size.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fullscreen */}
              <div>
                <label className="text-sm font-semibold text-gray-300 mb-2 block">🖥️ Affichage</label>
                <button
                  onClick={toggleFullscreen}
                  className={`w-full py-2.5 px-4 rounded-xl text-sm font-bold transition-all ${
                    isFullscreen
                      ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {isFullscreen ? '🔲 Quitter le plein écran' : '⬜ Plein écran'}
                </button>
              </div>

              {/* Game Mode */}
              <div>
                <label className="text-sm font-semibold text-gray-300 mb-2 block">🎮 Mode de jeu</label>
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
                    🎮 Classique
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
                    🏆 Niveaux
                  </button>
                </div>
              </div>

              {/* Difficulty */}
              <div>
                <label className="text-sm font-semibold text-gray-300 mb-2 block">⚡ Difficulté</label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { key: 'easy' as Difficulty, label: 'Facile', emoji: '🐢', color: 'from-green-500 to-green-600' },
                    { key: 'medium' as Difficulty, label: 'Moyen', emoji: '🐇', color: 'from-yellow-500 to-orange-500' },
                    { key: 'hard' as Difficulty, label: 'Difficile', emoji: '⚡', color: 'from-red-500 to-red-600' },
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
                      {d.emoji} {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Wrap Around */}
              <div>
                <label className="text-sm font-semibold text-gray-300 mb-2 block">🌀 Traversée des murs</label>
                <button
                  onClick={toggleWrapAround}
                  disabled={gameState === 'playing' || gameState === 'paused' || gameMode === 'levels'}
                  className={`w-full py-2.5 px-4 rounded-xl text-sm font-bold transition-all ${
                    wrapAround
                      ? 'bg-gradient-to-r from-purple-600 to-violet-600 text-white shadow-lg'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  } ${(gameState === 'playing' || gameState === 'paused' || gameMode === 'levels') ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  {wrapAround ? '🌀 Activé' : '🧱 Désactivé'}
                  {gameMode === 'levels' && ' (désactivé en mode niveaux)'}
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
