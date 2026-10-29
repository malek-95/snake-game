import { useCallback, useEffect, useRef, useState } from 'react';
import { Board } from './Board';
import { useBoardFit } from '../hooks/useBoardFit';
import { newRound, queueTurn, stepVersus, matchWinner, WINS_NEEDED, type VersusState } from '../game/versus';
import { SPEED_CONFIG } from '../constants/game.constants';
import { sound } from '../audio/sound';
import { rivalSkin, type Skin, type Theme } from '../features/look';
import type { Room } from '../online/room';
import type { Difficulty, Direction } from '../types/game.types';
import type { TFunction } from '../i18n/useTranslation';

interface Props {
  difficulty: Difficulty;
  skin: Skin;
  theme: Theme;
  musicOn: boolean;
  t: TFunction;
  /** Online match: the host runs the game, the guest shows the host's state and sends its turns. */
  room?: Room;
  onExit: () => void;
  onMatchWon: () => void;
}

// Player 1 uses physical key positions, so W A S D also works on AZERTY (Z Q S D).
const P1_KEYS: Record<string, Direction> = { KeyW: 'UP', KeyS: 'DOWN', KeyA: 'LEFT', KeyD: 'RIGHT' };
const P2_KEYS: Record<string, Direction> = { ArrowUp: 'UP', ArrowDown: 'DOWN', ArrowLeft: 'LEFT', ArrowRight: 'RIGHT' };

// Online matches use one fixed board so both screens show the same game.
const ONLINE_GRID = { cols: 30, rows: 20 };

type Phase = 'ready' | 'playing' | 'roundOver';

export const VersusScreen = ({ difficulty, skin, theme, musicOn, t, room, onExit, onMatchWon }: Props) => {
  const { areaRef, preferredGrid, boardStyle } = useBoardFit(true);
  const [state, setState] = useState<VersusState>(() => newRound(room ? ONLINE_GRID : preferredGrid));
  const stateRef = useRef(state);
  const [phase, setPhase] = useState<Phase>('ready');
  const [peerGone, setPeerGone] = useState(false);
  const skins = [skin, rivalSkin(skin)];
  const isGuest = room?.role === 'guest';
  const myIndex = room ? (isGuest ? 1 : 0) : null;

  const update = useCallback((next: VersusState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  // Local match: until the first round starts, follow the window size.
  useEffect(() => {
    if (!room && phase === 'ready' && stateRef.current.wins[0] + stateRef.current.wins[1] === 0) update(newRound(preferredGrid));
  }, [preferredGrid.cols, preferredGrid.rows]); // eslint-disable-line react-hooks/exhaustive-deps

  const startRound = useCallback(() => {
    if (isGuest) {
      room!.send('start', {});
      return;
    }
    const s = stateRef.current;
    const matchOver = matchWinner(s) !== null;
    const grid = room ? ONLINE_GRID : matchOver || phase === 'ready' ? preferredGrid : s.grid;
    update(newRound(grid, matchOver ? [0, 0] : s.wins));
    setPhase('playing');
  }, [isGuest, room, phase, preferredGrid, update]);

  const startRoundRef = useRef(startRound);
  startRoundRef.current = startRound;
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  // Online: the one local player steers with any keys, swipes or the D-pad.
  const onlineTurn = useCallback((dir: Direction) => {
    if (!room || phaseRef.current !== 'playing') return;
    if (isGuest) room.send('input', { dir });
    else update(queueTurn(stateRef.current, 0, dir));
  }, [room, isGuest, update]);

  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    touchStart.current = null;
    if (Math.abs(dx) < 30 && Math.abs(dy) < 30) return;
    onlineTurn(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'RIGHT' : 'LEFT') : (dy > 0 ? 'DOWN' : 'UP'));
  };

  // Wire the room: the host listens for turns and start requests, the guest for game state.
  useEffect(() => {
    if (!room) return;
    room.setHandlers({
      onPeer: present => setPeerGone(!present),
      onMessage: (event, payload) => {
        if (isGuest && event === 'state') {
          update(payload.s as VersusState);
          setPhase(payload.phase as Phase);
        } else if (!isGuest && event === 'input') {
          update(queueTurn(stateRef.current, 1, payload.dir as Direction));
        } else if (!isGuest && event === 'start' && phaseRef.current !== 'playing') {
          startRoundRef.current();
        }
      },
    });
  }, [room, isGuest, update]);

  // Host: send every new state to the guest.
  useEffect(() => {
    if (room && !isGuest) room.send('state', { s: state, phase });
  }, [room, isGuest, state, phase]);

  // Game loop (local and host only).
  useEffect(() => {
    if (phase !== 'playing' || isGuest || peerGone) return;
    const id = window.setInterval(() => {
      const next = stepVersus(stateRef.current);
      update(next);
      if (next.result !== null) setPhase('roundOver');
    }, SPEED_CONFIG[difficulty]);
    return () => clearInterval(id);
  }, [phase, isGuest, peerGone, difficulty, update]);

  // Sounds and match wins follow state changes, so they work the same for host, guest and local play.
  const prev = useRef(state);
  useEffect(() => {
    const before = prev.current;
    prev.current = state;
    const apples = state.players[0].apples + state.players[1].apples;
    if (apples > before.players[0].apples + before.players[1].apples) sound.play('eat', apples);
    if (state.result !== null && before.result === null) {
      const winner = matchWinner(state);
      sound.play(winner !== null ? 'levelUp' : 'lifeLost');
      if (winner !== null && (myIndex === null || winner === myIndex)) onMatchWon();
    }
    if (state.result === null && before.result !== null) sound.play('start');
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (phase === 'playing' && musicOn && !peerGone) sound.startMusic();
    else sound.stopMusic();
  }, [phase, musicOn, peerGone]);
  useEffect(() => () => sound.stopMusic(), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      const p1 = P1_KEYS[e.code];
      const p2 = P2_KEYS[e.key];
      if ((p1 || p2) && phase === 'playing') {
        e.preventDefault();
        if (room) {
          onlineTurn((p1 ?? p2)!);
        } else {
          if (p1) update(queueTurn(stateRef.current, 0, p1));
          if (p2) update(queueTurn(stateRef.current, 1, p2));
        }
      } else if ((e.key === ' ' || e.key === 'Enter') && phase !== 'playing' && !peerGone) {
        e.preventDefault();
        startRound();
      } else if (e.key === 'Escape') {
        onExit();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, room, peerGone, startRound, update, onExit, onlineTurn]);

  const winner = matchWinner(state);
  const names = myIndex === null
    ? [t('player1'), t('player2')]
    : [0, 1].map(i => (i === myIndex ? t('you') : t('friend')));
  const resultText =
    state.result === 'draw' ? t('draw')
    : winner !== null ? (winner === myIndex ? t('youWinMatch') : `${names[winner]} ${t('winsMatch')}`)
    : state.result !== null ? (state.result === myIndex ? t('youWinRound') : `${names[state.result]} ${t('winsRound')}`)
    : '';
  const showOverlay = phase !== 'playing' || peerGone;

  return (
    <div className="h-[100dvh] flex flex-col items-center gap-2 p-2 overflow-hidden" style={{ background: theme.background }}>
      <div className="w-full flex items-center justify-between gap-2 px-2 shrink-0">
        <button onClick={onExit} className="px-3 py-2 rounded-xl text-sm font-bold bg-gray-700/70 text-white hover:bg-gray-600">{t('back')}</button>
        <div className="flex items-center gap-3 md:gap-6">
          {[0, 1].map(i => (
            <div key={i} className={`flex items-center gap-2 bg-gray-800/70 border rounded-xl px-3 py-1.5 ${i === myIndex ? 'border-cyan-400/60' : 'border-gray-700'}`}>
              <span className="w-3 h-3 rounded-sm" style={{ background: skins[i].head, boxShadow: `0 0 8px ${skins[i].glow}` }} />
              <span className="text-white font-semibold text-sm hidden sm:inline">{names[i]}</span>
              <span className="text-red-300 text-sm tabular-nums">🍎 {state.players[i].apples}</span>
              <span className="text-yellow-300 font-bold tabular-nums" aria-label={`${state.wins[i]}/${WINS_NEEDED}`}>
                {'★'.repeat(state.wins[i])}<span className="text-gray-600">{'★'.repeat(WINS_NEEDED - state.wins[i])}</span>
              </span>
            </div>
          ))}
        </div>
        <span className="text-xs text-gray-400 font-mono w-16 text-right hidden md:block">{room ? `#${room.code}` : ''}</span>
      </div>

      <div ref={areaRef} className="flex-1 min-h-[16rem] w-full flex items-center justify-center">
        <Board
          grid={state.grid}
          theme={theme}
          snakes={state.players.map((p, i) => ({ body: p.body, skin: skins[i], dead: !p.alive }))}
          food={state.food}
          obstacles={[]}
          style={boardStyle(state.grid)}
          onTouchStart={room ? onTouchStart : undefined}
          onTouchEnd={room ? onTouchEnd : undefined}
        >
          {showOverlay && (
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center-safe overflow-y-auto gap-3 z-30 p-4 text-center">
              {peerGone ? (
                <>
                  <h2 className="text-2xl md:text-3xl font-bold text-white">{t('opponentLeft')}</h2>
                  <button onClick={onExit} className="mt-1 px-8 py-3 rounded-xl text-lg font-bold text-white bg-gray-700 hover:bg-gray-600">{t('back')}</button>
                </>
              ) : (
                <>
                  <h2 className="text-2xl md:text-3xl font-bold text-white">{phase === 'ready' ? (room ? t('online') : t('versus')) : resultText}</h2>
                  <p className="text-gray-300 text-sm">{t('firstTo')}</p>
                  {room ? (
                    <p className="text-sm" style={{ color: skins[myIndex!].head }}>{t('you')}: {t('arrowsOrWasd')}</p>
                  ) : (
                    <div className="flex gap-4 text-sm">
                      <span style={{ color: skins[0].head }}>{t('p1Controls')}</span>
                      <span style={{ color: skins[1].head }}>{t('p2Controls')}</span>
                    </div>
                  )}
                  <button
                    onClick={startRound}
                    className="mt-1 px-8 py-3 rounded-xl text-lg font-bold text-white bg-gradient-to-r from-green-500 to-emerald-600 shadow-lg hover:scale-105 active:scale-95 transition-transform"
                  >
                    {phase === 'ready' ? t('startRound') : winner !== null ? t('newMatch') : t('nextRound')}
                  </button>
                  <p className="text-gray-500 text-xs">{t('pressEnterOrSpace')}</p>
                  {!room && <p className="text-gray-500 text-xs md:hidden">{t('keyboardNeeded')}</p>}
                </>
              )}
            </div>
          )}
        </Board>
      </div>

      {room && (
        <div className="md:hidden shrink-0 grid grid-cols-3 gap-1.5 pb-2">
          {([[null, 'UP', null], ['LEFT', null, 'RIGHT'], [null, 'DOWN', null]] as (Direction | null)[][]).flat().map((dir, i) =>
            dir ? (
              <button
                key={i}
                aria-label={dir}
                onPointerDown={e => { e.preventDefault(); onlineTurn(dir); }}
                className="w-14 h-14 text-xl bg-gray-700/80 active:bg-green-600 rounded-xl text-white border border-gray-600/50 touch-none select-none"
              >
                {{ UP: '▲', DOWN: '▼', LEFT: '◀', RIGHT: '▶' }[dir]}
              </button>
            ) : <span key={i} />,
          )}
        </div>
      )}
    </div>
  );
};
