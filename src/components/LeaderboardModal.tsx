import { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { boardKey, type Boards } from '../features/leaderboard';
import { GAME_MODES, DIFFICULTIES } from '../constants/game.constants';
import { onlineEnabled } from '../online/client';
import { fetchWorldTop } from '../online/worldLeaderboard';
import { fetchLadder, type Profile } from '../online/account';
import type { Difficulty, GameMode } from '../types/game.types';
import type { Language } from '../i18n/translations';
import type { TFunction } from '../i18n/useTranslation';

interface Props {
  boards: Boards;
  initialMode: GameMode;
  initialDifficulty: Difficulty;
  language: Language;
  t: TFunction;
  onClose: () => void;
}

const medal = (i: number) => ['🥇', '🥈', '🥉'][i] ?? `${i + 1}`;

interface Row {
  name: string;
  score: number;
  apples: number;
  date: string;
}

/** Top 10 scores per mode and difficulty: on this device, or worldwide when online play is set up. */
export const LeaderboardModal = ({ boards, initialMode, initialDifficulty, language, t, onClose }: Props) => {
  const [mode, setMode] = useState(initialMode);
  const [difficulty, setDifficulty] = useState(initialDifficulty);
  const [scope, setScope] = useState<'device' | 'world' | 'ranked'>('device');
  const [ladder, setLadder] = useState<{ rows: Profile[]; status: 'loading' | 'ok' | 'error' }>({ rows: [], status: 'loading' });
  const [world, setWorld] = useState<{ rows: Row[]; status: 'loading' | 'ok' | 'error' }>({ rows: [], status: 'loading' });
  const dateFmt = new Intl.DateTimeFormat(language, { day: 'numeric', month: 'short' });

  useEffect(() => {
    if (scope !== 'world') return;
    let current = true;
    setWorld({ rows: [], status: 'loading' });
    fetchWorldTop(mode, difficulty)
      .then(rows => current && setWorld({ rows: rows.map(r => ({ ...r, date: r.created_at })), status: 'ok' }))
      .catch(() => current && setWorld({ rows: [], status: 'error' }));
    return () => { current = false; };
  }, [scope, mode, difficulty]);

  useEffect(() => {
    if (scope !== 'ranked') return;
    let current = true;
    fetchLadder()
      .then(rows => current && setLadder({ rows, status: 'ok' }))
      .catch(() => current && setLadder({ rows: [], status: 'error' }));
    return () => { current = false; };
  }, [scope]);

  const entries: Row[] = scope === 'world' ? world.rows : boards[boardKey(mode, difficulty)] ?? [];
  const message =
    scope === 'ranked' ? (ladder.status === 'loading' ? t('loading') : ladder.status === 'error' ? t('serverError') : ladder.rows.length === 0 ? t('noScores') : null)
    : scope === 'world' && world.status === 'loading' ? t('loading')
    : scope === 'world' && world.status === 'error' ? t('serverError')
    : entries.length === 0 ? t('noScores')
    : null;

  return (
    <Modal title={t('leaderboard')} onClose={onClose} closeLabel={t('close')}>
      {onlineEnabled && (
        <div className="grid grid-cols-3 gap-1.5 mb-3" role="tablist">
          {(['device', 'world', 'ranked'] as const).map(s => (
            <button
              key={s}
              role="tab"
              aria-selected={scope === s}
              onClick={() => setScope(s)}
              className={`py-2 rounded-xl text-sm font-bold transition-colors ${scope === s ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
            >
              {s === 'device' ? t('thisDevice') : s === 'world' ? t('world') : t('ranked')}
            </button>
          ))}
        </div>
      )}
      {scope !== 'ranked' && <>
      <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-1 px-1">
        {GAME_MODES.map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${mode === m ? 'bg-yellow-500 text-gray-900' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
          >
            {t(m)}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-1.5 mb-3">
        {DIFFICULTIES.map(d => (
          <button
            key={d}
            onClick={() => setDifficulty(d)}
            className={`py-1.5 rounded-lg text-xs font-bold transition-colors ${difficulty === d ? 'bg-gray-200 text-gray-900' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
          >
            {t(d)}
          </button>
        ))}
      </div>
      </>}

      {message ? (
        <p className="text-center text-gray-400 py-8" role="status">{message}</p>
      ) : scope === 'ranked' ? (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400 text-xs uppercase tracking-wider">
              <th className="text-left py-1 w-8">#</th>
              <th className="text-left py-1">{t('name')}</th>
              <th className="text-right py-1">{t('rating')}</th>
              <th className="text-right py-1">W–L</th>
            </tr>
          </thead>
          <tbody>
            {ladder.rows.map((p, i) => (
              <tr key={p.id} className={`border-t border-gray-700/60 ${i < 3 ? 'text-white' : 'text-gray-300'}`}>
                <td className="py-1.5">{medal(i)}</td>
                <td className="py-1.5 font-semibold truncate max-w-[9rem]">{p.username}</td>
                <td className="py-1.5 text-right font-bold tabular-nums text-yellow-300">{p.rating}</td>
                <td className="py-1.5 text-right tabular-nums">{p.wins}–{p.losses}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400 text-xs uppercase tracking-wider">
              <th className="text-left py-1 w-8">#</th>
              <th className="text-left py-1">{t('name')}</th>
              <th className="text-right py-1">{t('score')}</th>
              <th className="text-right py-1">🍎</th>
              <th className="text-right py-1 hidden sm:table-cell" />
            </tr>
          </thead>
          <tbody>
            {entries.map((e, i) => (
              <tr key={`${e.date}-${i}`} className={`border-t border-gray-700/60 ${i < 3 ? 'text-white' : 'text-gray-300'}`}>
                <td className="py-1.5">{medal(i)}</td>
                <td className="py-1.5 font-semibold truncate max-w-[9rem]">{e.name}</td>
                <td className="py-1.5 text-right font-bold tabular-nums text-yellow-300">{e.score}</td>
                <td className="py-1.5 text-right tabular-nums">{e.apples}</td>
                <td className="py-1.5 text-right text-gray-500 text-xs hidden sm:table-cell">{dateFmt.format(new Date(e.date))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Modal>
  );
};
