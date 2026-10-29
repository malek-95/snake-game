import { useEffect, useRef, useCallback, useState } from 'react';
import { useSnakeGame } from './hooks/useSnakeGame';
import { useTranslation } from './i18n/useTranslation';
import { useBoardFit } from './hooks/useBoardFit';
import { useInstallPrompt } from './hooks/useInstallPrompt';
import { useAudioSettings, useGameSounds } from './hooks/useGameSounds';
import { useLook, SKINS, skinById } from './features/look';
import { useLeaderboard, boardKey, qualifies } from './features/leaderboard';
import { useAchievements } from './features/achievements';
import { useReplayRecorder } from './features/replay';
import { useCustomLevels, type CustomLevel } from './features/customLevels';
import { Board } from './components/Board';
import { SettingsModal } from './components/SettingsModal';
import { LeaderboardModal } from './components/LeaderboardModal';
import { AchievementsModal } from './components/AchievementsModal';
import { AchievementToasts } from './components/AchievementToasts';
import { ReplayViewer } from './components/ReplayViewer';
import { LevelEditor } from './components/LevelEditor';
import { VersusScreen } from './components/VersusScreen';
import { OnlineLobby } from './components/OnlineLobby';
import { onlineEnabled } from './online/client';
import { submitWorldScore, fetchDailyGhost, type DailyGhost } from './online/worldLeaderboard';
import type { Direction, BoardSize, GameMode } from './types/game.types';
import type { Translations } from './i18n/translations';

type Screen = 'game' | 'versus' | 'editor' | 'online';

// An invite link (?room=ABCD) opens the online lobby and joins that room.
const inviteCode = new URLSearchParams(location.search).get('room') ?? undefined;
if (inviteCode) history.replaceState(null, '', location.pathname);
type ModalName = 'settings' | 'leaderboard' | 'achievements' | 'replay' | null;

const KEY_DIRECTIONS: Record<string, Direction> = {
  ArrowUp: 'UP', w: 'UP', W: 'UP',
  ArrowDown: 'DOWN', s: 'DOWN', S: 'DOWN',
  ArrowLeft: 'LEFT', a: 'LEFT', A: 'LEFT',
  ArrowRight: 'RIGHT', d: 'RIGHT', D: 'RIGHT',
};

const MODE_DESCRIPTIONS: Record<GameMode, keyof Translations> = {
  classic: 'classicDescription',
  levels: 'levelsDescription',
  timeAttack: 'timeAttackDescription',
  survival: 'survivalDescription',
  zen: 'zenDescription',
  golden: 'goldenDescription',
  custom: 'customDescription',
  daily: 'dailyDescription',
};

const isTyping = (e: KeyboardEvent) =>
  e.target instanceof HTMLElement && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT');

function App() {
  const game = useSnakeGame();
  const {
    snake, food, gameState, score, highScore, difficulty, wrapAround, applesEaten, multiplier,
    bonusEvent, lives, bonusLivesGiven, lifeLostEvent, lifeGainedEvent, gameMode, level, obstacles,
    levelApples, levelCompleteEvent, invincible, grid, setPreferredGrid, goldenFood, timeLeft, gameId,
    setCustomLevel, endGame, startGame, togglePause, changeDirection, changeDifficulty, toggleWrapAround, changeGameMode,
  } = game;

  const { language, setLanguage, t } = useTranslation();
  const audio = useAudioSettings();
  const look = useLook();
  const leaderboard = useLeaderboard();
  const customLevels = useCustomLevels();
  const install = useInstallPrompt();
  const replays = useReplayRecorder(game);

  // Ghost race (daily challenge): today's best run replays beside you, one step per tick.
  const [ghost, setGhost] = useState<DailyGhost | null>(null);
  const ghostTick = useRef(0);
  useEffect(() => {
    ghostTick.current = 0;
    if (gameMode === 'daily' && onlineEnabled) fetchDailyGhost().then(setGhost);
    else setGhost(null);
  }, [gameId, gameMode]); // eslint-disable-line react-hooks/exhaustive-deps
  const lastSnake = useRef(snake);
  if (snake !== lastSnake.current) {
    lastSnake.current = snake;
    if (gameState === 'playing') ghostTick.current++;
  }
  const ghostCells = ghost && gameState !== 'idle' ? ghost.path[Math.min(ghostTick.current, ghost.path.length - 1)] : null;
  const ghostBody = ghostCells?.map(c => ({ x: c % 20, y: Math.floor(c / 20) }));
  const achievements = useAchievements({
    mode: gameMode, difficulty, gameState, applesEaten, score, level, multiplier,
    goldenEaten: game.goldenEaten, length: snake.length, gameId,
  });

  const [screen, setScreen] = useState<Screen>(inviteCode ? 'online' : 'game');
  const [modal, setModal] = useState<ModalName>(null);
  const [boardSize, setBoardSize] = useState<BoardSize>('medium');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [customLevelId, setCustomLevelId] = useState<string | undefined>(customLevels.levels[0]?.id);
  const [nameInput, setNameInput] = useState(leaderboard.playerName);
  const [saved, setSaved] = useState<{ gameId: number; rank: number; world: 'sending' | 'sent' | 'kept' | 'error' | null } | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  // When the current game started, so the world board can reject impossibly fast games.
  const gameStartedAt = useRef(0);
  useEffect(() => {
    gameStartedAt.current = performance.now();
  }, [gameId]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Music only while the single-player screen is in front.
  useGameSounds(game, audio.music && screen === 'game');

  // Skins locked behind an achievement fall back to the classic look.
  const skin = !look.skin.unlockedBy || achievements.unlocked[look.skin.unlockedBy] ? look.skin : SKINS[0];
  const { theme } = look;

  const running = gameState === 'playing' || gameState === 'paused';

  // Keep the hook's custom level in sync with the chosen one.
  const customLevel = customLevels.levels.find(l => l.id === customLevelId) ?? customLevels.levels[0];
  useEffect(() => {
    setCustomLevel(customLevel?.obstacles ?? []);
  }, [customLevel, setCustomLevel]);

  // Keyboard controls
  useEffect(() => {
    if (screen !== 'game' || modal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isTyping(e)) return;
      if ((gameState === 'idle' || gameState === 'gameover') && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault();
        startGame();
        return;
      }
      if (running && (e.key === ' ' || e.key === 'Escape' || e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        togglePause();
        return;
      }
      const dir = KEY_DIRECTIONS[e.key];
      if (gameState === 'playing' && dir) {
        e.preventDefault();
        changeDirection(dir);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [screen, modal, gameState, running, startGame, togglePause, changeDirection]);

  // Opening a dialog pauses the game.
  const openModal = useCallback((name: ModalName) => {
    if (gameState === 'playing') togglePause();
    setModal(name);
  }, [gameState, togglePause]);

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
    touchStartRef.current = null;
    if (Math.abs(dx) < 30 && Math.abs(dy) < 30) return;
    if (Math.abs(dx) > Math.abs(dy)) changeDirection(dx > 0 ? 'RIGHT' : 'LEFT');
    else changeDirection(dy > 0 ? 'DOWN' : 'UP');
  }, [gameState, changeDirection]);

  const handleDPad = useCallback((dir: Direction) => {
    if (gameState === 'playing') changeDirection(dir);
  }, [gameState, changeDirection]);

  // Fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) containerRef.current?.requestFullscreen?.().catch(() => {});
    else document.exitFullscreen().catch(() => {});
  }, []);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  // Large board and real fullscreen: the board fills the leftover space with ~28px cells.
  const fill = boardSize === 'large' || isFullscreen;
  const { areaRef, preferredGrid, boardStyle } = useBoardFit(fill);
  useEffect(() => {
    setPreferredGrid(preferredGrid);
  }, [preferredGrid.cols, preferredGrid.rows, setPreferredGrid]); // eslint-disable-line react-hooks/exhaustive-deps

  const boardSizeClasses: Record<BoardSize, string> = {
    small: 'w-full max-w-[80vw] sm:max-w-md',
    medium: 'w-full max-w-[90vw] sm:max-w-lg',
    large: '',
  };

  // Mode picking: 2 players (local or online) has its own screen.
  const selectMode = (mode: GameMode | 'versus' | 'online') => {
    if (mode === 'versus' || mode === 'online') {
      if (gameState === 'playing') togglePause();
      setModal(null);
      setScreen(mode);
    } else {
      changeGameMode(mode);
    }
  };

  const playCustomLevel = (level: CustomLevel) => {
    setCustomLevelId(level.id);
    setCustomLevel(level.obstacles);
    changeGameMode('custom');
    setScreen('game');
    startGame();
  };

  // Leaderboard entry at game over.
  const scoreDifficulty = gameMode === 'daily' ? 'medium' : difficulty; // daily: same rules for everyone
  const lbKey = boardKey(gameMode, scoreDifficulty);
  const savedThisGame = saved?.gameId === gameId ? saved : null;
  const qualifiesHere = qualifies(leaderboard.boards[lbKey] ?? [], score);
  // Any score can go to the world board; only top-10 scores are kept on this device.
  const canSaveScore = gameState === 'gameover' && !savedThisGame && score > 0 && (qualifiesHere || onlineEnabled);
  const saveScore = () => {
    const entry = { name: nameInput, score, apples: applesEaten, level: gameMode === 'levels' ? level : undefined };
    const rank = qualifiesHere ? leaderboard.addScore(lbKey, { ...entry, date: new Date().toISOString() }) : 0;
    const id = gameId;
    setSaved({ gameId: id, rank, world: onlineEnabled ? 'sending' : null });
    if (onlineEnabled) {
      submitWorldScore({
        ...entry, mode: gameMode, difficulty: scoreDifficulty, golden: game.goldenEaten, durationMs: performance.now() - gameStartedAt.current,
        ghost: gameMode === 'daily' && replays.lastReplay?.mode === 'daily' ? replays.lastReplay.frames.map(f => f.s) : undefined,
      })
        .then(improved => setSaved(s => (s?.gameId === id ? { ...s, world: improved ? 'sent' : 'kept' } : s)))
        .catch(() => setSaved(s => (s?.gameId === id ? { ...s, world: 'error' } : s)));
    }
  };

  if (screen === 'online') {
    return (
      <>
        <OnlineLobby
          difficulty={difficulty}
          skin={skin}
          theme={theme}
          musicOn={audio.music}
          t={t}
          initialCode={inviteCode}
          onExit={() => setScreen('game')}
          onMatchWon={achievements.recordVersusWin}
        />
        <AchievementToasts toasts={achievements.toasts} dismiss={achievements.dismissToast} language={language} t={t} />
      </>
    );
  }

  if (screen === 'versus') {
    return (
      <>
        <VersusScreen
          difficulty={difficulty}
          skin={skin}
          theme={theme}
          musicOn={audio.music}
          t={t}
          onExit={() => setScreen('game')}
          onMatchWon={achievements.recordVersusWin}
        />
        <AchievementToasts toasts={achievements.toasts} dismiss={achievements.dismissToast} language={language} t={t} />
      </>
    );
  }

  if (screen === 'editor') {
    return (
      <LevelEditor
        levels={customLevels.levels}
        saveLevel={customLevels.saveLevel}
        deleteLevel={customLevels.deleteLevel}
        onPlay={playCustomLevel}
        onBack={() => setScreen('game')}
        skin={skin}
        theme={theme}
        t={t}
      />
    );
  }

  const statLabel = `text-gray-400 uppercase tracking-widest font-medium ${fill ? 'text-[9px]' : 'text-[9px] sm:text-xs'}`;
  const statValue = fill ? 'text-lg' : 'text-lg sm:text-2xl';
  const levelTarget = 5 + level * 2;
  const headerButtons: [ModalName | 'editor', string, string][] = [
    ['leaderboard', '🏆', t('leaderboard')],
    ['achievements', '🎖️', t('achievements')],
    ['replay', '🎬', t('replay')],
    ['editor', '✏️', t('editor')],
    ['settings', '⚙️', t('settings')],
  ];

  return (
    <div
      ref={containerRef}
      className={`min-h-screen flex flex-col items-center select-none ${fill ? 'h-[100dvh] overflow-y-auto' : 'p-3 md:p-4 pb-8'}`}
      style={{ background: theme.background }}
    >
      <div className={`w-full flex flex-col items-center ${fill ? 'flex-1 py-2 gap-2' : 'flex-grow justify-center py-4 gap-3 md:gap-4'}`}>
        {/* Header */}
        <div className={`w-full shrink-0 ${fill ? 'max-w-full px-4' : 'max-w-[90vw] sm:max-w-md md:max-w-lg'}`}>
          <div className="flex items-center justify-between mb-2 gap-2">
            <h1 className={`font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400 ${fill ? 'text-xl md:text-3xl' : 'text-2xl md:text-4xl'}`}>
              🐍 Snake
            </h1>
            <div className="flex gap-1.5">
              {headerButtons.map(([name, icon, label]) => (
                <button
                  key={name}
                  onClick={() => {
                    if (name !== 'editor') return openModal(name);
                    if (gameState === 'playing') togglePause();
                    setScreen('editor');
                  }}
                  className="p-2 bg-gray-700/60 hover:bg-gray-600 rounded-xl transition-colors border border-gray-600/50"
                  title={label}
                  aria-label={label}
                >
                  <span className="text-lg md:text-xl">{icon}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Score Board */}
          <div className={`flex justify-between items-center bg-gray-800/60 backdrop-blur-sm rounded-2xl border border-gray-700/50 shadow-lg ${fill ? 'px-3 py-1.5' : 'px-2 sm:px-4 py-2 sm:py-3'}`}>
            {[
              [t('score'), score, 'text-white'],
              [t('record'), highScore, 'text-yellow-400'],
              [t('bonus'), `x${multiplier}`, multiplier > 1 ? 'text-orange-400' : 'text-gray-500'],
              [t('apples'), applesEaten, 'text-red-400'],
              ...(gameMode === 'timeAttack' ? [[t('time'), `${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, '0')}`, timeLeft <= 10 ? 'text-red-400 animate-pulse' : 'text-cyan-300']] : []),
            ].map(([label, value, color], i) => (
              <div key={i} className="contents">
                <div className="text-center flex-1">
                  <p className={statLabel}>{label}</p>
                  <p className={`font-bold tabular-nums ${statValue} ${color}`}>{value}</p>
                </div>
                <div className="bg-gray-700 w-px h-6" />
              </div>
            ))}
            <div className="text-center flex-1">
              <p className={statLabel}>{t('lives')}</p>
              <p className={`font-bold ${fill ? 'text-lg' : 'text-lg md:text-xl'}`}>
                {gameMode === 'zen' ? '∞' : Array.from({ length: lives }).map((_, i) => <span key={i} className="text-red-500">❤️</span>)}
              </p>
            </div>
          </div>

          {bonusLivesGiven < 3 && gameMode !== 'zen' && (
            <p className="mt-1 px-2 text-[10px] text-gray-500 text-center">
              {t('livesBonus')} {30 - (applesEaten % 30)} {t('applesWord')} • {3 - bonusLivesGiven} {3 - bonusLivesGiven > 1 ? t('remainingPlural') : t('remaining')}
            </p>
          )}

          <div className="mt-2 px-2 flex items-center gap-2">
            <span className="text-xs text-gray-400 whitespace-nowrap">{t('nextBonus')}</span>
            <div className="flex-1 h-2 bg-gray-700/50 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-orange-500 to-yellow-400 transition-all duration-300 rounded-full" style={{ width: `${(applesEaten % 10) * 10}%` }} />
            </div>
            <span className="text-xs text-gray-400 tabular-nums">{applesEaten % 10}/10</span>
          </div>

          {/* Notifications */}
          <div className={`relative ${fill ? 'h-0' : 'h-16 mt-2'}`}>
            {gameState === 'playing' && [
              bonusEvent && { id: bonusEvent.id, cls: 'from-orange-500/90 to-yellow-500/90 shadow-orange-500/50 border-yellow-300/50 animate-bonus-pop', title: t('bonusNotification'), sub: `x${bonusEvent.multiplier} • ${bonusEvent.applesCount} 🍎` },
              lifeLostEvent && { id: lifeLostEvent.id, cls: 'from-red-600/90 to-rose-600/90 shadow-red-500/50 border-red-300/50 animate-life-lost-pop', title: t('lifeLost'), sub: `${lifeLostEvent.livesRemaining} ${t('remaining2')}` },
              lifeGainedEvent && { id: lifeGainedEvent.id, cls: 'from-green-500/90 to-emerald-500/90 shadow-green-500/50 border-green-300/50 animate-life-gained-pop', title: t('lifeGained'), sub: `${lifeGainedEvent.lives} ${lifeGainedEvent.lives > 1 ? t('totalPlural') : t('total')}` },
              levelCompleteEvent && { id: levelCompleteEvent.id, cls: 'from-purple-600/90 to-pink-600/90 shadow-purple-500/50 border-purple-300/50 animate-level-complete-pop', title: `${t('levelComplete')} ${levelCompleteEvent.level} ${t('levelCompleteEnd')}`, sub: `${t('nextLevel')} ${levelCompleteEvent.level + 1}${t('nextLevelEnd')}` },
            ].map(n => n && (
              <div key={n.id} className="absolute top-0 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
                <div className={`bg-gradient-to-r backdrop-blur-sm px-4 py-2 rounded-xl shadow-2xl border text-center ${n.cls}`}>
                  <p className="text-white font-bold text-sm md:text-base">{n.title}</p>
                  <p className="text-white/80 text-xs md:text-sm font-semibold">{n.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {ghost && gameMode === 'daily' && (
          <p className="text-sm text-gray-300 shrink-0" role="status">👻 {t('racing')} <b className="text-white">{ghost.name}</b>: {ghost.score}</p>
        )}
        {/* Game Board */}
        <div ref={areaRef} className={fill ? 'flex-1 min-h-[16rem] w-full px-2 flex items-center justify-center' : 'w-full flex justify-center'}>
          <Board
            grid={grid}
            theme={theme}
            snakes={[
              ...(ghostBody ? [{ body: ghostBody, skin: skinById('ghost'), effect: 'ghost' as const }] : []),
              { body: snake, skin, blink: invincible },
            ]}
            tickMs={game.tickMs}
            food={food}
            golden={goldenFood}
            obstacles={obstacles}
            accentBorder={gameMode === 'levels' || gameMode === 'custom' || wrapAround || gameMode === 'zen'}
            wrapGlow={(wrapAround || gameMode === 'zen') && gameState === 'playing'}
            className={`transition-all duration-300 ${fill ? '' : boardSizeClasses[boardSize]}`}
            style={boardStyle(grid)}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {gameState !== 'playing' && (
              <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center-safe overflow-y-auto py-2 px-4 z-30 rounded-2xl text-center">
                {gameState === 'idle' && (
                  <>
                    <div className="text-5xl md:text-6xl mb-4 animate-bounce @max-xs:hidden">🐍</div>
                    <h2 className="text-xl md:text-2xl mb-2 font-bold text-white">{t('snakeGame')}</h2>
                    <p className="text-gray-300 max-w-xs text-xs md:text-sm mb-2">{t(MODE_DESCRIPTIONS[gameMode])}</p>
                    <p className="text-gray-400 mb-4 text-[10px]">{t('mode')}: {t(gameMode)} · {t(difficulty)}</p>
                    <button onClick={startGame} disabled={gameMode === 'custom' && !customLevel} className="bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-green-500/25 hover:scale-105 active:scale-95 transition-all px-8 py-3 text-lg disabled:opacity-40">
                      {t('play')}
                    </button>
                    {gameMode === 'custom' && !customLevel && <p className="text-amber-300 text-xs mt-2">{t('noCustomLevels')}</p>}
                    <p className="text-gray-500 mt-3 text-[10px]">{t('pressEnterOrSpace')}</p>
                  </>
                )}

                {gameState === 'paused' && (
                  <>
                    <div className="text-4xl md:text-5xl mb-4 @max-xs:hidden">⏸️</div>
                    <h2 className="text-xl md:text-2xl mb-2 font-bold text-white">{t('paused')}</h2>
                    <p className="text-gray-400 mb-4 text-sm">{t('currentScore')} {score}</p>
                    <button onClick={togglePause} className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-all px-8 py-3">
                      {t('resume')}
                    </button>
                  </>
                )}

                {gameState === 'gameover' && (
                  <>
                    <div className="text-4xl md:text-5xl mb-2 @max-xs:hidden">{gameMode === 'timeAttack' && timeLeft === 0 ? '⏱️' : '💀'}</div>
                    <h2 className="text-xl md:text-2xl mb-2 font-bold text-red-400">{t('gameOver')}</h2>
                    <div className="bg-gray-800/80 rounded-xl border border-gray-700 space-y-1 mb-3 px-6 py-3">
                      <p className="text-white">{t('score')}: <span className="font-bold text-green-400 text-xl">{score}</span></p>
                      <p className="text-gray-300 text-sm">🍎 {applesEaten} {t('applesEaten')}</p>
                      {gameMode === 'levels' && <p className="text-purple-300 text-sm">{t('levelReached')} <b>{level}</b></p>}
                      {score >= highScore && score > 0 && <p className="text-yellow-400 mt-1 animate-pulse font-semibold text-sm">{t('newRecord')}</p>}
                    </div>

                    {canSaveScore && (
                      <form className="mb-3 flex flex-col items-center gap-2" onSubmit={e => { e.preventDefault(); saveScore(); }}>
                        <label htmlFor="player-name" className="text-amber-200 text-sm font-semibold">{qualifiesHere ? t('topTen') : t('saveYourScore')}</label>
                        <div className="flex gap-2">
                          <input
                            id="player-name"
                            autoFocus
                            maxLength={16}
                            value={nameInput}
                            onChange={e => setNameInput(e.target.value)}
                            className="w-36 px-3 py-1.5 rounded-lg bg-gray-900 text-white border border-gray-600 focus:outline-none focus:border-amber-400"
                          />
                          <button type="submit" className="px-3 py-1.5 rounded-lg bg-amber-500 text-gray-900 font-bold text-sm">{t('saveScore')}</button>
                        </div>
                      </form>
                    )}
                    {savedThisGame && (
                      <div className="mb-3 text-sm font-semibold space-y-0.5" role="status">
                        {savedThisGame.rank > 0 && <p className="text-amber-300">🏅 {t('rankedAt')}{savedThisGame.rank}</p>}
                        {savedThisGame.world === 'sending' && <p className="text-gray-400">{t('loading')}</p>}
                        {savedThisGame.world === 'sent' && <p className="text-sky-300">{t('sentWorld')}</p>}
                        {savedThisGame.world === 'kept' && <p className="text-gray-300">{t('worldBestKept')}</p>}
                        {savedThisGame.world === 'error' && <p className="text-red-400">{t('worldFailed')}</p>}
                      </div>
                    )}

                    <div className="flex gap-2 flex-wrap justify-center">
                      <button onClick={startGame} className="bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-all px-6 py-3">
                        {t('playAgain')}
                      </button>
                      {replays.lastReplay && (
                        <button onClick={() => openModal('replay')} className="bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-xl px-4 py-3 transition-colors">
                          {t('watchReplay')}
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </Board>
        </div>

        {/* Controls */}
        <div className={`w-full shrink-0 ${fill ? 'max-w-full px-4 space-y-2' : 'max-w-[90vw] sm:max-w-md md:max-w-lg space-y-3'}`}>
          {running && (
            <div className="flex gap-2 justify-center">
              {gameState === 'playing' && (
                <button onClick={togglePause} className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 text-white font-semibold rounded-xl shadow-lg px-4 py-2 text-sm">
                  {t('pause')}
                </button>
              )}
              <button onClick={startGame} className="bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 text-white font-semibold rounded-xl shadow-lg px-4 py-2 text-sm">
                {t('restart')}
              </button>
              <button onClick={endGame} className="bg-gradient-to-r from-rose-700 to-red-800 hover:from-rose-600 text-white font-semibold rounded-xl shadow-lg px-4 py-2 text-sm">
                {t('endGame')}
              </button>
            </div>
          )}

          {gameMode === 'levels' && (
            <div className="bg-gray-800/60 backdrop-blur-sm rounded-xl px-4 py-2 border border-purple-700/50">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-purple-300 font-semibold">{t('level')} {level}</span>
                <span className="text-xs text-gray-400">{levelApples}/{levelTarget} {t('applesProgress')}</span>
              </div>
              <div className="w-full h-2 bg-gray-700/50 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300 rounded-full" style={{ width: `${(levelApples / levelTarget) * 100}%` }} />
              </div>
            </div>
          )}

          {/* Mobile D-Pad */}
          <div className={`md:hidden ${fill ? 'mt-2' : 'mt-3'}`}>
            <div className="flex flex-col items-center gap-1.5">
              {([['UP'], ['LEFT', null, 'RIGHT'], ['DOWN']] as (Direction | null)[][]).map((row, r) => (
                <div key={r} className="flex gap-1.5">
                  {row.map((dir, c) =>
                    dir ? (
                      <button
                        key={c}
                        aria-label={dir}
                        onPointerDown={e => { e.preventDefault(); handleDPad(dir); }}
                        className="w-14 h-14 text-xl bg-gray-700/80 active:bg-green-600 rounded-xl flex items-center justify-center text-white shadow-lg border border-gray-600/50 transition-colors touch-none select-none"
                      >
                        {{ UP: '▲', DOWN: '▼', LEFT: '◀', RIGHT: '▶' }[dir]}
                      </button>
                    ) : (
                      <div key={c} className="w-14 h-14 rounded-xl bg-gray-800/40 border border-gray-700/30 flex items-center justify-center text-gray-600 text-xs">●</div>
                    ),
                  )}
                </div>
              ))}
            </div>
            <p className="text-center text-gray-500 text-[10px] mt-2">{t('swipeOrButtons')}</p>
          </div>

          <div className="hidden md:block text-center text-gray-500 text-xs mt-2 space-y-1">
            <p>{t('arrowsOrWasd')}</p>
            <p>{t('spacePause')}</p>
          </div>
        </div>
      </div>

      {modal === 'settings' && (
        <SettingsModal
          t={t}
          language={language}
          setLanguage={setLanguage}
          locked={running}
          gameMode={gameMode}
          onSelectMode={selectMode}
          difficulty={difficulty}
          changeDifficulty={changeDifficulty}
          wrapAround={wrapAround}
          toggleWrapAround={toggleWrapAround}
          boardSize={boardSize}
          setBoardSize={setBoardSize}
          isFullscreen={isFullscreen}
          toggleFullscreen={toggleFullscreen}
          sfx={audio.sfx}
          music={audio.music}
          setSfx={audio.setSfx}
          setMusic={audio.setMusic}
          skin={skin}
          setSkin={look.setSkin}
          theme={theme}
          setTheme={look.setTheme}
          unlocked={achievements.unlocked}
          customLevels={customLevels.levels}
          customLevelId={customLevel?.id}
          setCustomLevelId={setCustomLevelId}
          onOpenEditor={() => { setModal(null); setScreen('editor'); }}
          install={install}
          onClose={() => setModal(null)}
        />
      )}
      {modal === 'leaderboard' && (
        <LeaderboardModal boards={leaderboard.boards} initialMode={gameMode} initialDifficulty={difficulty} language={language} t={t} onClose={() => setModal(null)} />
      )}
      {modal === 'achievements' && (
        <AchievementsModal unlocked={achievements.unlocked} language={language} t={t} onClose={() => setModal(null)} />
      )}
      {modal === 'replay' && (
        <ReplayViewer last={replays.lastReplay} best={replays.bestReplay} skin={skin} theme={theme} t={t} onClose={() => setModal(null)} />
      )}

      <AchievementToasts toasts={achievements.toasts} dismiss={achievements.dismissToast} language={language} t={t} />
    </div>
  );
}

export default App;
