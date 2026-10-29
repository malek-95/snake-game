import { useCallback, useEffect, useRef, useState } from 'react';
import { VersusView, type VersusPhase } from './VersusView';
import { useBoardFit } from '../hooks/useBoardFit';
import { newRound, matchWinner, randomSeed, type VersusState } from '../game/versus';
import { RollbackSession, inputDelayFor, type InputMessage } from '../game/rollback';
import { getOppositeDirection } from '../utils/game.utils';
import { SPEED_CONFIG, MAX_DIRECTION_QUEUE } from '../constants/game.constants';
import type { Room } from '../online/room';
import type { Skin, Theme } from '../features/look';
import type { Difficulty, Direction } from '../types/game.types';
import type { TFunction } from '../i18n/useTranslation';

interface Props {
  room: Room;
  difficulty: Difficulty;
  skin: Skin;
  theme: Theme;
  musicOn: boolean;
  t: TFunction;
  onExit: () => void;
  onMatchWon: () => void;
}

// Both screens must show the same board.
const ONLINE_GRID = { cols: 30, rows: 20 };
// Compare game fingerprints this often (in confirmed ticks).
const CHECK_EVERY = 30;

const KEYS: Record<string, Direction> = {
  ArrowUp: 'UP', ArrowDown: 'DOWN', ArrowLeft: 'LEFT', ArrowRight: 'RIGHT',
  KeyW: 'UP', KeyS: 'DOWN', KeyA: 'LEFT', KeyD: 'RIGHT',
};

const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};

/** Exposed for diagnostics (and the end-to-end check): how much correcting the netcode did. */
declare global {
  interface Window {
    __snakeNet?: { tick: number; confirmed: number; rollbacks: number; deepest: number; mismatches: number; pingMs: number | null };
  }
}

/**
 * Online match with rollback netcode: each player runs the game locally, my snake answers my keys
 * at once, and the other snake is corrected when their turns arrive. The host only picks when a
 * round starts and its random seed.
 */
export const OnlineVersus = ({ room, difficulty, skin, theme, musicOn, t, onExit, onMatchWon }: Props) => {
  const fit = useBoardFit(true);
  const me: 0 | 1 = room.role === 'host' ? 0 : 1;
  const isHost = me === 0;

  const [view, setView] = useState<VersusState>(() => newRound(ONLINE_GRID, [0, 0], 1));
  const [ended, setEnded] = useState<VersusState | null>(null);
  const [wins, setWins] = useState<[number, number]>([0, 0]);
  const [phase, setPhase] = useState<VersusPhase>('ready');
  const [peerGone, setPeerGone] = useState(false);
  const [pingMs, setPingMs] = useState<number | null>(null);
  const [tickMs, setTickMs] = useState(SPEED_CONFIG[difficulty]);
  // Wall passing: the host decides, the guest is told.
  const [wrap, setWrap] = useState(false);
  const wrapRef = useRef(wrap);
  wrapRef.current = wrap;

  const session = useRef<RollbackSession | null>(null);
  const round = useRef(0);
  const queue = useRef<Direction[]>([]);
  const planned = useRef<Direction | null>(null);
  const early = useRef(new Map<number, InputMessage[]>());
  const rtts = useRef<number[]>([]);
  const lastCheck = useRef(0);
  const theirChecks = useRef<{ t: number; h: number }[]>([]);
  const mismatches = useRef(0);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const endedRef = useRef(ended);
  endedRef.current = ended;
  const winsRef = useRef(wins);
  winsRef.current = wins;

  const beginRound = useCallback((r: number, seed: number, w: [number, number], ms: number, wallPass: boolean) => {
    const start = newRound(ONLINE_GRID, w, seed, wallPass);
    const s = new RollbackSession(start, me, 12, inputDelayFor(median(rtts.current), ms));
    for (const m of early.current.get(r) ?? []) s.receive(m);
    early.current.delete(r);
    session.current = s;
    round.current = r;
    queue.current = [];
    planned.current = null;
    lastCheck.current = 0;
    theirChecks.current = [];
    setTickMs(ms);
    setWrap(wallPass);
    setView(start);
    setEnded(null);
    setWins(w);
    setPhase('playing');
  }, [me]);

  // Host: pick the seed and start; begin half a round trip later, when the guest receives it.
  const hostStartRound = useCallback(() => {
    const finished = endedRef.current;
    const w: [number, number] = finished && matchWinner(finished) !== null ? [0, 0] : winsRef.current;
    const r = round.current + 1;
    const seed = randomSeed();
    const ms = SPEED_CONFIG[difficulty];
    const wallPass = wrapRef.current;
    room.send('round', { r, seed, wins: w, ms, wrap: wallPass });
    setTimeout(() => beginRound(r, seed, w, ms, wallPass), (median(rtts.current) ?? 0) / 2);
  }, [room, difficulty, beginRound]);
  const hostStartRef = useRef(hostStartRound);
  hostStartRef.current = hostStartRound;

  const toggleWrap = useCallback(() => {
    const next = !wrapRef.current;
    setWrap(next);
    room.send('settings', { wrap: next });
  }, [room]);

  const onStart = useCallback(() => {
    if (isHost) hostStartRound();
    else room.send('start', {});
  }, [isHost, hostStartRound, room]);

  // My turns wait in a short queue and are played one per tick, like in single player.
  const onTurn = useCallback((dir: Direction) => {
    const s = session.current;
    if (!s || phaseRef.current !== 'playing') return;
    const q = queue.current;
    // Compare with the last turn I asked for, even if input delay hasn't applied it yet.
    const last = q.length ? q[q.length - 1] : planned.current ?? s.current.players[me].dir;
    if (dir === last || dir === getOppositeDirection(last) || q.length >= MAX_DIRECTION_QUEUE) return;
    q.push(dir);
  }, [me]);

  // Messages from the other player.
  useEffect(() => {
    room.setHandlers({
      onPeer: present => {
        setPeerGone(!present);
        if (present && isHost) room.send('settings', { wrap: wrapRef.current }); // a guest who just joined sees the setting
      },
      onMessage: (event, p) => {
        const r = p.r as number;
        switch (event) {
          case 'ping':
            room.send('pong', p);
            break;
          case 'pong':
            rtts.current = [...rtts.current.slice(-6), performance.now() - (p.at as number)];
            setPingMs(median(rtts.current));
            break;
          case 'round':
            if (!isHost) beginRound(r, p.seed as number, p.wins as [number, number], p.ms as number, !!p.wrap);
            break;
          case 'settings':
            if (!isHost) setWrap(!!p.wrap);
            break;
          case 'start':
            if (isHost && phaseRef.current !== 'playing') hostStartRef.current();
            break;
          case 'in': {
            const msg: InputMessage = { t: p.t as number, ds: p.ds as (Direction | null)[] };
            if (r === round.current && session.current) session.current.receive(msg);
            else if (r > round.current) early.current.set(r, [...(early.current.get(r) ?? []), msg]);
            break;
          }
          case 'check':
            if (r === round.current) theirChecks.current.push({ t: p.t as number, h: p.h as number });
            break;
          case 'snapRequest':
            if (isHost && r === round.current) {
              const s = session.current?.stateAt(p.t as number);
              if (s) room.send('snap', { r, t: p.t as number, s });
            }
            break;
          case 'snap':
            if (!isHost && r === round.current) session.current?.applySnapshot(p.t as number, p.s as VersusState);
            break;
        }
      },
    });
  }, [room, isHost, beginRound]);

  // Measure the round trip continuously (shown in the corner, used to line up the two clocks).
  useEffect(() => {
    if (peerGone) return;
    const ping = () => room.send('ping', { at: performance.now() });
    ping();
    const id = window.setInterval(ping, 2000);
    return () => clearInterval(id);
  }, [room, peerGone]);

  // The game loop: one tick per frame, whatever the network does.
  useEffect(() => {
    if (phase !== 'playing' || peerGone) return;
    const id = window.setInterval(() => {
      const s = session.current;
      if (!s) return;
      const r = round.current;

      if (!s.roundOver) {
        const oneWayTicks = Math.round(((median(rtts.current) ?? 0) / 2) / tickMs);
        const turn = queue.current[0] ?? null;
        const msg = s.shouldWait(oneWayTicks) ? null : s.step(turn);
        if (msg) {
          if (turn) planned.current = queue.current.shift()!;
          room.send('in', { r, ...msg });
        } else {
          // Waiting: repeat my latest turns so the other player can catch up.
          const again = s.resend();
          if (again) room.send('in', { r, ...again });
        }
      }

      // Safety net: compare game fingerprints; if they ever differ, the guest takes the host's copy.
      const mark = Math.floor(s.confirmedTick / CHECK_EVERY) * CHECK_EVERY;
      if (mark > lastCheck.current) {
        lastCheck.current = mark;
        room.send('check', { r, t: mark, h: s.hashAt(mark) });
      }
      theirChecks.current = theirChecks.current.filter(c => {
        const mine = s.hashAt(c.t);
        if (mine === null) return true; // not confirmed here yet
        if (mine !== c.h) {
          mismatches.current++;
          if (!isHost) room.send('snapRequest', { r, t: c.t });
        }
        return false;
      });

      window.__snakeNet = {
        tick: s.tick, confirmed: s.confirmedTick, rollbacks: s.rollbacks, deepest: s.deepestRollback,
        mismatches: mismatches.current, pingMs: median(rtts.current),
      };

      if (s.roundOver) {
        setView(s.confirmed);
        setEnded(s.confirmed);
        setWins(s.confirmed.wins);
        setPhase('roundOver');
      } else {
        setView(s.current);
      }
    }, tickMs);
    return () => clearInterval(id);
  }, [phase, peerGone, tickMs, room, isHost]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      const dir = KEYS[e.code] ?? KEYS[e.key];
      if (dir && phaseRef.current === 'playing') {
        e.preventDefault();
        onTurn(dir);
      } else if ((e.key === ' ' || e.key === 'Enter') && phaseRef.current !== 'playing' && !peerGone) {
        e.preventDefault();
        onStart();
      } else if (e.key === 'Escape') {
        onExit();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onTurn, onStart, onExit, peerGone]);

  return (
    <VersusView
      state={view}
      ended={ended}
      wins={wins}
      phase={phase}
      myIndex={me}
      fit={fit}
      tickMs={tickMs}
      skin={skin}
      theme={theme}
      musicOn={musicOn}
      t={t}
      roomCode={room.code}
      pingMs={pingMs}
      peerGone={peerGone}
      wrap={wrap}
      onToggleWrap={isHost ? toggleWrap : undefined}
      onStart={onStart}
      onExit={onExit}
      onMatchWon={onMatchWon}
      onTurn={onTurn}
    />
  );
};
