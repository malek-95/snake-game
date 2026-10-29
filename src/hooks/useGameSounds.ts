import { useEffect, useRef, useState, useCallback } from 'react';
import { sound } from '../audio/sound';
import { loadJSON, saveJSON } from '../utils/storage';
import type { UseSnakeGameReturn } from '../types/game.types';

const AUDIO_KEY = 'snake-audio';

interface AudioSettings {
  sfx: boolean;
  music: boolean;
}

const isAudioSettings = (v: unknown) =>
  !!v && typeof (v as AudioSettings).sfx === 'boolean' && typeof (v as AudioSettings).music === 'boolean';

/** Sound and music on/off switches, remembered between visits. */
export const useAudioSettings = () => {
  const [settings, setSettings] = useState<AudioSettings>(() =>
    loadJSON(AUDIO_KEY, { sfx: true, music: true }, isAudioSettings));

  useEffect(() => {
    sound.setSfx(settings.sfx);
    sound.setMusic(settings.music);
    saveJSON(AUDIO_KEY, settings);
  }, [settings]);

  const setSfx = useCallback((sfx: boolean) => setSettings(s => ({ ...s, sfx })), []);
  const setMusic = useCallback((music: boolean) => setSettings(s => ({ ...s, music })), []);
  return { ...settings, setSfx, setMusic };
};

/** Plays a sound when a counter goes up (ignores resets to 0 on a new game). */
const useOnIncrease = (value: number, play: (value: number) => void) => {
  const prev = useRef(value);
  useEffect(() => {
    if (value > prev.current) play(value);
    prev.current = value;
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps
};

/** Plays a sound when a new event object arrives. */
const useOnEvent = (event: { id: number } | null, play: () => void) => {
  useEffect(() => {
    if (event) play();
  }, [event?.id]); // eslint-disable-line react-hooks/exhaustive-deps
};

/** Turns game state changes into sound effects, and plays music while a game runs. */
export const useGameSounds = (game: UseSnakeGameReturn, musicOn: boolean) => {
  useOnIncrease(game.gameId, () => sound.play('start'));
  useOnIncrease(game.applesEaten, n => sound.play('eat', n));
  useOnIncrease(game.goldenEaten, () => sound.play('golden'));
  useOnIncrease(game.tailCuts, () => sound.play('cut'));
  useOnEvent(game.bonusEvent, () => sound.play('bonus'));
  useOnEvent(game.lifeGainedEvent, () => sound.play('lifeGained'));
  useOnEvent(game.lifeLostEvent, () => sound.play('lifeLost'));
  useOnEvent(game.levelCompleteEvent, () => sound.play('levelUp'));

  const prevState = useRef(game.gameState);
  useEffect(() => {
    if (game.gameState === 'gameover' && prevState.current !== 'gameover') sound.play('gameOver');
    prevState.current = game.gameState;
  }, [game.gameState]);

  useEffect(() => {
    if (game.gameMode === 'timeAttack' && game.gameState === 'playing' && game.timeLeft > 0 && game.timeLeft <= 10) {
      sound.play('countdown', game.timeLeft);
    }
  }, [game.timeLeft]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (game.gameState === 'playing' && musicOn) sound.startMusic();
    else sound.stopMusic();
  }, [game.gameState, musicOn]);

  useEffect(() => () => sound.stopMusic(), []);
};
