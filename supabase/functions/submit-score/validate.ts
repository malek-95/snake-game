// World leaderboard score rules. Plain TypeScript with no imports, so it runs both in the
// Edge Function (Deno) and in the app's tests (which also check it matches the game's settings).

export const MODES = ['classic', 'levels', 'timeAttack', 'survival', 'zen', 'golden', 'custom'] as const;
export const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
type Mode = (typeof MODES)[number];
type Difficulty = (typeof DIFFICULTIES)[number];

// Must match SCORE_CONFIG / SPEED_CONFIG / BONUS_CONFIG / GOLDEN_CONFIG / MIN_TICK_MS in src/constants.
export const POINTS_PER_APPLE: Record<Difficulty, number> = { easy: 5, medium: 10, hard: 20 };
export const TICK_MS: Record<Difficulty, number> = { easy: 160, medium: 100, hard: 60 };
export const MULTIPLIER_EVERY = 10;
export const GOLDEN_FACTOR = 5;
export const FASTEST_TICK_MS = 40;

export interface ScoreRow {
  name: string;
  mode: Mode;
  difficulty: Difficulty;
  score: number;
  apples: number;
  level: number | null;
}

export type Check = { ok: true; row: ScoreRow } | { ok: false; error: string };

/**
 * Highest score a real game can reach: the bonus multiplier is apples/10 + 1 at most
 * (it only ever drops, after losing a life), and golden apples are worth 5x.
 */
export const maxScore = (difficulty: Difficulty, apples: number, golden: number) => {
  const base = POINTS_PER_APPLE[difficulty];
  let total = 0;
  for (let n = 1; n <= apples; n++) total += base * (Math.floor(n / MULTIPLIER_EVERY) + 1);
  return total + golden * base * GOLDEN_FACTOR * (Math.floor(apples / MULTIPLIER_EVERY) + 1);
};

/** Shortest possible game for this many apples: every apple takes at least one tick. */
export const minDurationMs = (mode: Mode, difficulty: Difficulty, apples: number, golden: number) => {
  // Levels and survival speed up during the game, so assume the fastest tick there.
  const tick = mode === 'levels' || mode === 'survival' ? FASTEST_TICK_MS : TICK_MS[difficulty];
  return (apples + golden) * tick;
};

const isInt = (v: unknown, min: number, max: number): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;

const fail = (error: string): Check => ({ ok: false, error });

/** Checks a score sent by the game. Plausibility only: the game itself runs in the browser. */
export const validateScore = (input: unknown): Check => {
  if (!input || typeof input !== 'object') return fail('body');
  const b = input as Record<string, unknown>;

  const name = typeof b.name === 'string' ? b.name.trim() : '';
  if (name.length < 1 || name.length > 16) return fail('name');
  if (!MODES.includes(b.mode as Mode)) return fail('mode');
  if (!DIFFICULTIES.includes(b.difficulty as Difficulty)) return fail('difficulty');
  const mode = b.mode as Mode;
  const difficulty = b.difficulty as Difficulty;

  const golden = b.golden ?? 0;
  const level = b.level ?? null;
  if (!isInt(b.score, 1, 1_000_000)) return fail('score');
  if (!isInt(b.apples, 0, 10_000)) return fail('apples');
  if (!isInt(golden, 0, 10_000)) return fail('golden');
  if (typeof b.durationMs !== 'number' || !Number.isFinite(b.durationMs) || b.durationMs < 0) return fail('duration');
  if (level !== null && (mode !== 'levels' || !isInt(level, 1, 1000))) return fail('level');
  if (golden > 0 && mode !== 'golden') return fail('golden');

  const { score, apples } = b as { score: number; apples: number };
  if (score % POINTS_PER_APPLE[difficulty] !== 0) return fail('score');
  if (score > maxScore(difficulty, apples, golden)) return fail('score too high');
  if (b.durationMs < minDurationMs(mode, difficulty, apples, golden)) return fail('too fast');

  return { ok: true, row: { name, mode, difficulty, score, apples, level: level as number | null } };
};
