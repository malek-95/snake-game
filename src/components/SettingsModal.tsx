import { Modal } from './Modal';
import { SKINS, THEMES, type Skin, type Theme } from '../features/look';
import { GAME_MODES, DIFFICULTIES } from '../constants/game.constants';
import type { CustomLevel } from '../features/customLevels';
import { onlineEnabled } from '../online/client';
import type { BoardSize, Difficulty, GameMode } from '../types/game.types';
import type { Language } from '../i18n/translations';
import type { TFunction } from '../i18n/useTranslation';

interface Props {
  t: TFunction;
  language: Language;
  setLanguage: (l: Language) => void;
  locked: boolean;                 // a game is running: mode/difficulty/wrap can't change
  gameMode: GameMode;
  onSelectMode: (mode: GameMode | 'versus' | 'online') => void;
  difficulty: Difficulty;
  changeDifficulty: (d: Difficulty) => void;
  wrapAround: boolean;
  toggleWrapAround: () => void;
  boardSize: BoardSize;
  setBoardSize: (s: BoardSize) => void;
  isFullscreen: boolean;
  toggleFullscreen: () => void;
  sfx: boolean;
  music: boolean;
  setSfx: (on: boolean) => void;
  setMusic: (on: boolean) => void;
  skin: Skin;
  setSkin: (id: string) => void;
  theme: Theme;
  setTheme: (id: string) => void;
  unlocked: Record<string, string>;
  customLevels: CustomLevel[];
  customLevelId?: string;
  setCustomLevelId: (id: string) => void;
  onOpenEditor: () => void;
  install: { canInstall: boolean; installed: boolean; install: () => void; showIOSHint: boolean };
  onClose: () => void;
}

const chip = (active: boolean, extra = '') =>
  `py-2 px-3 rounded-xl text-sm font-bold transition-all ${active ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'} ${extra}`;
const disabledCls = 'disabled:opacity-40 disabled:cursor-not-allowed';

const Section = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <p className="text-sm font-semibold text-gray-300 mb-2">{label}</p>
    {children}
  </div>
);

export const SettingsModal = (p: Props) => {
  const { t } = p;
  const wrapForced = p.gameMode === 'levels' || p.gameMode === 'zen';

  return (
    <Modal title={`⚙️ ${t('settings')}`} onClose={p.onClose} closeLabel={t('close')}>
      <div className="space-y-5">
        <Section label="🌐 Language / Langue">
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => p.setLanguage('fr')} className={chip(p.language === 'fr')}>🇫🇷 Français</button>
            <button onClick={() => p.setLanguage('en')} className={chip(p.language === 'en')}>🇬🇧 English</button>
          </div>
        </Section>

        <Section label={t('gameMode')}>
          <div className="grid grid-cols-2 gap-2">
            {GAME_MODES.map(m => (
              <button key={m} disabled={p.locked} onClick={() => p.onSelectMode(m)} className={chip(p.gameMode === m, disabledCls)}>
                {t(m)}
              </button>
            ))}
            <button onClick={() => p.onSelectMode('versus')} className={chip(false, 'bg-gradient-to-r from-fuchsia-600/70 to-orange-500/70 text-white')}>
              {t('versus')}
            </button>
            {onlineEnabled && (
              <button onClick={() => p.onSelectMode('online')} className={chip(false, 'col-span-2 bg-gradient-to-r from-sky-600/80 to-indigo-600/80 text-white')}>
                {t('online')}
              </button>
            )}
          </div>
          {p.gameMode === 'custom' && (
            <div className="mt-2 space-y-2">
              {p.customLevels.length === 0 ? (
                <p className="text-xs text-gray-400">{t('noCustomLevels')}</p>
              ) : (
                <select
                  aria-label={t('chooseLevel')}
                  disabled={p.locked}
                  value={p.customLevelId}
                  onChange={e => p.setCustomLevelId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-gray-900 text-white border border-gray-600"
                >
                  {p.customLevels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              )}
              <button onClick={p.onOpenEditor} className={chip(false, 'w-full')}>{t('editor')}</button>
            </div>
          )}
        </Section>

        <Section label={t('difficulty')}>
          <div className="grid grid-cols-3 gap-2">
            {DIFFICULTIES.map(d => (
              <button key={d} disabled={p.locked} onClick={() => p.changeDifficulty(d)} className={chip(p.difficulty === d, disabledCls)}>{t(d)}</button>
            ))}
          </div>
        </Section>

        <Section label={t('wrapAround')}>
          <button
            onClick={p.toggleWrapAround}
            disabled={p.locked || wrapForced}
            className={chip(p.wrapAround || p.gameMode === 'zen', `w-full ${disabledCls}`)}
          >
            {p.wrapAround || p.gameMode === 'zen' ? t('wrapAroundOn') : t('wrapAroundOff')}
            {p.gameMode === 'levels' && t('disabledInLevels')}
          </button>
        </Section>

        <Section label={t('soundSection')}>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => p.setSfx(!p.sfx)} className={chip(p.sfx)} aria-pressed={p.sfx}>
              {p.sfx ? '🔊' : '🔇'} {t('soundEffects')}
            </button>
            <button onClick={() => p.setMusic(!p.music)} className={chip(p.music)} aria-pressed={p.music}>
              {p.music ? '🎵' : '🔇'} {t('music')}
            </button>
          </div>
        </Section>

        <Section label={t('skin')}>
          <div className="grid grid-cols-4 gap-2">
            {SKINS.map(s => {
              const isLocked = !!s.unlockedBy && !p.unlocked[s.unlockedBy];
              return (
                <button
                  key={s.id}
                  disabled={isLocked}
                  onClick={() => p.setSkin(s.id)}
                  title={isLocked ? `🔒 ${t('locked')}` : s.name[p.language]}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all ${p.skin.id === s.id ? 'border-cyan-400 bg-gray-700' : 'border-transparent bg-gray-700/50 hover:bg-gray-700'} ${disabledCls}`}
                >
                  <span className="flex gap-0.5">
                    {[3, 2, 1].map(i => <span key={i} className="w-3 h-3 rounded-sm" style={{ background: s.body(i, 4) }} />)}
                    <span className="w-3 h-3 rounded-sm" style={{ background: s.head, boxShadow: `0 0 6px ${s.glow}` }} />
                  </span>
                  <span className="text-[10px] text-gray-300 leading-tight">{isLocked ? '🔒' : s.name[p.language]}</span>
                </button>
              );
            })}
          </div>
        </Section>

        <Section label={t('theme')}>
          <div className="grid grid-cols-3 gap-2">
            {THEMES.map(th => (
              <button
                key={th.id}
                onClick={() => p.setTheme(th.id)}
                title={th.name[p.language]}
                className={`h-12 rounded-xl border-2 flex items-end justify-center pb-1 ${p.theme.id === th.id ? 'border-cyan-400' : 'border-gray-600'}`}
                style={{ background: th.background }}
              >
                <span className="text-[10px] text-white/90 leading-none">{th.name[p.language]}</span>
              </button>
            ))}
          </div>
        </Section>

        <Section label={t('boardSize')}>
          <div className="grid grid-cols-3 gap-2">
            {(['small', 'medium', 'large'] as BoardSize[]).map(size => (
              <button key={size} onClick={() => p.setBoardSize(size)} className={chip(p.boardSize === size)}>
                {t(size === 'medium' ? 'mediumSize' : size)}
              </button>
            ))}
          </div>
        </Section>

        {(p.install.canInstall || p.install.installed || p.install.showIOSHint) && (
          <Section label={t('appSection')}>
            {p.install.installed ? (
              <p className="text-sm text-green-400 font-semibold">{t('installedApp')}</p>
            ) : p.install.canInstall ? (
              <button onClick={p.install.install} className={chip(false, 'w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white')}>
                📲 {t('installApp')}
              </button>
            ) : (
              <p className="text-xs text-gray-400">{t('iosInstallHint')}</p>
            )}
          </Section>
        )}

        <Section label={t('display')}>
          <button onClick={p.toggleFullscreen} className={chip(p.isFullscreen, 'w-full')}>
            {p.isFullscreen ? t('exitFullscreen') : t('fullscreen')}
          </button>
        </Section>
      </div>
    </Modal>
  );
};
