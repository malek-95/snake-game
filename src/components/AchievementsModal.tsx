import { Modal } from './Modal';
import { ACHIEVEMENTS } from '../features/achievements';
import type { Language } from '../i18n/translations';
import type { TFunction } from '../i18n/useTranslation';

interface Props {
  unlocked: Record<string, string>;
  language: Language;
  t: TFunction;
  onClose: () => void;
}

export const AchievementsModal = ({ unlocked, language, t, onClose }: Props) => {
  const count = ACHIEVEMENTS.filter(a => unlocked[a.id]).length;
  return (
    <Modal title={`${t('achievements')} · ${count}/${ACHIEVEMENTS.length}`} onClose={onClose} closeLabel={t('close')} wide>
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden mb-4">
        <div className="h-full bg-gradient-to-r from-amber-500 to-yellow-300 transition-all" style={{ width: `${(count / ACHIEVEMENTS.length) * 100}%` }} />
      </div>
      <ul className="grid sm:grid-cols-2 gap-2">
        {ACHIEVEMENTS.map(a => {
          const done = !!unlocked[a.id];
          return (
            <li
              key={a.id}
              className={`flex items-center gap-3 p-3 rounded-xl border ${done ? 'bg-amber-500/10 border-amber-400/40' : 'bg-gray-900/40 border-gray-700'}`}
            >
              <span className={`text-3xl ${done ? '' : 'grayscale opacity-40'}`}>{a.icon}</span>
              <div className="min-w-0">
                <p className={`font-bold ${done ? 'text-amber-200' : 'text-gray-400'}`}>{a.name[language]}</p>
                <p className="text-xs text-gray-400">{a.desc[language]}</p>
              </div>
              {done && <span className="ml-auto text-green-400 text-lg" aria-label="✓">✓</span>}
            </li>
          );
        })}
      </ul>
    </Modal>
  );
};
