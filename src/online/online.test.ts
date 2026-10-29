import { describe, it, expect } from 'vitest';
import { makeRoomCode, normalizeCode, isValidCode, openRoom, type Room } from './room';
import { fetchWorldTop, submitWorldScore, fetchDailyGhost } from './worldLeaderboard';
import { createClient } from '@supabase/supabase-js';
import { supabase } from './client';

// Each player gets their own connection, like separate browsers would.
const player = () =>
  createClient(import.meta.env.VITE_SUPABASE_URL!, import.meta.env.VITE_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });

describe('room codes', () => {
  it('makes readable 4-character codes', () => {
    for (let i = 0; i < 200; i++) {
      const code = makeRoomCode();
      expect(isValidCode(code)).toBe(true);
      expect(code).not.toMatch(/[01OI]/);
    }
  });

  it('cleans up what people type', () => {
    expect(normalizeCode(' ab-c d9 ')).toBe('ABCD');
    expect(normalizeCode('xy')).toBe('XY');
    expect(isValidCode('XY')).toBe(false);
    expect(isValidCode('AB0D')).toBe(false); // 0 is never used
  });
});

// Needs a running Supabase: VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY (e.g. the local `supabase start` stack).
const backend = describe.skipIf(!supabase);

backend('world leaderboard (live backend)', () => {
  it('stores a score and returns it in the top 10, best first', async () => {
    const name = `t${Date.now() % 100000}`;
    // 42 apples on hard can reach at most 2280 points.
    await submitWorldScore({ name, mode: 'golden', difficulty: 'hard', score: 2280, apples: 42, golden: 0, durationMs: 20_000 });
    await submitWorldScore({ name: `${name}b`, mode: 'golden', difficulty: 'hard', score: 2260, apples: 42, golden: 0, durationMs: 20_000 });
    const { data: mine } = await supabase!.from('scores').select('score, apples').eq('name', name);
    expect(mine).toEqual([{ score: 2280, apples: 42 }]);
    const top = await fetchWorldTop('golden', 'hard');
    expect(top.map(r => r.score)).toEqual([...top.map(r => r.score)].sort((a, b) => b - a));
  });

  it('rejects impossible scores on the server', async () => {
    const real = { name: 'x', mode: 'classic' as const, difficulty: 'easy' as const, golden: 0, durationMs: 10_000 };
    await expect(submitWorldScore({ ...real, score: 5000, apples: 1 })).rejects.toBeTruthy();       // too many points for 1 apple
    await expect(submitWorldScore({ ...real, score: 50, apples: 10, durationMs: 50 })).rejects.toBeTruthy(); // too fast
    await expect(submitWorldScore({ ...real, mode: 'nope' as never, score: 10, apples: 2 })).rejects.toBeTruthy();
  });

  it('keeps one world score per player: their best', async () => {
    const name = `best${Date.now() % 100000}`;
    const send = (score: number, apples: number) =>
      submitWorldScore({ name, mode: 'survival', difficulty: 'medium', score, apples, golden: 0, durationMs: 60_000 });
    expect(await send(300, 30)).toBe(true);   // first score
    expect(await send(250, 25)).toBe(false);  // lower: the best stays
    expect(await send(400, 40)).toBe(true);   // better: replaces it
    const { data } = await supabase!.from('scores').select('score').ilike('name', name);
    expect(data).toEqual([{ score: 400 }]);
  });

  it('keeps one daily challenge score per player per day', async () => {
    const name = `day${Date.now() % 100000}`;
    const send = (score: number, apples: number) =>
      submitWorldScore({ name, mode: 'daily', difficulty: 'medium', score, apples, golden: 0, durationMs: 60_000 });
    expect(await send(100, 10)).toBe(true);
    expect(await send(90, 9)).toBe(false);
    const today = await fetchWorldTop('daily', 'medium');
    expect(today.filter(r => r.name === name).map(r => r.score)).toEqual([100]);
  });

  it('stores the best daily run so others can race its ghost', async () => {
    const name = `gh${Date.now() % 100000}`;
    const path = [[210, 209, 208], [211, 210, 209]];
    await submitWorldScore({ name, mode: 'daily', difficulty: 'medium', score: 990, apples: 39, golden: 0, durationMs: 60_000, ghost: path });
    const ghost = await fetchDailyGhost();
    expect(ghost).toMatchObject({ name, score: 990, path });
  });

  it('refuses scores written straight into the database', async () => {
    const { error } = await supabase!.from('scores').insert({ name: 'cheat', mode: 'classic', difficulty: 'easy', score: 5, apples: 1 });
    expect(error).toBeTruthy();
  });

  it('limits how many scores one connection can send per minute', async () => {
    const results = [];
    for (let n = 0; n < 6; n++) {
      results.push(await submitWorldScore({ name: 'rate', mode: 'zen', difficulty: 'easy', score: 5, apples: 1, golden: 0, durationMs: 5000 }).then(() => 'ok', () => 'refused'));
    }
    expect(results).toContain('refused');
  });

  it('does not let anyone delete or change scores', async () => {
    const { error: updateError, count: updated } = await supabase!.from('scores').update({ score: 1 }, { count: 'exact' }).eq('mode', 'golden');
    expect(updateError ?? updated === 0).toBeTruthy();
    const { error: deleteError, count: deleted } = await supabase!.from('scores').delete({ count: 'exact' }).eq('mode', 'golden');
    expect(deleteError ?? deleted === 0).toBeTruthy();
  });
});

const until = async (check: () => boolean, ms = 5000) => {
  const end = Date.now() + ms;
  while (!check()) {
    if (Date.now() > end) throw new Error('timed out');
    await new Promise(r => setTimeout(r, 50));
  }
};

backend('online rooms (live backend)', () => {
  it('connects a host and a guest and passes messages both ways', async () => {
    const code = makeRoomCode();
    const host: Room = await openRoom(code, 'host', 5000, player());
    let hostSeesGuest = false;
    const hostGot: unknown[] = [];
    host.setHandlers({ onPeer: p => { hostSeesGuest = p; }, onMessage: (e, p) => hostGot.push([e, p]) });

    const guest = await openRoom(code, 'guest', 5000, player());
    const guestGot: unknown[] = [];
    let guestSeesHost = false;
    guest.setHandlers({ onPeer: p => { guestSeesHost = p; }, onMessage: (e, p) => guestGot.push([e, p]) });

    await until(() => hostSeesGuest && guestSeesHost);
    guest.send('input', { dir: 'UP' });
    host.send('state', { n: 7 });
    await until(() => hostGot.length > 0 && guestGot.length > 0);
    expect(hostGot[0]).toEqual(['input', { dir: 'UP' }]);
    expect(guestGot[0]).toEqual(['state', { n: 7 }]);

    // A third player is turned away, and the host notices when the guest leaves.
    await expect(openRoom(code, 'guest', 5000, player())).rejects.toBe('full');
    guest.close();
    await until(() => !hostSeesGuest);
    host.close();
  }, 20000);

  it('reports a room nobody is hosting', async () => {
    await expect(openRoom(makeRoomCode(), 'guest', 1500)).rejects.toBe('notFound');
  }, 10000);
});
