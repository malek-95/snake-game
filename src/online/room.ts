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
  /** Everyone in the room (presence keys): host first, then guests in the order they joined. */
  onMembers?: (keys: string[]) => void;
  onMessage?: (event: string, payload: Record<string, unknown>) => void;
}

export interface Room {
  code: string;
  role: Role;
  /** My presence key (matches the entries given to onMembers). */
  key: string;
  /** Party room: up to 4 players instead of 2. */
  party: boolean;
  send: (event: string, payload: Record<string, unknown>) => void;
  /** Replaces the listeners (the lobby hands the room over to the game screen). */
  setHandlers: (handlers: RoomHandlers) => void;
  close: () => void;
}

interface Member {
  role: Role;
  joinedAt: number;
  /** Set by the host of a party room. */
  party?: boolean;
}

export const PARTY_SIZE = 4;

/**
 * Joins the realtime channel for a room code.
 * A host gets the room right away and waits for guests (one, or up to three in a party room);
 * a guest needs a host to be there already and learns from it whether it's a party room.
 * Rejects with a RoomError. `client` is only swapped in tests, where several players share one process.
 */
export const openRoom = (code: string, role: Role, timeoutMs = 5000, client: SupabaseClient | null = supabase, party = false): Promise<Room> =>
  new Promise((resolve, reject) => {
    if (!client) return reject('failed' satisfies RoomError);

    const me: Member = { role, joinedAt: Date.now() + Math.random(), ...(party ? { party } : {}) };
    const key = `${role}-${me.joinedAt}`;
    const channel: RealtimeChannel = client.channel(`snake-room:${code}`, {
      config: { broadcast: { self: false }, presence: { key } },
    });

    let handlers: RoomHandlers = {};
    let settled = false;
    let peer = false;
    let members: string[] = [];

    const room: Room = {
      code,
      role,
      key,
      party,
      send: (event, payload) => {
        channel.send({ type: 'broadcast', event, payload }).catch(() => {});
      },
      setHandlers: h => {
        handlers = h;
        h.onPeer?.(peer);
        h.onMembers?.(members);
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
      const entries = Object.entries(channel.presenceState() as unknown as Record<string, Member[]>)
        .map(([k, [m]]) => ({ ...m, key: k }))
        .sort((a, b) => (a.role === b.role ? a.joinedAt - b.joinedAt : a.role === 'host' ? -1 : 1));
      const hosts = entries.filter(m => m.role === 'host');
      const guests = entries.filter(m => m.role === 'guest');

      // Only decide once the host and our own entry are visible, so a guest who joined just before us has shown up too.
      if (role === 'guest' && !settled && hosts.length > 0 && guests.some(g => g.joinedAt === me.joinedAt)) {
        room.party = !!hosts[0].party;
        // Guests who joined before us fill the room: it's taken.
        if (guests.filter(g => g.joinedAt < me.joinedAt).length >= (room.party ? PARTY_SIZE - 1 : 1)) return fail('full');
        succeed();
      }

      const keys = entries.map(m => m.key);
      if (keys.join() !== members.join()) {
        members = keys;
        handlers.onMembers?.(members);
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
