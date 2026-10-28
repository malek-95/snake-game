import { useEffect, useRef, useCallback } from 'react';
import { useSnakeGame, Direction, Difficulty } from './hooks/useSnakeGame';

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
    gridSize,
    startGame,
    togglePause,
    changeDirection,
    changeDifficulty,
    toggleWrapAround,
  } = useSnakeGame();

  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

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

  const difficulties: { key: Difficulty; label: string; emoji: string; color: string }[] = [
    { key: 'easy', label: 'Facile', emoji: '🟢', color: 'from-green-500 to-green-600' },
    { key: 'medium', label: 'Moyen', emoji: '🟡', color: 'from-yellow-500 to-orange-500' },
    { key: 'hard', label: 'Difficile', emoji: '🔴', color: 'from-red-500 to-red-600' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-900 flex flex-col items-center justify-center p-3 md:p-4 select-none overflow-hidden">
      {/* Header */}
      <div className="w-full max-w-md md:max-w-lg mb-3 md:mb-4">
        <h1 className="text-2xl md:text-4xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400 mb-3">
          🐍 Snake Game
        </h1>

        {/* Score Board */}
        <div className="flex justify-between items-center bg-gray-800/60 backdrop-blur-sm rounded-2xl px-4 py-3 border border-gray-700/50 shadow-lg">
          <div className="text-center flex-1">
            <p className="text-[10px] md:text-xs text-gray-400 uppercase tracking-widest font-medium">Score</p>
            <p className="text-xl md:text-2xl font-bold text-white tabular-nums">{score}</p>
          </div>
          <div className="w-px h-8 bg-gray-700" />
          <div className="text-center flex-1">
            <p className="text-[10px] md:text-xs text-gray-400 uppercase tracking-widest font-medium">🏆 Record</p>
            <p className="text-xl md:text-2xl font-bold text-yellow-400 tabular-nums">{highScore}</p>
          </div>
          <div className="w-px h-8 bg-gray-700" />
          <div className="text-center flex-1">
            <p className="text-[10px] md:text-xs text-gray-400 uppercase tracking-widest font-medium">Bonus</p>
            <p className={`text-lg md:text-xl font-bold tabular-nums ${multiplier > 1 ? 'text-orange-400' : 'text-gray-500'}`}>
              x{multiplier}
            </p>
          </div>
          <div className="w-px h-8 bg-gray-700" />
          <div className="text-center flex-1">
            <p className="text-[10px] md:text-xs text-gray-400 uppercase tracking-widest font-medium">Pommes</p>
            <p className="text-lg md:text-xl font-bold text-red-400 tabular-nums">{applesEaten}</p>
          </div>
        </div>
        
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
        className={`relative w-full max-w-md md:max-w-lg aspect-square bg-gray-900/80 rounded-2xl border-2 overflow-hidden transition-all duration-300 ${
          wrapAround
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
            className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none"
          >
            <div className="bg-gradient-to-r from-orange-500/90 to-yellow-500/90 backdrop-blur-sm px-6 py-3 rounded-2xl shadow-2xl shadow-orange-500/50 border border-yellow-300/50 animate-bonus-pop">
              <div className="text-center">
                <p className="text-white font-bold text-lg md:text-xl">🎉 BONUS!</p>
                <p className="text-yellow-100 text-sm md:text-base font-semibold">
                  x{bonusEvent.multiplier} points • {bonusEvent.applesCount} pommes 🍎
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Snake body segments */}
        {snake.map((segment, index) => {
          const isHead = index === 0;
          const opacity = isHead ? 1 : Math.max(0.4, 1 - (index / snake.length) * 0.6);
          return (
            <div
              key={index}
              className={`absolute rounded-md ${isHead ? 'z-20' : 'z-10'}`}
              style={{
                left: `calc(${segment.x} * 100% / ${gridSize} + 1px)`,
                top: `calc(${segment.y} * 100% / ${gridSize} + 1px)`,
                width: `calc(100% / ${gridSize} - 2px)`,
                height: `calc(100% / ${gridSize} - 2px)`,
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

        {/* Idle Overlay */}
        {gameState === 'idle' && (
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center z-30 rounded-2xl">
            <div className="text-5xl md:text-6xl mb-4 animate-bounce">🐍</div>
            <h2 className="text-xl md:text-2xl font-bold text-white mb-2">Jeu du Serpent</h2>
            <p className="text-gray-300 text-xs md:text-sm mb-6 text-center px-6 max-w-xs">
              Dirigez le serpent pour manger les pommes. Ne touchez pas les murs ni vous-même!
            </p>
            <button
              onClick={startGame}
              className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-green-500/25 hover:shadow-green-500/40 hover:scale-105 active:scale-95 transition-all duration-200 text-lg"
            >
              ▶ Jouer
            </button>
            <p className="text-gray-500 text-[10px] mt-4">Appuyez sur Entrée ou Espace</p>
          </div>
        )}

        {/* Paused Overlay */}
        {gameState === 'paused' && (
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center z-30 rounded-2xl">
            <div className="text-4xl md:text-5xl mb-4">⏸️</div>
            <h2 className="text-xl md:text-2xl font-bold text-white mb-2">Pause</h2>
            <p className="text-gray-400 text-sm mb-6">Score actuel: {score}</p>
            <button
              onClick={togglePause}
              className="px-8 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-105 active:scale-95 transition-all duration-200"
            >
              ▶ Reprendre
            </button>
          </div>
        )}

        {/* Game Over Overlay */}
        {gameState === 'gameover' && (
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center z-30 rounded-2xl">
            <div className="text-4xl md:text-5xl mb-3">💀</div>
            <h2 className="text-xl md:text-2xl font-bold text-red-400 mb-3">Game Over!</h2>
            <div className="bg-gray-800/80 rounded-xl px-6 py-3 mb-4 border border-gray-700">
              <p className="text-white text-center">
                Score: <span className="font-bold text-green-400 text-xl">{score}</span>
              </p>
              {score >= highScore && score > 0 && (
                <p className="text-yellow-400 text-sm text-center mt-2 animate-pulse font-semibold">
                  🏆 Nouveau record!
                </p>
              )}
            </div>
            <button
              onClick={startGame}
              className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-green-500/25 hover:shadow-green-500/40 hover:scale-105 active:scale-95 transition-all duration-200"
            >
              🔄 Rejouer
            </button>
          </div>
        )}
      </div>

      {/* Controls Section */}
      <div className="w-full max-w-md md:max-w-lg mt-3 md:mt-4 space-y-3">
        {/* Action Buttons */}
        <div className="flex gap-3 justify-center">
          {gameState === 'playing' && (
            <button
              onClick={togglePause}
              className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-semibold rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg text-sm md:text-base"
            >
              ⏸ Pause
            </button>
          )}
          {(gameState === 'playing' || gameState === 'paused') && (
            <button
              onClick={startGame}
              className="px-5 py-2.5 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 text-white font-semibold rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg text-sm md:text-base"
            >
              🔄 Restart
            </button>
          )}
        </div>

        {/* Difficulty Selector */}
        <div className="flex gap-2 justify-center">
          {difficulties.map(d => (
            <button
              key={d.key}
              onClick={() => changeDifficulty(d.key)}
              disabled={gameState === 'playing' || gameState === 'paused'}
              className={`px-3 md:px-4 py-2 text-xs md:text-sm font-bold text-white rounded-xl transition-all duration-200 ${
                difficulty === d.key
                  ? `bg-gradient-to-r ${d.color} ring-2 ring-white/30 scale-105 shadow-lg`
                  : 'bg-gray-700/80 hover:bg-gray-600 opacity-60 hover:opacity-80'
              } ${(gameState === 'playing' || gameState === 'paused') ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}`}
            >
              {d.emoji} {d.label}
            </button>
          ))}
        </div>

        {/* Wrap Around Mode Toggle */}
        <div className="flex justify-center">
          <button
            onClick={toggleWrapAround}
            disabled={gameState === 'playing' || gameState === 'paused'}
            className={`px-4 py-2 text-xs md:text-sm font-bold rounded-xl transition-all duration-200 border ${
              wrapAround
                ? 'bg-gradient-to-r from-purple-600 to-violet-600 text-white border-purple-400/50 shadow-lg shadow-purple-500/20 ring-2 ring-purple-400/30'
                : 'bg-gray-700/60 text-gray-400 border-gray-600/50 hover:bg-gray-600 hover:text-gray-300'
            } ${(gameState === 'playing' || gameState === 'paused') ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}`}
          >
            🌀 Traversée des murs {wrapAround ? 'ON' : 'OFF'}
          </button>
        </div>

        {/* Mobile D-Pad Controls */}
        <div className="md:hidden mt-3">
          <div className="flex flex-col items-center gap-1.5">
            <button
              onTouchStart={(e) => { e.preventDefault(); handleDPad('UP'); }}
              className="w-14 h-14 bg-gray-700/80 active:bg-green-600 rounded-xl flex items-center justify-center text-xl text-white shadow-lg border border-gray-600/50 transition-colors touch-none"
            >
              ▲
            </button>
            <div className="flex gap-1.5">
              <button
                onTouchStart={(e) => { e.preventDefault(); handleDPad('LEFT'); }}
                className="w-14 h-14 bg-gray-700/80 active:bg-green-600 rounded-xl flex items-center justify-center text-xl text-white shadow-lg border border-gray-600/50 transition-colors touch-none"
              >
                ◀
              </button>
              <div className="w-14 h-14 rounded-xl bg-gray-800/40 border border-gray-700/30 flex items-center justify-center text-gray-600 text-xs">
                ●
              </div>
              <button
                onTouchStart={(e) => { e.preventDefault(); handleDPad('RIGHT'); }}
                className="w-14 h-14 bg-gray-700/80 active:bg-green-600 rounded-xl flex items-center justify-center text-xl text-white shadow-lg border border-gray-600/50 transition-colors touch-none"
              >
                ▶
              </button>
            </div>
            <button
              onTouchStart={(e) => { e.preventDefault(); handleDPad('DOWN'); }}
              className="w-14 h-14 bg-gray-700/80 active:bg-green-600 rounded-xl flex items-center justify-center text-xl text-white shadow-lg border border-gray-600/50 transition-colors touch-none"
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
  );
}

export default App;
