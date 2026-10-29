import { advance, hashState, type TickInputs, type VersusState } from './versus';
import type { Direction } from '../types/game.types';

/**
 * Rollback netcode for online 2-player rounds.
 *
 * Both players run the same deterministic game. Each tick uses my real turn right away and a
 * guess for the other player's turn ("kept going straight"). When their real turn for an earlier
 * tick arrives and differs from the guess, we rewind to that tick and replay up to now.
 * My own snake therefore reacts instantly and moves at a steady pace, whatever the network does.
 */

/** My turns for ticks t - ds.length + 1 .. t. Recent turns are repeated in every message, so one lost message is harmless. */
export interface InputMessage {
  t: number;
  ds: (Direction | null)[];
}

const REPEAT_LAST = 6;

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

  constructor(initial: VersusState, me: 0 | 1, private readonly maxAhead = 12) {
    this.states = [initial];
    this.me = me;
    this.them = me === 0 ? 1 : 0;
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
    this.mine[t] = myTurn;
    this.states[t + 1] = advance(this.states[t], this.inputsFor(t));
    this.tick = t + 1;
    return { t, ds: this.mine.slice(Math.max(0, t + 1 - REPEAT_LAST), t + 1) };
  }

  /** My latest turns again, sent while waiting so a lost message can't leave both players stuck. */
  resend(): InputMessage | null {
    const t = this.tick - 1;
    return t < 0 ? null : { t, ds: this.mine.slice(Math.max(0, t + 1 - REPEAT_LAST), t + 1) };
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
    this.latestTheirs = Math.max(this.latestTheirs, msg.t);
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
