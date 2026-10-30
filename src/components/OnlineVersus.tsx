import { useCallback, useEffect, useRef, useState } from 'react';
import { VersusView, REACTIONS, type VersusPhase, type ReactionBubble } from './VersusView';
import { useBoardFit } from '../hooks/useBoardFit';
import { newRound, matchWinner, randomSeed, type VersusState } from '../game/versus';
import { RollbackSession, inputDelayFor, type InputMessage } from '../game/rollback';
import { getOppositeDirection } from '../utils/game.utils';
import { SPEED_CONFIG, MAX_DIRECTION_QUEUE } from '../constants/game.constants';
import { PARTY_SIZE, type Room } from '../online/room';
import { reportRankedResult, type Profile, type RankedResult } from '../online/account';
import type { Skin, Theme } from '../features/look';
import type { Difficulty, Direction } from '../types/game.types';
import type { TFunction } from '../i18n/useTranslation';

interface Props {
  room: Room;
  /** My ranked account; the match counts for the ladder when both players have one. */
  profile: Profile | null;
  difficulty: Difficulty;
  skin: Skin;
  theme: Theme;
  musicOn: boolean;
  t: TFunction;
  onExit: () => void;
  onMatchWon: () => void;
}

// Every screen must show the same board (a bigger one for 3-4 snakes).
const ONLINE_GRID = { cols: 30, rows: 20 };
const PARTY_GRID = { cols: 36, rows: 24 };
const PARTY_MIN = 3;
// Party host: a player not heard from for this long is dropped (the cloud can take much longer to notice a closed tab).
const SILENT_MS = 3000;
const isHostKey = (k: unknown) => typeof k === 'string' && k.startsWith('host-');
const zeros = (n: number) => Array<number>(n).fill(0);
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
 * at once, and the other snakes are corrected when their turns arrive. The host only picks when a
 * round starts, its random seed and (in a party room) who plays: the lineup is fixed for a whole
 * match, and someone who joins during a match plays the next one.
 */
export const OnlineVersus = ({ room, profile, difficulty, skin, theme, musicOn, t, onExit, onMatchWon }: Props) => {
  const fit = useBoardFit(true);
  const isHost = room.role === 'host';
  const party = room.party;
  const grid = party ? PARTY_GRID : ONLINE_GRID;
  // Party: everyone in the room, and the players of the current match (presence keys, host first).
  const [members, setMembers] = useState<string[]>([]);
  const membersRef = useRef(members);
  membersRef.current = members;
  const [lineup, setLineup] = useState<string[] | null>(null);
  const lineupRef = useRef(lineup);
  lineupRef.current = lineup;
  const shown = lineup ?? members.slice(0, PARTY_SIZE);
  // My player number (-1: waiting for the next party match).
  const me = party ? shown.indexOf(room.key) : isHost ? 0 : 1;
  const meRef = useRef(me);
  meRef.current = me;
  const count = party ? Math.max(2, shown.length) : 2;
  // Every message says who sent it, so party players can tell each other apart.
  const send = useCallback((event: string, payload: Record<string, unknown>) => room.send(event, { ...payload, k: room.key }), [room]);

  const [view, setView] = useState<VersusState>(() => newRound(grid, [0, 0], 1));
  const [ended, setEnded] = useState<VersusState | null>(null);
  const [wins, setWins] = useState<number[]>([0, 0]);
  const [phase, setPhase] = useState<VersusPhase>('ready');
  const [peerGone, setPeerGone] = useState(false);
  const [pingMs, setPingMs] = useState<number | null>(null);
  const [tickMs, setTickMs] = useState(SPEED_CONFIG[difficulty]);
  // Wall passing: the host decides, the guest is told.
  const [wrap, setWrap] = useState(false);
  const wrapRef = useRef(wrap);
  wrapRef.current = wrap;
  const [powerUps, setPowerUps] = useState(false);
  const powerUpsRef = useRef(powerUps);
  powerUpsRef.current = powerUps;

  const session = useRef<RollbackSession | null>(null);
  const round = useRef(0);
  const queue = useRef<Direction[]>([]);
  // Rematch: everyone in the room has to ask for it (presence keys of those who did).
  const [votes, setVotes] = useState<Set<string>>(new Set());
  const votesRef = useRef(votes);
  votesRef.current = votes;
  // Emoji reaction bubbles, each shown for a moment.
  const [bubbles, setBubbles] = useState<ReactionBubble[]>([]);
  const bubbleId = useRef(0);
  const lastReaction = useRef(0);
  const planned = useRef<Direction | null>(null);
  const early = useRef(new Map<number, { msg: InputMessage; k: unknown }[]>());
  const rtts = useRef<number[]>([]);
  const lastCheck = useRef(0);
  const theirChecks = useRef<{ t: number; h: number }[]>([]);
  const mismatches = useRef(0);
  // Party host: when each player was last heard from, and who is out of the current round.
  const heard = useRef(new Map<string, number>());
  const dropped = useRef(new Set<number>());
  const roundStartedAt = useRef(0);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const endedRef = useRef(ended);
  endedRef.current = ended;
  const winsRef = useRef(wins);
  winsRef.current = wins;
  // Ranked: who the other player is (they tell us), and this match's id (room code + first round's seed).
  const [opponent, setOpponent] = useState<{ id: string; name: string; rating: number } | null>(null);
  const opponentRef = useRef(opponent);
  const matchId = useRef('');
  const reported = useRef('');
  const [rankedResult, setRankedResult] = useState<RankedResult | 'error' | null>(null);
  const profileRef = useRef(profile);
  profileRef.current = profile;
  // Party: usernames by presence key.
  const [names, setNames] = useState<Record<string, string>>({});
  const sayHello = useCallback(() => {
    const p = profileRef.current;
    if (p) send('hello', { id: p.id, name: p.username, rating: p.rating });
  }, [send]);

  // Sender of a message as a player number (2 players: always the other one).
  const playerOf = (k: unknown, ids = lineupRef.current) => (party ? (ids ?? []).indexOf(k as string) : undefined);

  const beginRound = useCallback((r: number, seed: number, w: number[], ms: number, wallPass: boolean, powers: boolean, ids?: string[], out: number[] = []) => {
    const start = newRound(grid, w, seed, wallPass, powers);
    // Party players who left earlier in the match sit out the round.
    for (const i of out) if (start.players[i]) start.players[i] = { ...start.players[i], alive: false };
    if (!party && w.every(x => x === 0)) {
      matchId.current = `${room.code}-${seed}`;
      setRankedResult(null);
    }
    const myIndex = party && ids ? ids.indexOf(room.key) : meRef.current;
    if (ids) {
      lineupRef.current = ids;
      setLineup(ids);
    }
    votesRef.current = new Set();
    setVotes(new Set());
    if (myIndex < 0) {
      // Not in this match: wait for the next one.
      early.current.delete(r);
      round.current = r;
      return;
    }
    const s = new RollbackSession(start, myIndex, 12, inputDelayFor(median(rtts.current), ms));
    for (const i of out) s.dropPlayer(i, []); // no turns will come from them
    dropped.current = new Set(out);
    roundStartedAt.current = performance.now();
    for (const m of early.current.get(r) ?? []) {
      const from = playerOf(m.k, ids);
      if (from === undefined || from >= 0) s.receive(m.msg, from);
    }
    early.current.delete(r);
    session.current = s;
    round.current = r;
    queue.current = [];
    planned.current = null;
    lastCheck.current = 0;
    theirChecks.current = [];
    setTickMs(ms);
    setWrap(wallPass);
    setPowerUps(powers);
    setView(start);
    setEnded(null);
    setWins(w);
    setPhase('playing');
  }, [room.code, room.key, party, grid]); // eslint-disable-line react-hooks/exhaustive-deps

  const showBubble = useCallback((from: number, emoji: string) => {
    const id = ++bubbleId.current;
    setBubbles(b => [...b.slice(-4), { id, from, emoji }]);
    setTimeout(() => setBubbles(b => b.filter(x => x.id !== id)), 2200);
  }, []);

  const sendReaction = useCallback((emoji: string) => {
    const now = performance.now();
    if (now - lastReaction.current < 600) return; // no spamming
    lastReaction.current = now;
    showBubble(meRef.current, emoji);
    send('react', { e: emoji });
  }, [send, showBubble]);

  // Host: pick the seed (and the party lineup) and start; begin half a round trip later, when the others receive it.
  const hostStartRound = useCallback(() => {
    const finished = endedRef.current;
    const newMatch = (finished && matchWinner(finished) !== null) || (party && !lineupRef.current);
    const present = membersRef.current;
    const ids = party ? (newMatch ? present.slice(0, PARTY_SIZE) : lineupRef.current!) : undefined;
    if (ids && (newMatch ? ids.length < PARTY_MIN : ids.filter(k => present.includes(k)).length < 2)) return;
    const out = ids ? ids.flatMap((k, i) => (present.includes(k) ? [] : [i])) : [];
    const w = newMatch ? zeros(ids?.length ?? 2) : winsRef.current;
    const r = round.current + 1;
    const seed = randomSeed();
    const ms = SPEED_CONFIG[difficulty];
    const wallPass = wrapRef.current;
    const powers = powerUpsRef.current;
    send('round', { r, seed, wins: w, ms, wrap: wallPass, powerUps: powers, ids, out });
    setTimeout(() => beginRound(r, seed, w, ms, wallPass, powers, ids, out), (median(rtts.current) ?? 0) / 2);
  }, [send, difficulty, beginRound, party]);
  const hostStartRef = useRef(hostStartRound);
  hostStartRef.current = hostStartRound;

  const toggleWrap = useCallback(() => {
    const next = !wrapRef.current;
    setWrap(next);
    send('settings', { wrap: next, powerUps: powerUpsRef.current });
  }, [send]);

  const togglePowerUps = useCallback(() => {
    const next = !powerUpsRef.current;
    setPowerUps(next);
    send('settings', { wrap: wrapRef.current, powerUps: next });
  }, [send]);

  // Host: a rematch starts once everyone in the room asked for it.
  const addVote = useCallback((k: string) => {
    const next = new Set(votesRef.current).add(k);
    votesRef.current = next;
    setVotes(next);
    if (isHost && membersRef.current.every(m => next.has(m))) hostStartRef.current();
  }, [isHost]);

  const onStart = useCallback(() => {
    const finished = endedRef.current;
    // Match over (or waiting to join a party): ask for a rematch.
    if ((finished && matchWinner(finished) !== null) || meRef.current < 0) {
      send('rematch', {});
      addVote(room.key);
      return;
    }
    if (isHost) hostStartRound();
    else send('start', {});
  }, [isHost, hostStartRound, send, addVote, room.key]);

  // My turns wait in a short queue and are played one per tick, like in single player.
  const onTurn = useCallback((dir: Direction) => {
    const s = session.current;
    if (!s || phaseRef.current !== 'playing') return;
    const q = queue.current;
    // Compare with the last turn I asked for, even if input delay hasn't applied it yet.
    const last = q.length ? q[q.length - 1] : planned.current ?? s.current.players[s.me].dir;
    if (dir === last || dir === getOppositeDirection(last) || q.length >= MAX_DIRECTION_QUEUE) return;
    q.push(dir);
  }, []);

  // Party: who is in the room. The host drops a player who leaves in the middle of a round
  // (their snake goes straight on) and leaves them out of the next rounds of the match.
  // Host: drop player i from the running round, once, on every screen.
  const dropIndex = useCallback((i: number) => {
    const s = session.current;
    if (!s || s.roundOver || i === s.me || dropped.current.has(i)) return;
    dropped.current.add(i);
    const ds = s.knownTurns(i);
    s.dropPlayer(i, ds);
    send('drop', { r: round.current, i, ds });
  }, [send]);

  const onMembers = useCallback((keys: string[]) => {
    const before = membersRef.current;
    membersRef.current = keys;
    setMembers(keys);
    setPeerGone(isHost ? keys.length < 2 : !keys.some(isHostKey));
    if (keys.some(k => !before.includes(k))) {
      sayHello();
      if (isHost) send('settings', { wrap: wrapRef.current, powerUps: powerUpsRef.current }); // newcomers see the settings
    }
    if (!isHost) return;
    lineupRef.current?.forEach((k, i) => { if (before.includes(k) && !keys.includes(k)) dropIndex(i); });
    // A rematch may now have everyone's vote.
    if (votesRef.current.size && keys.every(k => votesRef.current.has(k))) hostStartRef.current();
  }, [isHost, send, sayHello, dropIndex]);

  // Messages from the other players.
  useEffect(() => {
    room.setHandlers({
      ...(party ? { onMembers } : {
        onPeer: (present: boolean) => {
          setPeerGone(!present);
          if (present) sayHello();
          if (present && isHost) send('settings', { wrap: wrapRef.current, powerUps: powerUpsRef.current }); // a guest who just joined sees the setting
        },
        onMembers: (keys: string[]) => { membersRef.current = keys; setMembers(keys); },
      }),
      onMessage: (event, p) => {
        if (typeof p.k === 'string') heard.current.set(p.k, performance.now());
        const r = p.r as number;
        switch (event) {
          case 'ping':
            room.send('pong', p);
            break;
          case 'pong':
            // In a party everyone answers everyone's pings: only count answers to mine.
            if (p.k !== undefined && p.k !== room.key) break;
            rtts.current = [...rtts.current.slice(-6), performance.now() - (p.at as number)];
            setPingMs(median(rtts.current));
            break;
          case 'round':
            if (!isHost) beginRound(r, p.seed as number, p.wins as number[], p.ms as number, !!p.wrap, !!p.powerUps,
              party ? p.ids as string[] : undefined, party ? p.out as number[] : undefined);
            break;
          case 'drop':
            if (!isHost && r === round.current) session.current?.dropPlayer(p.i as number, p.ds as (Direction | null)[]);
            break;
          case 'settings':
            if (!isHost) {
              setWrap(!!p.wrap);
              setPowerUps(!!p.powerUps);
            }
            break;
          case 'hello':
            if (party) {
              if (typeof p.name === 'string' && typeof p.k === 'string') setNames(n => ({ ...n, [p.k as string]: (p.name as string).slice(0, 16) }));
              break;
            }
            // Same account in two tabs plays unranked.
            if (typeof p.id === 'string' && p.id !== profileRef.current?.id && typeof p.name === 'string' && typeof p.rating === 'number') {
              const first = !opponentRef.current;
              const opp = { id: p.id, name: p.name.slice(0, 16), rating: p.rating };
              opponentRef.current = opp;
              setOpponent(opp);
              if (first) sayHello(); // they may have joined after my hello
            }
            break;
          case 'react': {
            const from = playerOf(p.k) ?? (meRef.current === 0 ? 1 : 0);
            if (from >= 0 && REACTIONS.includes(p.e as (typeof REACTIONS)[number])) showBubble(from, p.e as string);
            break;
          }
          case 'rematch':
            // (an older 2-player version doesn't say who it is)
            addVote(typeof p.k === 'string' ? p.k : membersRef.current.find(k => k !== room.key) ?? '');
            break;
          case 'start':
            if (isHost && phaseRef.current !== 'playing') hostStartRef.current();
            break;
          case 'in': {
            const msg: InputMessage = { t: p.t as number, ds: p.ds as (Direction | null)[] };
            const from = playerOf(p.k);
            if (r === round.current && session.current) {
              if (from === undefined || from >= 0) session.current.receive(msg, from);
            } else if (r > round.current) early.current.set(r, [...(early.current.get(r) ?? []), { msg, k: p.k }]);
            break;
          }
          case 'check':
            // Everyone compares with the host's copy (the host also counts guests' mismatches).
            if (r === round.current && (isHost || !party || isHostKey(p.k))) theirChecks.current.push({ t: p.t as number, h: p.h as number });
            break;
          case 'snapRequest':
            if (isHost && r === round.current) {
              const s = session.current?.stateAt(p.t as number);
              if (s) send('snap', { r, t: p.t as number, s });
            }
            break;
          case 'snap':
            if (!isHost && r === round.current) session.current?.applySnapshot(p.t as number, p.s as VersusState);
            break;
        }
      },
    });
  }, [room, isHost, party, beginRound, sayHello, send, onMembers, addVote, showBubble]); // eslint-disable-line react-hooks/exhaustive-deps

  // Measure the round trip continuously (shown in the corner, used to line up the two clocks).
  useEffect(() => {
    if (peerGone) return;
    const ping = () => send('ping', { at: performance.now() });
    ping();
    const id = window.setInterval(ping, 2000);
    return () => clearInterval(id);
  }, [send, peerGone]);

  // The game loop: one tick per frame, whatever the network does.
  useEffect(() => {
    if (phase !== 'playing' || peerGone) return;
    const id = window.setInterval(() => {
      const s = session.current;
      if (!s) return;
      const r = round.current;

      if (isHost && party && !s.roundOver) {
        const now = performance.now();
        lineupRef.current?.forEach((k, i) => {
          if (now - Math.max(heard.current.get(k) ?? 0, roundStartedAt.current) > SILENT_MS) dropIndex(i);
        });
      }
      if (!s.roundOver) {
        const oneWayTicks = Math.round(((median(rtts.current) ?? 0) / 2) / tickMs);
        const turn = queue.current[0] ?? null;
        const msg = s.shouldWait(oneWayTicks) ? null : s.step(turn);
        if (msg) {
          if (turn) planned.current = queue.current.shift()!;
          send('in', { r, ...msg });
        } else {
          // Waiting: repeat my latest turns so the others can catch up.
          const again = s.resend();
          if (again) send('in', { r, ...again });
        }
      }

      // Safety net: compare game fingerprints; if they ever differ, the guest takes the host's copy.
      const mark = Math.floor(s.confirmedTick / CHECK_EVERY) * CHECK_EVERY;
      if (mark > lastCheck.current) {
        lastCheck.current = mark;
        send('check', { r, t: mark, h: s.hashAt(mark) });
      }
      theirChecks.current = theirChecks.current.filter(c => {
        const mine = s.hashAt(c.t);
        if (mine === null) return true; // not confirmed here yet
        if (mine !== c.h) {
          mismatches.current++;
          if (!isHost) send('snapRequest', { r, t: c.t });
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
  }, [phase, peerGone, tickMs, send, isHost, party, dropIndex]);

  // Ranked: once the match is won, both players report the winner; the server counts it if they agree.
  useEffect(() => {
    const winner = ended ? matchWinner(ended) : null;
    if (party || winner === null || !profile || !opponent || !matchId.current || reported.current === matchId.current) return;
    reported.current = matchId.current;
    setRankedResult({ status: 'waiting' });
    reportRankedResult(matchId.current, opponent.id, winner === me ? profile.id : opponent.id)
      .then(r => {
        setRankedResult(r);
        if (r.status === 'done') setOpponent(o => o && { ...o, rating: o.rating - r.delta });
      })
      .catch(() => setRankedResult('error'));
  }, [ended, profile, opponent, me, party]);

  // Party: the board shows everyone who's in before the first round.
  useEffect(() => {
    if (session.current) return;
    setView(newRound(grid, zeros(count), 1));
    setWins(zeros(count));
  }, [count, grid]);

  const matchOver = !!ended && matchWinner(ended) !== null;
  const needMore = party && (!lineup || matchOver) && members.length < PARTY_MIN;
  const ranked = !party && !!profile && !!opponent;
  const note = party ? (phase === 'playing' ? undefined
    : me < 0 ? t('nextMatchWait')
    : `#${room.code} · ${t('partyPlayers')}: ${members.length}/${PARTY_SIZE}${needMore ? ` · ${t('partyNeedMore')}` : ''}`)
    : !ranked ? undefined
    : rankedResult === null ? `${t('ranked')} · ${opponent.name} (${opponent.rating})`
    : rankedResult === 'error' ? t('serverError')
    : rankedResult.status === 'waiting' ? t('rankedWaiting')
    : rankedResult.status === 'mismatch' ? t('rankedMismatch')
    : `${t('rating')}: ${rankedResult.rating} (${rankedResult.delta >= 0 ? '+' : ''}${rankedResult.delta})`;

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
      } else if (/^[1-6]$/.test(e.key) && !peerGone) {
        sendReaction(REACTIONS[Number(e.key) - 1]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onTurn, onStart, onExit, peerGone, sendReaction]);

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
      powerUps={powerUps}
      onTogglePowerUps={isHost ? togglePowerUps : undefined}
      rematch={{ me: votes.has(room.key), them: members.length > 1 && members.every(k => k === room.key || votes.has(k)) }}
      startDisabled={needMore}
      reactions={{ send: sendReaction, bubbles }}
      onStart={onStart}
      onExit={onExit}
      onMatchWon={onMatchWon}
      onTurn={onTurn}
      playerNames={party ? shown.map(k => names[k]) : [0, 1].map(i => (i === me ? undefined : opponent?.name))}
      note={note}
    />
  );
};
