import { useCallback, useState } from 'react';
import { loadJSON, saveJSON } from '../utils/storage';
import { isSafePosition } from '../utils/game.utils';
import { GRID_SIZE } from '../constants/game.constants';
import type { Position } from '../types/game.types';

export interface CustomLevel {
  id: string;
  name: string;
  obstacles: Position[];
}

const KEY = 'snake-custom-levels';
const CENTER = Math.floor(GRID_SIZE / 2);

/** Can a wall go here? Inside the 20x20 board and outside the snake's spawn zone. */
export const canPlaceWall = (p: Position) =>
  p.x >= 0 && p.x < GRID_SIZE && p.y >= 0 && p.y < GRID_SIZE && isSafePosition(p.x, p.y, CENTER);

/** Drops walls that are out of bounds, in the spawn zone, or duplicated (e.g. from hand-edited storage). */
export const cleanObstacles = (obstacles: Position[]): Position[] => {
  const seen = new Set<string>();
  return obstacles.filter(p => {
    const k = `${p.x},${p.y}`;
    if (!Number.isInteger(p.x) || !Number.isInteger(p.y) || !canPlaceWall(p) || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
};

const isLevels = (v: unknown) =>
  Array.isArray(v) && v.every(l => typeof l?.id === 'string' && typeof l?.name === 'string' && Array.isArray(l?.obstacles));

export const useCustomLevels = () => {
  const [levels, setLevels] = useState<CustomLevel[]>(() =>
    loadJSON<CustomLevel[]>(KEY, [], isLevels).map(l => ({ ...l, obstacles: cleanObstacles(l.obstacles) })));

  const persist = useCallback((next: CustomLevel[]) => {
    setLevels(next);
    saveJSON(KEY, next);
  }, []);

  /** Creates or updates a level; returns its id. */
  const saveLevel = useCallback((level: Omit<CustomLevel, 'id'> & { id?: string }) => {
    const id = level.id ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const clean: CustomLevel = { id, name: level.name.trim().slice(0, 24) || 'Level', obstacles: cleanObstacles(level.obstacles) };
    persist(levels.some(l => l.id === id) ? levels.map(l => (l.id === id ? clean : l)) : [...levels, clean]);
    return id;
  }, [levels, persist]);

  const deleteLevel = useCallback((id: string) => persist(levels.filter(l => l.id !== id)), [levels, persist]);

  return { levels, saveLevel, deleteLevel };
};
