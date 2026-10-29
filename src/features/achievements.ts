import { useCallback, useEffect, useRef, useState } from 'react';
import { loadJSON, saveJSON } from '../utils/storage';
import { sound } from '../audio/sound';
import type { Difficulty, GameMode, GameState } from '../types/game.types';
import type { Language } from '../i18n/translations';

type Text = Record<Language, string>;

/** Everything an achievement can look at: the current game plus lifetime counters. */
export interface Progress {
  mode: GameMode;
  difficulty: Difficulty;
  gameState: GameState;
  applesEaten: number;
  score: number;
  level: number;
  multiplier: number;
  goldenEaten: number;
  length: number;
  gamesPlayed: number;
  versusWins: number;
}

export interface Achievement {
  id: string;
  icon: string;
  name: Text;
  desc: Text;
  check: (p: Progress) => boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_bite', icon: '🍎', name: { fr: 'Première bouchée', en: 'First bite' }, desc: { fr: 'Manger une pomme', en: 'Eat an apple' }, check: p => p.applesEaten >= 1 },
  { id: 'hungry', icon: '🍽️', name: { fr: 'Affamé', en: 'Hungry' }, desc: { fr: '25 pommes en une partie (débloque Arc-en-ciel)', en: '25 apples in one game (unlocks Rainbow)' }, check: p => p.applesEaten >= 25 },
  { id: 'glutton', icon: '🐷', name: { fr: 'Glouton', en: 'Glutton' }, desc: { fr: '100 pommes en une partie', en: '100 apples in one game' }, check: p => p.applesEaten >= 100 },
  { id: 'score_500', icon: '⭐', name: { fr: 'Étoile montante', en: 'Rising star' }, desc: { fr: 'Atteindre 500 points', en: 'Reach 500 points' }, check: p => p.score >= 500 },
  { id: 'score_2000', icon: '🌟', name: { fr: 'Superstar', en: 'Superstar' }, desc: { fr: 'Atteindre 2000 points', en: 'Reach 2000 points' }, check: p => p.score >= 2000 },
  { id: 'combo_x3', icon: '🔥', name: { fr: 'En feu', en: 'On fire' }, desc: { fr: 'Atteindre le bonus x3 (débloque Néon)', en: 'Reach the x3 bonus (unlocks Neon)' }, check: p => p.multiplier >= 3 },
  { id: 'level_3', icon: '🧗', name: { fr: 'Grimpeur', en: 'Climber' }, desc: { fr: 'Atteindre le niveau 3', en: 'Reach level 3' }, check: p => p.mode === 'levels' && p.level >= 3 },
  { id: 'level_5', icon: '🏔️', name: { fr: 'Sommet', en: 'Summit' }, desc: { fr: 'Atteindre le niveau 5', en: 'Reach level 5' }, check: p => p.mode === 'levels' && p.level >= 5 },
  { id: 'golden_touch', icon: '✨', name: { fr: 'Toucher d’or', en: 'Golden touch' }, desc: { fr: 'Manger une pomme dorée (débloque Or)', en: 'Eat a golden apple (unlocks Gold)' }, check: p => p.goldenEaten >= 1 },
  { id: 'gold_rush', icon: '💰', name: { fr: 'Ruée vers l’or', en: 'Gold rush' }, desc: { fr: '5 pommes dorées en une partie', en: '5 golden apples in one game' }, check: p => p.goldenEaten >= 5 },
  { id: 'speed_demon', icon: '⚡', name: { fr: 'Démon de vitesse', en: 'Speed demon' }, desc: { fr: '30 pommes en Survie', en: '30 apples in Survival' }, check: p => p.mode === 'survival' && p.applesEaten >= 30 },
  { id: 'time_lord', icon: '⏱️', name: { fr: 'Maître du temps', en: 'Time lord' }, desc: { fr: '40 pommes en Contre-la-montre', en: '40 apples in Time attack' }, check: p => p.mode === 'timeAttack' && p.applesEaten >= 40 },
  { id: 'zen_master', icon: '🧘', name: { fr: 'Maître zen', en: 'Zen master' }, desc: { fr: 'Longueur 50 en Zen (débloque Fantôme)', en: 'Length 50 in Zen (unlocks Ghost)' }, check: p => p.mode === 'zen' && p.length >= 50 },
  { id: 'architect', icon: '🧱', name: { fr: 'Architecte', en: 'Architect' }, desc: { fr: 'Jouer un niveau personnalisé', en: 'Play a custom level' }, check: p => p.mode === 'custom' && p.gameState === 'playing' },
  { id: 'hard_mode', icon: '💪', name: { fr: 'Coriace', en: 'Tough' }, desc: { fr: '20 pommes en Difficile', en: '20 apples on Hard' }, check: p => p.difficulty === 'hard' && p.applesEaten >= 20 },
  { id: 'duelist', icon: '⚔️', name: { fr: 'Duelliste', en: 'Duelist' }, desc: { fr: 'Gagner un match à 2 joueurs', en: 'Win a 2-player match' }, check: p => p.versusWins >= 1 },
  { id: 'veteran', icon: '🎖️', name: { fr: 'Vétéran', en: 'Veteran' }, desc: { fr: 'Jouer 25 parties', en: 'Play 25 games' }, check: p => p.gamesPlayed >= 25 },
];

/** Ids that `progress` earns and that aren't unlocked yet. */
export const newlyUnlocked = (progress: Progress, unlocked: Record<string, string>) =>
  ACHIEVEMENTS.filter(a => !unlocked[a.id] && a.check(progress)).map(a => a.id);

interface Saved {
  unlocked: Record<string, string>;
  stats: { gamesPlayed: number; versusWins: number };
}

const KEY = 'snake-achievements';
const EMPTY: Saved = { unlocked: {}, stats: { gamesPlayed: 0, versusWins: 0 } };
const isSaved = (v: unknown) =>
  !!v && typeof (v as Saved).unlocked === 'object' && typeof (v as Saved).stats?.gamesPlayed === 'number' && typeof (v as Saved).stats?.versusWins === 'number';

export const useAchievements = (game: Omit<Progress, 'gamesPlayed' | 'versusWins'> & { gameId: number }) => {
  const [saved, setSaved] = useState<Saved>(() => loadJSON(KEY, EMPTY, isSaved));
  const [toasts, setToasts] = useState<Achievement[]>([]);

  const update = useCallback((fn: (s: Saved) => Saved) => {
    setSaved(prev => {
      const next = fn(prev);
      saveJSON(KEY, next);
      return next;
    });
  }, []);

  // Count each started game.
  const lastGameId = useRef(game.gameId);
  useEffect(() => {
    if (game.gameId > lastGameId.current) {
      update(s => ({ ...s, stats: { ...s.stats, gamesPlayed: s.stats.gamesPlayed + 1 } }));
    }
    lastGameId.current = game.gameId;
  }, [game.gameId, update]);

  const recordVersusWin = useCallback(() => {
    update(s => ({ ...s, stats: { ...s.stats, versusWins: s.stats.versusWins + 1 } }));
  }, [update]);

  const progress: Progress = { ...game, ...saved.stats };
  const ids = newlyUnlocked(progress, saved.unlocked);
  const key = ids.join(',');
  useEffect(() => {
    if (!ids.length) return;
    const date = new Date().toISOString();
    update(s => ({ ...s, unlocked: { ...s.unlocked, ...Object.fromEntries(ids.map(id => [id, date])) } }));
    setToasts(t => [...t, ...ACHIEVEMENTS.filter(a => ids.includes(a.id))]);
    sound.play('achievement');
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  const dismissToast = useCallback((id: string) => setToasts(t => t.filter(a => a.id !== id)), []);

  return { unlocked: saved.unlocked, stats: saved.stats, toasts, dismissToast, recordVersusWin };
};
