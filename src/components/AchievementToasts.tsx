import { useEffect } from 'react';
import type { Achievement } from '../features/achievements';
import type { Language } from '../i18n/translations';
import type { TFunction } from '../i18n/useTranslation';

interface Props {
  toasts: Achievement[];
  dismiss: (id: string) => void;
  language: Language;
  t: TFunction;
}

/** Shows unlocked achievements one at a time, each for a few seconds. */
export const AchievementToasts = ({ toasts, dismiss, language, t }: Props) => {
  const current = toasts[0];

  useEffect(() => {
    if (!current) return;
    const timer = setTimeout(() => dismiss(current.id), 3500);
    return () => clearTimeout(timer);
  }, [current, dismiss]);

  if (!current) return null;
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] pointer-events-none" role="status" aria-live="polite">
      <div key={current.id} className="animate-bonus-pop flex items-center gap-3 bg-gradient-to-r from-amber-500/95 to-yellow-400/95 text-gray-900 px-4 py-2.5 rounded-2xl shadow-2xl shadow-amber-500/40 border border-yellow-200/60">
        <span className="text-3xl">{current.icon}</span>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider opacity-80">{t('achievementUnlocked')}</p>
          <p className="font-bold leading-tight">{current.name[language]}</p>
        </div>
      </div>
    </div>
  );
};
