import { useCallback, useEffect, useRef, useState } from 'react';
import { VersusView, type VersusPhase } from './VersusView';
import { useBoardFit } from '../hooks/useBoardFit';
import { newRound, queueTurn, stepVersus, matchWinner, type VersusState } from '../game/versus';
import { SPEED_CONFIG } from '../constants/game.constants';
import type { Skin, Theme } from '../features/look';
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

/** Two players on one keyboard. */
export const VersusScreen = ({ difficulty, skin, theme, musicOn, t, onExit, onMatchWon }: Props) => {
  const fit = useBoardFit(true);
  const [state, setState] = useState<VersusState>(() => newRound(fit.preferredGrid));
  const stateRef = useRef(state);
  const [phase, setPhase] = useState<VersusPhase>('ready');
  const [wrap, setWrap] = useState(false);
  const [powerUps, setPowerUps] = useState(false);
  const tickMs = SPEED_CONFIG[difficulty];

  const update = useCallback((next: VersusState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  // Until the first round starts, follow the window size.
  useEffect(() => {
    if (phase === 'ready' && stateRef.current.wins[0] + stateRef.current.wins[1] === 0) update(newRound(fit.preferredGrid));
  }, [fit.preferredGrid.cols, fit.preferredGrid.rows]); // eslint-disable-line react-hooks/exhaustive-deps

  const startRound = useCallback(() => {
    const s = stateRef.current;
    const matchOver = matchWinner(s) !== null;
    update(newRound(matchOver || phase === 'ready' ? fit.preferredGrid : s.grid, matchOver ? [0, 0] : s.wins, undefined, wrap, powerUps));
    setPhase('playing');
  }, [phase, fit.preferredGrid, update, wrap, powerUps]);

  useEffect(() => {
    if (phase !== 'playing') return;
    const id = window.setInterval(() => {
      const next = stepVersus(stateRef.current);
      update(next);
      if (next.result !== null) setPhase('roundOver');
    }, tickMs);
    return () => clearInterval(id);
  }, [phase, tickMs, update]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
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

  return (
    <VersusView
      state={state}
      ended={state.result !== null ? state : null}
      wins={state.wins}
      phase={phase}
      myIndex={null}
      fit={fit}
      tickMs={tickMs}
      skin={skin}
      theme={theme}
      musicOn={musicOn}
      t={t}
      wrap={wrap}
      onToggleWrap={() => setWrap(w => !w)}
      powerUps={powerUps}
      onTogglePowerUps={() => setPowerUps(p => !p)}
      onStart={startRound}
      onExit={onExit}
      onMatchWon={onMatchWon}
    />
  );
};
