import { useEffect, useRef, useState } from 'react';
import { OnlineVersus } from './OnlineVersus';
import { onlineEnabled } from '../online/client';
import { openRoom, makeRoomCode, normalizeCode, isValidCode, type Room, type RoomError } from '../online/room';
import { quickMatch } from '../online/quickMatch';
import type { useProfile, UsernameError } from '../online/account';
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
  /** My ranked account (username + rating); players without one play unranked. */
  account: ReturnType<typeof useProfile>;
  onExit: () => void;
  onMatchWon: () => void;
}

type Status = 'menu' | 'connecting' | 'waiting' | 'searching' | 'playing';

const ERROR_TEXT: Record<RoomError, 'roomNotFound' | 'roomFull' | 'connectionFailed'> = {
  notFound: 'roomNotFound',
  full: 'roomFull',
  failed: 'connectionFailed',
};

export const OnlineLobby = ({ difficulty, skin, theme, musicOn, t, initialCode, account, onExit, onMatchWon }: Props) => {
  const [status, setStatus] = useState<Status>('menu');
  const [room, setRoom] = useState<Room | null>(null);
  const [error, setError] = useState<RoomError | null>(null);
  const [codeInput, setCodeInput] = useState(normalizeCode(initialCode ?? ''));
  const [copied, setCopied] = useState(false);
  const roomRef = useRef<Room | null>(null);
  const { profile } = account;
  const [username, setUsername] = useState(profile?.username ?? '');
  const [nameState, setNameState] = useState<'idle' | 'saving' | 'saved' | UsernameError>('idle');
  useEffect(() => { if (profile) setUsername(profile.username); }, [profile?.username]); // eslint-disable-line react-hooks/exhaustive-deps
  const saveName = async () => {
    setNameState('saving');
    try {
      await account.rename(username);
      setNameState('saved');
    } catch (e) {
      setNameState(typeof e === 'string' ? e as UsernameError : 'failed');
    }
  };

  // Leaving the screen always leaves the room.
  useEffect(() => () => roomRef.current?.close(), []);

  const enter = (r: Room) => {
    roomRef.current = r;
    setRoom(r);
  };

  // Quick match: pair with anyone who's looking for a game.
  const searchRef = useRef<AbortController | null>(null);
  useEffect(() => () => searchRef.current?.abort(), []);
  const quick = async () => {
    setError(null);
    setStatus('searching');
    const search = new AbortController();
    searchRef.current = search;
    try {
      enter(await quickMatch(search.signal));
      setStatus('playing');
    } catch (e) {
      if (e !== 'cancelled') setError('failed');
      setStatus('menu');
    }
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
    account.refresh(); // the rating may have changed
  };

  if (status === 'playing' && room) {
    return (
      <OnlineVersus room={room} profile={profile} difficulty={difficulty} skin={skin} theme={theme} musicOn={musicOn} t={t} onExit={leave} onMatchWon={onMatchWon} />
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
      ) : status === 'searching' ? (
        <div className={card} role="status">
          <p className="text-3xl animate-pulse">🔎</p>
          <p className="text-gray-300">{t('searchingPlayer')}</p>
          <button onClick={() => searchRef.current?.abort()} className={`${bigBtn} bg-gray-700 hover:bg-gray-600 text-base`}>{t('cancel')}</button>
        </div>
      ) : status === 'waiting' && room ? (
        <div className={card} role="status">
          <p className="text-gray-300">{t('shareCode')}</p>
          <p className="text-5xl font-black tracking-[0.3em] text-white font-mono" aria-label={room.code.split('').join(' ')}>{room.code}</p>
          <button onClick={copyLink} className={`${bigBtn} bg-gray-700 hover:bg-gray-600 text-base`}>{copied ? t('copied') : `🔗 ${t('copyLink')}`}</button>
          <p className="text-gray-400 animate-pulse">{t('waitingFriend')}</p>
        </div>
      ) : (
        <>
          <form className={card} onSubmit={e => { e.preventDefault(); saveName(); }}>
            {profile ? (
              <p className="text-white font-bold">
                {t('ranked')} · {t('rating')} <span className="text-yellow-300 tabular-nums" data-rating>{profile.rating}</span>
                <span className="block text-sm font-normal text-gray-400">{profile.wins}–{profile.losses}</span>
              </p>
            ) : (
              <p className="text-gray-300 text-sm">{t('rankedHint')}</p>
            )}
            <label htmlFor="ranked-name" className="sr-only">{t('rankedName')}</label>
            <div className="flex gap-2">
              <input
                id="ranked-name"
                value={username}
                onChange={e => { setUsername(e.target.value); setNameState('idle'); }}
                maxLength={16}
                autoComplete="nickname"
                placeholder={t('rankedName')}
                className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-gray-900 text-white border border-gray-600 focus:outline-none focus:border-cyan-400"
              />
              <button
                type="submit"
                disabled={nameState === 'saving' || !username.trim() || username.trim() === profile?.username}
                className="px-4 py-2 rounded-xl font-bold text-white bg-gradient-to-r from-yellow-500 to-amber-600 disabled:opacity-40"
              >
                {nameState === 'saving' ? '…' : nameState === 'saved' ? '✓' : t('saveScore')}
              </button>
            </div>
            {(nameState === 'taken' || nameState === 'invalid' || nameState === 'failed') && (
              <p className="text-red-400 text-sm font-semibold" role="alert">
                {t(nameState === 'taken' ? 'usernameTaken' : nameState === 'invalid' ? 'usernameInvalid' : 'serverError')}
              </p>
            )}
          </form>
          <div className={card}>
            <button onClick={quick} disabled={status === 'connecting'} className={`${bigBtn} bg-gradient-to-r from-amber-500 to-orange-600`}>
              ⚡ {t('quickMatch')}
            </button>
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
