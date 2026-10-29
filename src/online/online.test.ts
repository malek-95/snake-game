import { describe, it, expect } from 'vitest';
import { makeRoomCode, normalizeCode, isValidCode, openRoom, type Room } from './room';
import { fetchWorldTop, submitWorldScore } from './worldLeaderboard';
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
    await submitWorldScore({ name, mode: 'golden', difficulty: 'hard', score: 999_000, apples: 42 });
    await submitWorldScore({ name: `${name}b`, mode: 'golden', difficulty: 'hard', score: 998_000, apples: 41 });
    const top = await fetchWorldTop('golden', 'hard');
    const i = top.findIndex(r => r.name === name);
    expect(i).toBeGreaterThanOrEqual(0);
    expect(top[i]).toMatchObject({ score: 999_000, apples: 42 });
    expect(top.map(r => r.score)).toEqual([...top.map(r => r.score)].sort((a, b) => b - a));
  });

  it('rejects impossible scores at the database', async () => {
    await expect(submitWorldScore({ name: 'x', mode: 'classic', difficulty: 'easy', score: 5_000_000, apples: 1 })).rejects.toBeTruthy();
    await expect(submitWorldScore({ name: 'x', mode: 'nope' as never, difficulty: 'easy', score: 10, apples: 1 })).rejects.toBeTruthy();
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
