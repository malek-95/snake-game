import { advance, hashState, type TickInputs, type VersusState } from './versus';
import type { Direction } from '../types/game.types';

/**
 * Rollback netcode for online 2-player rounds.
 *
 * Both players run the same deterministic game. Each tick uses my real turn right away and a
 * guess for the other player's turn ("kept going straight"). When their real turn for an earlier
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
  readonly me: 0 | 1;
  readonly them: 0 | 1;
  /** states[t] = the game at the start of tick t. */
  private states: VersusState[];
  private mine: (Direction | null)[] = [];
  private theirs: (Direction | null | undefined)[] = [];
  /** Their turns are known for every tick up to and including this one. */
  private knownUpTo = -1;
  private latestTheirs = -1;
  tick = 0;
  rollbacks = 0;
  deepestRollback = 0;

  constructor(initial: VersusState, me: 0 | 1, private readonly maxAhead = 12, private readonly inputDelay = 0) {
    this.states = [initial];
    this.me = me;
    this.them = me === 0 ? 1 : 0;
    this.mine = Array(inputDelay).fill(null); // no turns from me during the first delayed ticks
  }

  /** What to draw now: confirmed up to a few ticks ago, predicted after that. */
  get current(): VersusState {
    return this.states[this.tick];
  }

  /** Latest tick both players agree on. */
  get confirmedTick(): number {
    return Math.min(this.tick, this.knownUpTo + 1);
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
   * True when we're further ahead of the other player than the network delay explains:
   * skip this frame so the two clocks drift back together.
   */
  shouldWait(oneWayTicks: number): boolean {
    return this.tick - (this.latestTheirs + 1) > oneWayTicks + 1;
  }

  /**
   * Plays one tick with my turn (or null). Returns the message to send, or null when we have to
   * wait: too far ahead of the other player, or a crash that isn't confirmed yet.
   */
  step(myTurn: Direction | null): InputMessage | null {
    if (this.tick - this.knownUpTo > this.maxAhead || this.current.result !== null) return null;
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

  /** Takes the other player's turns; rewinds and replays if one of them differs from our guess. */
  receive(msg: InputMessage): void {
    const first = msg.t - msg.ds.length + 1;
    let replayFrom = Infinity;
    msg.ds.forEach((dir, i) => {
      const t = first + i;
      if (t < 0 || this.theirs[t] !== undefined) return;
      this.theirs[t] = dir;
      // Ticks already played guessed "no turn"; a real turn there means those ticks were wrong.
      if (t < this.tick && dir !== null) replayFrom = Math.min(replayFrom, t);
    });
    this.latestTheirs = Math.max(this.latestTheirs, (msg.now ?? msg.t + 1) - 1);
    while (this.theirs[this.knownUpTo + 1] !== undefined) this.knownUpTo++;
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
    const inputs: TickInputs = [null, null];
    inputs[this.me] = this.mine[t] ?? null;
    inputs[this.them] = this.theirs[t] ?? null; // guess: kept going straight
    return inputs;
  }

  private replay(from: number): void {
    this.rollbacks++;
    this.deepestRollback = Math.max(this.deepestRollback, this.tick - from);
    for (let t = from; t < this.tick; t++) this.states[t + 1] = advance(this.states[t], this.inputsFor(t));
  }
}
