import { useEffect, useRef, useState } from 'react';
import { OnlineVersus } from './OnlineVersus';
import { onlineEnabled } from '../online/client';
import { openRoom, makeRoomCode, normalizeCode, isValidCode, type Room, type RoomError } from '../online/room';
import type { Skin, Theme } from '../features/look';
import type { Difficulty } from '../types/game.types';
import type { TFunction } from '../i18n/useTranslation';

interface Props {
  difficulty: Difficulty;
  skin: Skin;
  theme: Theme;
  musicOn: boolean;
  t: TFunction;
  /** Room code from a shared link: join it straight away. */
  initialCode?: string;
  onExit: () => void;
  onMatchWon: () => void;
}

type Status = 'menu' | 'connecting' | 'waiting' | 'playing';

const ERROR_TEXT: Record<RoomError, 'roomNotFound' | 'roomFull' | 'connectionFailed'> = {
  notFound: 'roomNotFound',
  full: 'roomFull',
  failed: 'connectionFailed',
};

export const OnlineLobby = ({ difficulty, skin, theme, musicOn, t, initialCode, onExit, onMatchWon }: Props) => {
  const [status, setStatus] = useState<Status>('menu');
  const [room, setRoom] = useState<Room | null>(null);
  const [error, setError] = useState<RoomError | null>(null);
  const [codeInput, setCodeInput] = useState(normalizeCode(initialCode ?? ''));
  const [copied, setCopied] = useState(false);
  const roomRef = useRef<Room | null>(null);

  // Leaving the screen always leaves the room.
  useEffect(() => () => roomRef.current?.close(), []);

  const enter = (r: Room) => {
    roomRef.current = r;
    setRoom(r);
  };

  const create = async () => {
    setError(null);
    setStatus('connecting');
    try {
      const r = await openRoom(makeRoomCode(), 'host');
      enter(r);
      setStatus('waiting');
      r.setHandlers({ onPeer: present => present && setStatus('playing') });
    } catch (e) {
      setError(e as RoomError);
      setStatus('menu');
    }
  };

  const join = async (code: string) => {
    if (!isValidCode(code)) return;
    setError(null);
    setStatus('connecting');
    try {
      enter(await openRoom(code, 'guest'));
      setStatus('playing');
    } catch (e) {
      setError(e as RoomError);
      setStatus('menu');
    }
  };

  const joinedFromLink = useRef(false);
  useEffect(() => {
    if (onlineEnabled && initialCode && !joinedFromLink.current) {
      joinedFromLink.current = true;
      join(normalizeCode(initialCode));
    }
  }, [initialCode]); // eslint-disable-line react-hooks/exhaustive-deps

  const leave = () => {
    roomRef.current?.close();
    roomRef.current = null;
    setRoom(null);
    setStatus('menu');
  };

  if (status === 'playing' && room) {
    return (
      <OnlineVersus room={room} difficulty={difficulty} skin={skin} theme={theme} musicOn={musicOn} t={t} onExit={leave} onMatchWon={onMatchWon} />
    );
  }

  const link = room ? `${location.origin}${location.pathname}?room=${room.code}` : '';
  const copyLink = () => {
    navigator.clipboard?.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }).catch(() => {});
  };

  const card = 'w-full max-w-sm bg-gray-800/70 border border-gray-700 rounded-2xl p-5 space-y-4 text-center';
  const bigBtn = 'w-full py-3 rounded-xl text-lg font-bold text-white transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-40 disabled:hover:scale-100';

  return (
    <div className="min-h-[100dvh] p-4 flex flex-col items-center gap-6" style={{ background: theme.background }}>
      <div className="w-full max-w-sm flex items-center justify-between">
        <button onClick={status === 'waiting' ? leave : onExit} className="px-3 py-2 rounded-xl text-sm font-bold bg-gray-700/70 text-white hover:bg-gray-600">{t('back')}</button>
        <h1 className="text-2xl font-bold text-white">{t('online')}</h1>
        <span className="w-16" />
      </div>

      {!onlineEnabled ? (
        <div className={card}><p className="text-gray-300">{t('onlineNotSetUp')}</p></div>
      ) : status === 'waiting' && room ? (
        <div className={card} role="status">
          <p className="text-gray-300">{t('shareCode')}</p>
          <p className="text-5xl font-black tracking-[0.3em] text-white font-mono" aria-label={room.code.split('').join(' ')}>{room.code}</p>
          <button onClick={copyLink} className={`${bigBtn} bg-gray-700 hover:bg-gray-600 text-base`}>{copied ? t('copied') : `🔗 ${t('copyLink')}`}</button>
          <p className="text-gray-400 animate-pulse">{t('waitingFriend')}</p>
        </div>
      ) : (
        <>
          <div className={card}>
            <button onClick={create} disabled={status === 'connecting'} className={`${bigBtn} bg-gradient-to-r from-green-500 to-emerald-600`}>
              ➕ {t('createRoom')}
            </button>
          </div>
          <form className={card} onSubmit={e => { e.preventDefault(); join(codeInput); }}>
            <label htmlFor="room-code" className="block text-gray-300 font-semibold">{t('roomCode')}</label>
            <input
              id="room-code"
              value={codeInput}
              onChange={e => setCodeInput(normalizeCode(e.target.value))}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              placeholder="ABCD"
              className="w-full text-center text-3xl font-mono tracking-[0.3em] px-3 py-2 rounded-xl bg-gray-900 text-white border border-gray-600 focus:outline-none focus:border-cyan-400"
            />
            <button type="submit" disabled={!isValidCode(codeInput) || status === 'connecting'} className={`${bigBtn} bg-gradient-to-r from-blue-500 to-cyan-500`}>
              {status === 'connecting' ? '…' : `🚪 ${t('joinRoom')}`}
            </button>
          </form>
          {error && <p className="text-red-400 font-semibold" role="alert">{t(ERROR_TEXT[error])}</p>}
        </>
      )}
    </div>
  );
};
