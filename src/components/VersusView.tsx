import { useEffect, useRef } from 'react';
import { Board } from './Board';
import { matchWinner, WINS_NEEDED, POWER_ICONS, type VersusState } from '../game/versus';
import { sound } from '../audio/sound';
import { rivalSkin, type Skin, type Theme } from '../features/look';
import type { useBoardFit } from '../hooks/useBoardFit';
import type { Direction } from '../types/game.types';
import type { TFunction } from '../i18n/useTranslation';

export type VersusPhase = 'ready' | 'playing' | 'roundOver';

interface Props {
  /** What to draw (online: includes guesses about the other player). */
  state: VersusState;
  /** The confirmed final state once the round is over, else null. Drives results, stars and sounds. */
  ended: VersusState | null;
  /** Round wins so far (confirmed). */
  wins: [number, number];
  phase: VersusPhase;
  /** Online: which player is on this screen. Null for two players on one keyboard. */
  myIndex: 0 | 1 | null;
  fit: ReturnType<typeof useBoardFit>;
  tickMs: number;
  skin: Skin;
  theme: Theme;
  musicOn: boolean;
  t: TFunction;
  roomCode?: string;
  pingMs?: number | null;
  peerGone?: boolean;
  /** Snakes pass through walls this round. */
  wrap: boolean;
  /** Power-ups on this round. */
  powerUps: boolean;
  onTogglePowerUps?: () => void;
  /** Who may change it (local players, online host); others just see the setting. */
  onToggleWrap?: () => void;
  /** Online: once the match is won, both players must ask for a rematch. */
  rematch?: { me: boolean; them: boolean };
  /** Online: emoji reactions to send, and the bubbles currently shown. */
  reactions?: { send: (emoji: string) => void; bubbles: ReactionBubble[] };
  onStart: () => void;
  onExit: () => void;
  onMatchWon: () => void;
  /** Online: swipes and the on-screen D-pad steer my snake. */
  onTurn?: (dir: Direction) => void;
  /** Online: the other player's username, when they have one. */
  opponentName?: string;
  /** Online: ranked match info shown on the overlay. */
  note?: string;
}

const ARROWS: Record<Direction, string> = { UP: '▲', DOWN: '▼', LEFT: '◀', RIGHT: '▶' };

/** The only reactions players can send; anything else received is ignored. */
export const REACTIONS = ['👍', '😂', '🔥', '😱', '😎', 'GG'] as const;

export interface ReactionBubble {
  id: number;
  from: 0 | 1;
  emoji: string;
}

export const VersusView = ({
  state, ended, wins, phase, myIndex, fit, tickMs, skin, theme, musicOn, t,
  roomCode, pingMs, peerGone, wrap, onToggleWrap, powerUps, onTogglePowerUps, rematch, reactions, onStart, onExit, onMatchWon, onTurn,
  opponentName, note,
}: Props) => {
  const skins = [skin, rivalSkin(skin)];

  // Sounds: apples from the drawn game, round results only once confirmed.
  const prevApples = useRef(0);
  useEffect(() => {
    const apples = state.players[0].apples + state.players[1].apples;
    if (apples > prevApples.current) sound.play('eat', apples);
    prevApples.current = apples;
  }, [state]);

  const prevEnded = useRef<VersusState | null>(null);
  useEffect(() => {
    if (ended && !prevEnded.current) {
      const winner = matchWinner(ended);
      sound.play(winner !== null ? 'levelUp' : 'lifeLost');
      if (winner !== null && (myIndex === null || winner === myIndex)) onMatchWon();
    }
    if (!ended && prevEnded.current) sound.play('start');
    prevEnded.current = ended;
  }, [ended]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (phase === 'playing' && musicOn && !peerGone) sound.startMusic();
    else sound.stopMusic();
  }, [phase, musicOn, peerGone]);
  useEffect(() => () => sound.stopMusic(), []);

  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current || !onTurn) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    touchStart.current = null;
    if (Math.abs(dx) < 30 && Math.abs(dy) < 30) return;
    onTurn(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'RIGHT' : 'LEFT') : (dy > 0 ? 'DOWN' : 'UP'));
  };

  const winner = ended ? matchWinner(ended) : null;
  const names = myIndex === null
    ? [t('player1'), t('player2')]
    : [0, 1].map(i => (i === myIndex ? t('you') : opponentName ?? t('friend')));
  const result = ended?.result ?? null;
  const resultText =
    result === 'draw' ? t('draw')
    : winner !== null ? (winner === myIndex ? t('youWinMatch') : `${names[winner]} ${t('winsMatch')}`)
    : result !== null ? (result === myIndex ? t('youWinRound') : `${names[result]} ${t('winsRound')}`)
    : '';
  const showOverlay = phase !== 'playing' || peerGone;
  const pingColor = pingMs == null ? 'text-gray-500' : pingMs < 100 ? 'text-green-400' : pingMs < 200 ? 'text-yellow-400' : 'text-red-400';

  return (
    <div className="h-[100dvh] flex flex-col items-center gap-2 p-2 overflow-hidden" style={{ background: theme.background }}>
      <div className="w-full flex items-center justify-between gap-2 px-2 shrink-0">
        <button onClick={onExit} className="px-3 py-2 rounded-xl text-sm font-bold bg-gray-700/70 text-white hover:bg-gray-600">{t('back')}</button>
        <div className="flex items-center gap-3 md:gap-6">
          {[0, 1].map(i => (
            <div key={i} className={`relative flex items-center gap-2 bg-gray-800/70 border rounded-xl px-3 py-1.5 ${i === myIndex ? 'border-cyan-400/60' : 'border-gray-700'}`}>
              {reactions?.bubbles.filter(b => b.from === i).slice(-1).map(b => (
                <span key={b.id} className="absolute left-1/2 -translate-x-1/2 top-full mt-1 z-40 animate-bonus-pop pointer-events-none bg-gray-900/90 border border-gray-600 rounded-full px-2.5 py-1 text-xl font-black text-white shadow-lg">
                  {b.emoji}
                </span>
              ))}
              <span className="w-3 h-3 rounded-sm" style={{ background: skins[i].head, boxShadow: `0 0 8px ${skins[i].glow}` }} />
              <span className="text-white font-semibold text-sm hidden sm:inline">{names[i]}</span>
              {(state.players[i].ghost ?? 0) > 0 && <span title="ghost">👻</span>}
              {(state.players[i].frozen ?? 0) > 0 && <span title="frozen">❄️</span>}
              <span className="text-red-300 text-sm tabular-nums">🍎 {state.players[i].apples}</span>
              <span className="text-yellow-300 font-bold tabular-nums" aria-label={`${wins[i]}/${WINS_NEEDED}`}>
                {'★'.repeat(wins[i])}<span className="text-gray-600">{'★'.repeat(WINS_NEEDED - wins[i])}</span>
              </span>
            </div>
          ))}
        </div>
        <span className="text-xs font-mono w-20 text-right hidden md:flex flex-col leading-tight">
          {roomCode && <span className="text-gray-400">#{roomCode}</span>}
          {roomCode && <span className={pingColor} data-ping>{pingMs == null ? '…' : `${Math.round(pingMs)} ms`}</span>}
        </span>
      </div>

      <div ref={fit.areaRef} className="flex-1 min-h-[16rem] w-full flex items-center justify-center">
        <Board
          grid={state.grid}
          theme={theme}
          snakes={state.players.map((p, i) => ({
            body: p.body,
            skin: skins[i],
            dead: !!ended && !p.alive,
            effect: (p.ghost ?? 0) > 0 ? 'ghost' as const : (p.frozen ?? 0) > 0 ? 'frozen' as const : undefined,
          }))}
          food={state.food}
          items={state.powerUp ? [{ pos: state.powerUp.pos, emoji: POWER_ICONS[state.powerUp.kind] }] : undefined}
          obstacles={[]}
          tickMs={tickMs}
          accentBorder={wrap}
          wrapGlow={wrap && phase === 'playing'}
          style={fit.boardStyle(state.grid)}
          onTouchStart={onTurn ? onTouchStart : undefined}
          onTouchEnd={onTurn ? onTouchEnd : undefined}
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
                  <h2 className="text-2xl md:text-3xl font-bold text-white">{phase === 'ready' ? (roomCode ? t('online') : t('versus')) : resultText}</h2>
                  {note && <p className="text-yellow-300 font-semibold" role="status">{note}</p>}
                  <p className="text-gray-300 text-sm">{t('firstTo')}</p>
                  {/* Round options: whoever may change them gets buttons, the other player just sees them. */}
                  <div className="flex flex-wrap justify-center gap-2">
                    {[
                      { label: t('wrapAround'), on: wrap, toggle: onToggleWrap },
                      { label: t('powerUps'), on: powerUps, toggle: onTogglePowerUps },
                    ].map(o => o.toggle ? (
                      <button
                        key={o.label}
                        onClick={o.toggle}
                        aria-pressed={o.on}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${o.on ? 'bg-gradient-to-r from-purple-600 to-violet-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                      >
                        {o.label}: {o.on ? t('wrapAroundOn') : t('wrapAroundOff')}
                      </button>
                    ) : (
                      <span key={o.label} className="text-sm text-gray-300">{o.label}: {o.on ? t('wrapAroundOn') : t('wrapAroundOff')}</span>
                    ))}
                  </div>
                  {myIndex !== null ? (
                    <p className="text-sm" style={{ color: skins[myIndex].head }}>{t('you')}: {t('arrowsOrWasd')}</p>
                  ) : (
                    <div className="flex gap-4 text-sm">
                      <span style={{ color: skins[0].head }}>{t('p1Controls')}</span>
                      <span style={{ color: skins[1].head }}>{t('p2Controls')}</span>
                    </div>
                  )}
                  <button
                    onClick={onStart}
                    disabled={!!rematch && winner !== null && rematch.me}
                    className="mt-1 px-8 py-3 rounded-xl text-lg font-bold text-white bg-gradient-to-r from-green-500 to-emerald-600 shadow-lg hover:scale-105 active:scale-95 transition-transform disabled:opacity-50 disabled:hover:scale-100"
                  >
                    {phase === 'ready' ? t('startRound') : winner !== null ? (rematch ? t('rematch') : t('newMatch')) : t('nextRound')}
                  </button>
                  {rematch && winner !== null && (rematch.me || rematch.them) && (
                    <p className={`text-sm font-semibold ${rematch.them && !rematch.me ? 'text-amber-300 animate-pulse' : 'text-gray-300'}`} role="status">
                      {rematch.me && !rematch.them ? t('waitingFriend') : rematch.them && !rematch.me ? t('friendWantsRematch') : ''}
                    </p>
                  )}
                  <p className="text-gray-500 text-xs">{t('pressEnterOrSpace')}</p>
                  {myIndex === null && <p className="text-gray-500 text-xs md:hidden">{t('keyboardNeeded')}</p>}
                </>
              )}
            </div>
          )}
        </Board>
      </div>

      {reactions && !peerGone && (
        <div className="shrink-0 flex gap-1.5" role="group" aria-label={t('reactions')}>
          {REACTIONS.map((emoji, i) => (
            <button
              key={emoji}
              onClick={() => reactions.send(emoji)}
              title={`${emoji} (${i + 1})`}
              className="w-11 h-11 rounded-xl bg-gray-800/80 border border-gray-700 hover:bg-gray-700 active:scale-90 transition-transform text-xl font-black text-white"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {onTurn && (
        <div className="md:hidden shrink-0 grid grid-cols-3 gap-1.5 pb-2">
          {([[null, 'UP', null], ['LEFT', null, 'RIGHT'], [null, 'DOWN', null]] as (Direction | null)[][]).flat().map((dir, i) =>
            dir ? (
              <button
                key={i}
                aria-label={dir}
                onPointerDown={e => { e.preventDefault(); onTurn(dir); }}
                className="w-14 h-14 text-xl bg-gray-700/80 active:bg-green-600 rounded-xl text-white border border-gray-600/50 touch-none select-none"
              >
                {ARROWS[dir]}
              </button>
            ) : <span key={i} />,
          )}
        </div>
      )}
    </div>
  );
};
