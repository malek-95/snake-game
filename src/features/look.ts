import { useCallback, useEffect, useState } from 'react';
import { loadJSON, saveJSON } from '../utils/storage';
import type { Language } from '../i18n/translations';

type Text = Record<Language, string>;

export interface Skin {
  id: string;
  name: Text;
  head: string;
  /** Colour of body segment i (1 = right behind the head) for a snake of length len. */
  body: (i: number, len: number) => string;
  glow: string;
  /** Achievement id that unlocks this skin; free when missing. */
  unlockedBy?: string;
}

export interface Theme {
  id: string;
  name: Text;
  background: string;
  board: string;
  grid: string;
  gridOpacity: number;
  border: string;
}

const mix = (i: number, len: number) => (len <= 1 ? 0 : i / (len - 1));

export const SKINS: Skin[] = [
  { id: 'classic', name: { fr: 'Classique', en: 'Classic' }, head: '#4ade80', body: () => '#22c55e', glow: 'rgba(74,222,128,.5)' },
  { id: 'ocean', name: { fr: 'Océan', en: 'Ocean' }, head: '#7dd3fc', body: (i, l) => `hsl(${200 + mix(i, l) * 30} 85% ${60 - mix(i, l) * 25}%)`, glow: 'rgba(56,189,248,.55)' },
  { id: 'fire', name: { fr: 'Feu', en: 'Fire' }, head: '#fde047', body: (i, l) => `hsl(${45 - mix(i, l) * 45} 95% 55%)`, glow: 'rgba(251,146,60,.6)' },
  { id: 'neon', name: { fr: 'Néon', en: 'Neon' }, head: '#f0abfc', body: i => (i % 2 ? '#22d3ee' : '#e879f9'), glow: 'rgba(232,121,249,.7)', unlockedBy: 'combo_x3' },
  { id: 'rainbow', name: { fr: 'Arc-en-ciel', en: 'Rainbow' }, head: '#ffffff', body: i => `hsl(${(i * 28) % 360} 85% 60%)`, glow: 'rgba(255,255,255,.5)', unlockedBy: 'hungry' },
  { id: 'gold', name: { fr: 'Or', en: 'Gold' }, head: '#fef3c7', body: (i, l) => `hsl(${45 - mix(i, l) * 15} 90% ${60 - mix(i, l) * 20}%)`, glow: 'rgba(250,204,21,.7)', unlockedBy: 'golden_touch' },
  { id: 'ghost', name: { fr: 'Fantôme', en: 'Ghost' }, head: '#f8fafc', body: (i, l) => `rgba(226,232,240,${0.85 - mix(i, l) * 0.6})`, glow: 'rgba(226,232,240,.6)', unlockedBy: 'zen_master' },
];

export const THEMES: Theme[] = [
  { id: 'midnight', name: { fr: 'Minuit', en: 'Midnight' }, background: 'linear-gradient(135deg,#0f172a,#111827 50%,#0f172a)', board: 'rgba(17,24,39,.8)', grid: '#6b7280', gridOpacity: 0.06, border: 'rgba(75,85,99,.5)' },
  { id: 'forest', name: { fr: 'Forêt', en: 'Forest' }, background: 'linear-gradient(135deg,#052e16,#0b1f15 50%,#022c22)', board: 'rgba(4,28,18,.85)', grid: '#4ade80', gridOpacity: 0.07, border: 'rgba(34,197,94,.35)' },
  { id: 'deepsea', name: { fr: 'Abysses', en: 'Deep sea' }, background: 'linear-gradient(135deg,#082f49,#0b1628 50%,#172554)', board: 'rgba(7,26,48,.85)', grid: '#38bdf8', gridOpacity: 0.08, border: 'rgba(56,189,248,.35)' },
  { id: 'synthwave', name: { fr: 'Synthwave', en: 'Synthwave' }, background: 'linear-gradient(135deg,#2e1065,#1e1b4b 50%,#4a044e)', board: 'rgba(24,8,44,.85)', grid: '#e879f9', gridOpacity: 0.12, border: 'rgba(232,121,249,.45)' },
  { id: 'ember', name: { fr: 'Braise', en: 'Ember' }, background: 'linear-gradient(135deg,#1c1917,#292524 50%,#431407)', board: 'rgba(28,25,23,.85)', grid: '#fb923c', gridOpacity: 0.07, border: 'rgba(251,146,60,.35)' },
];

export const skinById = (id: string) => SKINS.find(s => s.id === id) ?? SKINS[0];
export const themeById = (id: string) => THEMES.find(t => t.id === id) ?? THEMES[0];

/** A second skin that stands out against `skin`, for player 2. */
export const rivalSkin = (skin: Skin) => (skin.id === 'fire' ? skinById('ocean') : skinById('fire'));

const LOOK_KEY = 'snake-look';

export const useLook = () => {
  const [look, setLook] = useState(() =>
    loadJSON(LOOK_KEY, { skin: 'classic', theme: 'midnight' }, v =>
      !!v && typeof (v as { skin: unknown }).skin === 'string' && typeof (v as { theme: unknown }).theme === 'string'));

  useEffect(() => {
    saveJSON(LOOK_KEY, look);
  }, [look]);

  const setSkin = useCallback((skin: string) => setLook(l => ({ ...l, skin })), []);
  const setTheme = useCallback((theme: string) => setLook(l => ({ ...l, theme })), []);
  return { skin: skinById(look.skin), theme: themeById(look.theme), setSkin, setTheme };
};
