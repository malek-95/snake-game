import { advance, hashState, type TickInputs, type VersusState } from './versus';
import type { Direction } from '../types/game.types';

/**
 * Rollback netcode for online rounds (2 to 4 players).
 *
 * Every player runs the same deterministic game. Each tick uses my real turn right away and a
 * guess for the other players' turns ("kept going straight"). When a real turn for an earlier
 * tick arrives and differs from the guess, we rewind to that tick and replay up to now.
 *
 * Input delay: my turns can be scheduled a few ticks ahead, on both screens. On a slow connection
 * they then reach the other player before they're needed, so nothing has to be guessed and the
 * other player's snake doesn't jump; my own turns just happen that many ticks after the key press.
 */

/**
 * My turns for ticks t - ds.length + 1 .. t. Recent turns are repeated in every message, so one
 * lost message is harmless. `now` is the tick I'm playing (t can be ahead of it with input delay).
 */
export interface InputMessage {
  t: number;
  ds: (Direction | null)[];
  now?: number;
}

const REPEAT_LAST = 6;

// Most ticks a turn is scheduled ahead: covers mobile data without feeling slow.
const MAX_INPUT_DELAY = 3;

/** Ticks of input delay for a connection: enough to cover the one-way delay, zero on a very fast link. */
export const inputDelayFor = (rttMs: number | null, tickMs: number) => {
  const oneWay = (rttMs ?? 0) / 2;
  return oneWay < 25 ? 0 : Math.min(MAX_INPUT_DELAY, Math.ceil(oneWay / tickMs));
};

export class RollbackSession {
  readonly me: number;
  /** The other players. */
  readonly others: number[];
  /** states[t] = the game at the start of tick t. */
  private states: VersusState[];
  private mine: (Direction | null)[] = [];
  /** theirs[p][t] = player p's turn on tick t (undefined = not received yet). */
  private theirs: (Direction | null | undefined)[][];
  /** Player p's turns are known for every tick up to and including knownUpTo[p]. */
  private knownUpTo: number[];
  private latestTheirs: number[];
  tick = 0;
  rollbacks = 0;
  deepestRollback = 0;

  constructor(initial: VersusState, me: number, private readonly maxAhead = 12, private readonly inputDelay = 0) {
    this.states = [initial];
    this.me = me;
    const n = initial.players.length;
    this.others = Array.from({ length: n }, (_, i) => i).filter(i => i !== me);
    this.theirs = Array.from({ length: n }, () => []);
    this.knownUpTo = Array(n).fill(-1);
    this.latestTheirs = Array(n).fill(-1);
    this.mine = Array(inputDelay).fill(null); // no turns from me during the first delayed ticks
  }

  /** With two players, messages need no sender. */
  private get them(): number {
    return this.others[0];
  }

  private get slowest(): number {
    return Math.min(...this.others.map(p => this.knownUpTo[p]));
  }

  /** What to draw now: confirmed up to a few ticks ago, predicted after that. */
  get current(): VersusState {
    return this.states[this.tick];
  }

  /** Latest tick all players agree on. */
  get confirmedTick(): number {
    return Math.min(this.tick, this.slowest + 1);
  }

  get confirmed(): VersusState {
    return this.states[this.confirmedTick];
  }

  /** The round is over once a confirmed state says so (a guessed crash can still be undone). */
  get roundOver(): boolean {
    return this.confirmed.result !== null;
  }

  stateAt(t: number): VersusState | undefined {
    return this.states[t];
  }

  myTurns(): readonly (Direction | null)[] {
    return this.mine;
  }

  /**
   * True when we're further ahead of the slowest other player than the network delay explains:
   * skip this frame so the clocks drift back together.
   */
  shouldWait(oneWayTicks: number): boolean {
    return this.tick - (Math.min(...this.others.map(p => this.latestTheirs[p])) + 1) > oneWayTicks + 1;
  }

  /**
   * Plays one tick with my turn (or null). Returns the message to send, or null when we have to
   * wait: too far ahead of the other player, or a crash that isn't confirmed yet.
   */
  step(myTurn: Direction | null): InputMessage | null {
    if (this.tick - this.slowest > this.maxAhead || this.current.result !== null) return null;
    const t = this.tick;
    this.mine[t + this.inputDelay] = myTurn;
    this.states[t + 1] = advance(this.states[t], this.inputsFor(t));
    this.tick = t + 1;
    return this.message();
  }

  /** My latest turns again, sent while waiting so a lost message can't leave both players stuck. */
  resend(): InputMessage | null {
    return this.mine.length ? this.message() : null;
  }

  private message(): InputMessage {
    const last = this.mine.length - 1;
    return { t: last, ds: this.mine.slice(Math.max(0, last + 1 - REPEAT_LAST)), now: this.tick };
  }

  /** Takes another player's turns; rewinds and replays if one of them differs from our guess. */
  receive(msg: InputMessage, from = this.them): void {
    const theirs = this.theirs[from];
    if (!theirs || from === this.me || this.knownUpTo[from] === Infinity) return; // unknown or dropped
    const first = msg.t - msg.ds.length + 1;
    let replayFrom = Infinity;
    msg.ds.forEach((dir, i) => {
      const t = first + i;
      if (t < 0 || theirs[t] !== undefined) return;
      theirs[t] = dir;
      // Ticks already played guessed "no turn"; a real turn there means those ticks were wrong.
      if (t < this.tick && dir !== null) replayFrom = Math.min(replayFrom, t);
    });
    this.latestTheirs[from] = Math.max(this.latestTheirs[from], (msg.now ?? msg.t + 1) - 1);
    while (theirs[this.knownUpTo[from] + 1] !== undefined) this.knownUpTo[from]++;
    if (replayFrom < this.tick) this.replay(replayFrom);
  }

  /** Player p's turns we know for sure, from tick 0 (the host sends them when p leaves). */
  knownTurns(p: number): (Direction | null)[] {
    return this.theirs[p].slice(0, this.knownUpTo[p] + 1) as (Direction | null)[];
  }

  /**
   * Player p left: their turns are exactly `turns`, then none ever again (their snake goes straight).
   * Every remaining player applies the same list from the host, so all games stay identical.
   */
  dropPlayer(p: number, turns: (Direction | null)[]): void {
    if (p === this.me || !this.theirs[p]) return;
    const old = this.theirs[p];
    let replayFrom = Infinity;
    for (let t = 0; t < Math.min(this.tick, Math.max(old.length, turns.length)); t++) {
      if ((old[t] ?? null) !== (turns[t] ?? null)) { replayFrom = t; break; }
    }
    this.theirs[p] = [...turns];
    this.knownUpTo[p] = this.latestTheirs[p] = Infinity;
    if (replayFrom < this.tick) this.replay(replayFrom);
  }

  /** Fingerprint of a confirmed tick, to compare with the other player. */
  hashAt(t: number): number | null {
    return t <= this.confirmedTick && this.states[t] ? hashState(this.states[t]) : null;
  }

  /** Safety net: replace tick t with the host's copy and replay from there. */
  applySnapshot(t: number, state: VersusState): void {
    if (t > this.tick) return;
    this.states[t] = state;
    this.replay(t);
  }

  private inputsFor(t: number): TickInputs {
    // Guess for anything not received yet: kept going straight.
    return this.theirs.map((theirs, p) => (p === this.me ? this.mine[t] : theirs[t]) ?? null);
  }

  private replay(from: number): void {
    this.rollbacks++;
    this.deepestRollback = Math.max(this.deepestRollback, this.tick - from);
    for (let t = from; t < this.tick; t++) this.states[t + 1] = advance(this.states[t], this.inputsFor(t));
  }
}
