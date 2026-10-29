import { useState } from 'react';
import { Modal } from './Modal';
import { boardKey, type Boards } from '../features/leaderboard';
import { GAME_MODES, DIFFICULTIES } from '../constants/game.constants';
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

/** Top 10 scores on this device, per mode and difficulty. */
export const LeaderboardModal = ({ boards, initialMode, initialDifficulty, language, t, onClose }: Props) => {
  const [mode, setMode] = useState(initialMode);
  const [difficulty, setDifficulty] = useState(initialDifficulty);
  const entries = boards[boardKey(mode, difficulty)] ?? [];
  const dateFmt = new Intl.DateTimeFormat(language, { day: 'numeric', month: 'short' });

  return (
    <Modal title={t('leaderboard')} onClose={onClose} closeLabel={t('close')}>
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

      {entries.length === 0 ? (
        <p className="text-center text-gray-400 py-8">{t('noScores')}</p>
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
