import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from './client';
import { openRoom, makeRoomCode, type Room } from './room';

interface Waiting {
  id: string;
  code: string;
  joinedAt: number;
}

/**
 * Pairs you with any other player looking for a game, through a shared live lobby:
 * if someone is already waiting you join their room; otherwise you open one and wait.
 * When two players start at the same moment, the later one joins the earlier one's room.
 * Resolves with the room (host or guest); rejects with 'cancelled' or 'failed'.
 */
export const quickMatch = (signal: AbortSignal, client: SupabaseClient | null = supabase): Promise<Room> =>
  new Promise((resolve, reject) => {
    if (!client) return reject('failed');
    const me = { id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`, joinedAt: Date.now() };
    const lobby = client.channel('snake-quick-match', { config: { presence: { key: me.id } } });
    let hosted: Room | null = null;
    let busy = false;
    let again = false; // an update arrived while busy: look once more afterwards
    let done = false;

    const finish = (room: Room | null, error?: string) => {
      if (done) return;
      done = true;
      client.removeChannel(lobby);
      if (room) return resolve(room);
      hosted?.close();
      reject(error ?? 'cancelled');
    };
    signal.addEventListener('abort', () => finish(null, 'cancelled'));

    const look = async () => {
      if (done) return;
      if (busy) {
        again = true;
        return;
      }
      busy = true;
      try {
        const others = (Object.values(lobby.presenceState()).flat() as unknown as Waiting[])
          .filter(w => w.id !== me.id && w.code)
          .sort((a, b) => a.joinedAt - b.joinedAt || a.id.localeCompare(b.id));
        // Join someone who was waiting before me (or anyone, if I'm not hosting yet).
        const target = others.find(w => !hosted || w.joinedAt < me.joinedAt || (w.joinedAt === me.joinedAt && w.id < me.id));
        if (target) {
          try {
            const room = await openRoom(target.code, 'guest', 3000, client);
            hosted?.close();
            return finish(room);
          } catch {
            // Taken or gone: keep looking.
          }
        }
        if (!hosted && !done) {
          const code = makeRoomCode();
          hosted = await openRoom(code, 'host', 5000, client);
          const room = hosted;
          room.setHandlers({ onPeer: present => present && finish(room) });
          await lobby.track({ id: me.id, code, joinedAt: me.joinedAt });
        }
      } catch {
        finish(null, 'failed');
      } finally {
        busy = false;
        if (again && !done) {
          again = false;
          void look();
        }
      }
    };

    lobby.on('presence', { event: 'sync' }, () => void look());
    lobby.subscribe(status => {
      if (status === 'SUBSCRIBED') void look();
      else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') finish(null, 'failed');
    });
  });
