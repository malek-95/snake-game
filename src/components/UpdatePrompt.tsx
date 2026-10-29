import { useRegisterSW } from 'virtual:pwa-register/react';
import { useTranslation } from '../i18n/useTranslation';

const HOUR = 60 * 60 * 1000;

/**
 * Offers the new version as soon as one is downloaded. Without this, an open tab or installed app
 * keeps running the old code, which can stop working when the online backend changes.
 */
export const UpdatePrompt = () => {
  const { t } = useTranslation();
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    // Long-open tabs still look for updates now and then.
    onRegisteredSW: (_url, registration) => {
      if (registration) setInterval(() => registration.update().catch(() => {}), HOUR);
    },
  });

  if (!needRefresh) return null;
  return (
    <div role="status" className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[70] flex items-center gap-3 bg-gray-900/95 border border-indigo-400/40 text-white rounded-2xl px-4 py-3 shadow-2xl">
      <span className="text-sm">🔄 {t('updateReady')}</span>
      <button onClick={() => updateServiceWorker(true)} className="px-3 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-sm font-bold">
        {t('updateNow')}
      </button>
      <button onClick={() => setNeedRefresh(false)} aria-label={t('close')} className="text-gray-400 hover:text-white">✕</button>
    </div>
  );
};
