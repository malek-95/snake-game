import { useCallback, useEffect, useRef, useState } from 'react';
import { Board } from './Board';
import { useBoardFit } from '../hooks/useBoardFit';
import { newRound, queueTurn, stepVersus, matchWinner, WINS_NEEDED, type VersusState } from '../game/versus';
import { SPEED_CONFIG } from '../constants/game.constants';
import { sound } from '../audio/sound';
import { rivalSkin, type Skin, type Theme } from '../features/look';
import type { Difficulty, Direction } from '../types/game.types';
import type { TFunction } from '../i18n/useTranslation';

interface Props {
  difficulty: Difficulty;
  skin: Skin;
  theme: Theme;
  musicOn: boolean;
  t: TFunction;
  onExit: () => void;
  onMatchWon: () => void;
}

// Player 1 uses physical key positions, so W A S D also works on AZERTY (Z Q S D).
const P1_KEYS: Record<string, Direction> = { KeyW: 'UP', KeyS: 'DOWN', KeyA: 'LEFT', KeyD: 'RIGHT' };
const P2_KEYS: Record<string, Direction> = { ArrowUp: 'UP', ArrowDown: 'DOWN', ArrowLeft: 'LEFT', ArrowRight: 'RIGHT' };

type Phase = 'ready' | 'playing' | 'roundOver';

export const VersusScreen = ({ difficulty, skin, theme, musicOn, t, onExit, onMatchWon }: Props) => {
  const { areaRef, preferredGrid, boardStyle } = useBoardFit(true);
  const [state, setState] = useState<VersusState>(() => newRound(preferredGrid));
  const stateRef = useRef(state);
  const [phase, setPhase] = useState<Phase>('ready');
  const skins = [skin, rivalSkin(skin)];

  const update = useCallback((next: VersusState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  // Until the first round starts, follow the window size.
  useEffect(() => {
    if (phase === 'ready' && stateRef.current.wins[0] + stateRef.current.wins[1] === 0) update(newRound(preferredGrid));
  }, [preferredGrid.cols, preferredGrid.rows]); // eslint-disable-line react-hooks/exhaustive-deps

  const startRound = useCallback(() => {
    const s = stateRef.current;
    const matchOver = matchWinner(s) !== null;
    // New match: take the current window size; next round: keep the grid.
    update(newRound(matchOver || phase === 'ready' ? preferredGrid : s.grid, matchOver ? [0, 0] : s.wins));
    setPhase('playing');
    sound.play('start');
  }, [phase, preferredGrid, update]);

  // Game loop.
  useEffect(() => {
    if (phase !== 'playing') return;
    const id = window.setInterval(() => {
      const prev = stateRef.current;
      const next = stepVersus(prev);
      const apples = next.players[0].apples + next.players[1].apples;
      if (apples > prev.players[0].apples + prev.players[1].apples) sound.play('eat', apples);
      update(next);
      if (next.result !== null) {
        setPhase('roundOver');
        const winner = matchWinner(next);
        sound.play(winner !== null ? 'levelUp' : 'lifeLost');
        if (winner !== null) onMatchWon();
      }
    }, SPEED_CONFIG[difficulty]);
    return () => clearInterval(id);
  }, [phase, difficulty, update, onMatchWon]);

  useEffect(() => {
    if (phase === 'playing' && musicOn) sound.startMusic();
    else sound.stopMusic();
  }, [phase, musicOn]);
  useEffect(() => () => sound.stopMusic(), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const p1 = P1_KEYS[e.code];
      const p2 = P2_KEYS[e.key];
      if ((p1 || p2) && phase === 'playing') {
        e.preventDefault();
        if (p1) update(queueTurn(stateRef.current, 0, p1));
        if (p2) update(queueTurn(stateRef.current, 1, p2));
      } else if ((e.key === ' ' || e.key === 'Enter') && phase !== 'playing') {
        e.preventDefault();
        startRound();
      } else if (e.key === 'Escape') {
        onExit();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, startRound, update, onExit]);

  const winner = matchWinner(state);
  const names = [t('player1'), t('player2')];
  const resultText =
    state.result === 'draw' ? t('draw')
    : winner !== null ? `${names[winner]} ${t('winsMatch')}`
    : state.result !== null ? `${names[state.result]} ${t('winsRound')}`
    : '';

  return (
    <div className="h-[100dvh] flex flex-col items-center gap-2 p-2 overflow-hidden" style={{ background: theme.background }}>
      <div className="w-full flex items-center justify-between gap-2 px-2 shrink-0">
        <button onClick={onExit} className="px-3 py-2 rounded-xl text-sm font-bold bg-gray-700/70 text-white hover:bg-gray-600">{t('back')}</button>
        <div className="flex items-center gap-3 md:gap-6">
          {[0, 1].map(i => (
            <div key={i} className="flex items-center gap-2 bg-gray-800/70 border border-gray-700 rounded-xl px-3 py-1.5">
              <span className="w-3 h-3 rounded-sm" style={{ background: skins[i].head, boxShadow: `0 0 8px ${skins[i].glow}` }} />
              <span className="text-white font-semibold text-sm hidden sm:inline">{names[i]}</span>
              <span className="text-red-300 text-sm tabular-nums">🍎 {state.players[i].apples}</span>
              <span className="text-yellow-300 font-bold tabular-nums" aria-label={`${state.wins[i]}/${WINS_NEEDED}`}>
                {'★'.repeat(state.wins[i])}<span className="text-gray-600">{'★'.repeat(WINS_NEEDED - state.wins[i])}</span>
              </span>
            </div>
          ))}
        </div>
        <span className="w-16 hidden md:block" />
      </div>

      <div ref={areaRef} className="flex-1 min-h-[16rem] w-full flex items-center justify-center">
        <Board
          grid={state.grid}
          theme={theme}
          snakes={state.players.map((p, i) => ({ body: p.body, skin: skins[i], dead: !p.alive }))}
          food={state.food}
          obstacles={[]}
          style={boardStyle(state.grid)}
        >
          {phase !== 'playing' && (
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center-safe overflow-y-auto gap-3 z-30 p-4 text-center">
              <h2 className="text-2xl md:text-3xl font-bold text-white">{phase === 'ready' ? t('versus') : resultText}</h2>
              <p className="text-gray-300 text-sm">{t('firstTo')}</p>
              <div className="flex gap-4 text-sm">
                <span style={{ color: skins[0].head }}>{t('p1Controls')}</span>
                <span style={{ color: skins[1].head }}>{t('p2Controls')}</span>
              </div>
              <button
                onClick={startRound}
                className="mt-1 px-8 py-3 rounded-xl text-lg font-bold text-white bg-gradient-to-r from-green-500 to-emerald-600 shadow-lg hover:scale-105 active:scale-95 transition-transform"
              >
                {phase === 'ready' ? t('startRound') : winner !== null ? t('newMatch') : t('nextRound')}
              </button>
              <p className="text-gray-500 text-xs">{t('pressEnterOrSpace')}</p>
              <p className="text-gray-500 text-xs md:hidden">{t('keyboardNeeded')}</p>
            </div>
          )}
        </Board>
      </div>
    </div>
  );
};
