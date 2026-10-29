import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { supabase } from './client';

// No 0/O or 1/I, so codes are easy to read out loud.
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 4;

export const makeRoomCode = (rng = Math.random) =>
  Array.from({ length: CODE_LENGTH }, () => CODE_CHARS[Math.floor(rng() * CODE_CHARS.length)]).join('');

/** Uppercases and strips anything that can't be in a code (spaces, dashes, typos). */
export const normalizeCode = (raw: string) => raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, CODE_LENGTH);

export const isValidCode = (code: string) => code.length === CODE_LENGTH && [...code].every(c => CODE_CHARS.includes(c));

export type Role = 'host' | 'guest';
export type RoomError = 'notFound' | 'full' | 'failed';

export interface RoomHandlers {
  onPeer?: (present: boolean) => void;
  onMessage?: (event: string, payload: Record<string, unknown>) => void;
}

export interface Room {
  code: string;
  role: Role;
  send: (event: string, payload: Record<string, unknown>) => void;
  /** Replaces the listeners (the lobby hands the room over to the game screen). */
  setHandlers: (handlers: RoomHandlers) => void;
  close: () => void;
}

interface Member {
  role: Role;
  joinedAt: number;
}

/**
 * Joins the realtime channel for a room code.
 * A host gets the room right away and waits for a guest; a guest needs a host to be there already.
 * Rejects with a RoomError. `client` is only swapped in tests, where several players share one process.
 */
export const openRoom = (code: string, role: Role, timeoutMs = 5000, client: SupabaseClient | null = supabase): Promise<Room> =>
  new Promise((resolve, reject) => {
    if (!client) return reject('failed' satisfies RoomError);

    const me: Member = { role, joinedAt: Date.now() + Math.random() };
    const channel: RealtimeChannel = client.channel(`snake-room:${code}`, {
      config: { broadcast: { self: false }, presence: { key: `${role}-${me.joinedAt}` } },
    });

    let handlers: RoomHandlers = {};
    let settled = false;
    let peer = false;

    const room: Room = {
      code,
      role,
      send: (event, payload) => {
        channel.send({ type: 'broadcast', event, payload }).catch(() => {});
      },
      setHandlers: h => {
        handlers = h;
        h.onPeer?.(peer);
      },
      close: () => {
        client.removeChannel(channel);
      },
    };

    const fail = (err: RoomError) => {
      if (settled) return;
      settled = true;
      client.removeChannel(channel);
      reject(err);
    };
    const succeed = () => {
      if (settled) return;
      settled = true;
      resolve(room);
    };

    channel.on('broadcast', { event: '*' }, ({ event, payload }) => handlers.onMessage?.(event, payload ?? {}));

    channel.on('presence', { event: 'sync' }, () => {
      const members = Object.values(channel.presenceState()).flat() as unknown as Member[];
      const hosts = members.filter(m => m.role === 'host');
      const guests = members.filter(m => m.role === 'guest');

      if (role === 'guest' && !settled) {
        // Someone joined as guest before us: the room is taken.
        if (guests.some(g => g.joinedAt < me.joinedAt)) return fail('full');
        // Only decide once our own entry is visible, so a guest who joined just before us has shown up too.
        if (hosts.length > 0 && guests.some(g => g.joinedAt === me.joinedAt)) succeed();
      }

      const nowPeer = role === 'host' ? guests.length > 0 : hosts.length > 0;
      if (nowPeer !== peer) {
        peer = nowPeer;
        handlers.onPeer?.(peer);
      }
    });

    channel.subscribe(async status => {
      if (status === 'SUBSCRIBED') {
        await channel.track(me);
        if (role === 'host') succeed();
        else setTimeout(() => fail('notFound'), timeoutMs);
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        fail('failed');
      }
    });
  });
