/** Ranked ladder rating: every account starts here. */
export const START_RATING = 1000;
const K = 32;

/**
 * Points the winner takes from the loser (Elo, K = 32). Beating a stronger player earns more.
 * Must match report_ranked_result() in supabase/migrations/20261030090000_ranked.sql.
 */
export const eloDelta = (winnerRating: number, loserRating: number) =>
  Math.round(K * (1 - 1 / (1 + 10 ** ((loserRating - winnerRating) / 400))));

/** Trimmed username, or null when it can't be one (1–16 characters, no control characters). */
export const cleanUsername = (raw: string): string | null => {
  const name = raw.trim();
  // eslint-disable-next-line no-control-regex
  return name.length >= 1 && name.length <= 16 && !/[\u0000-\u001f\u007f]/.test(name) ? name : null;
};
