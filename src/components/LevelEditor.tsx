import { useMemo, useRef, useState } from 'react';
import { Board } from './Board';
import { canPlaceWall, type CustomLevel } from '../features/customLevels';
import { DEFAULT_GRID, GRID_SIZE } from '../constants/game.constants';
import { initialSnake } from '../utils/game.utils';
import type { Position } from '../types/game.types';
import type { Skin, Theme } from '../features/look';
import type { TFunction } from '../i18n/useTranslation';

interface Props {
  levels: CustomLevel[];
  saveLevel: (level: { id?: string; name: string; obstacles: Position[] }) => string;
  deleteLevel: (id: string) => void;
  onPlay: (level: CustomLevel) => void;
  onBack: () => void;
  skin: Skin;
  theme: Theme;
  t: TFunction;
}

const key = (p: Position) => `${p.x},${p.y}`;

// Cells the editor can't build on, shown tinted.
const NO_BUILD: Position[] = [];
for (let y = 0; y < GRID_SIZE; y++) for (let x = 0; x < GRID_SIZE; x++) if (!canPlaceWall({ x, y })) NO_BUILD.push({ x, y });

export const LevelEditor = ({ levels, saveLevel, deleteLevel, onPlay, onBack, skin, theme, t }: Props) => {
  const [editingId, setEditingId] = useState<string | undefined>(levels[0]?.id);
  const editing = levels.find(l => l.id === editingId);
  const [name, setName] = useState(editing?.name ?? '');
  const [walls, setWalls] = useState<Set<string>>(() => new Set(editing?.obstacles.map(key)));
  const [savedFlash, setSavedFlash] = useState(false);
  const paint = useRef<'add' | 'remove' | null>(null);

  const obstacles = useMemo(() => [...walls].map(k => {
    const [x, y] = k.split(',').map(Number);
    return { x, y };
  }), [walls]);

  const load = (level?: CustomLevel) => {
    setEditingId(level?.id);
    setName(level?.name ?? '');
    setWalls(new Set(level?.obstacles.map(key)));
  };

  const cellAt = (e: React.PointerEvent<HTMLDivElement>): Position | null => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = Math.floor(((e.clientX - r.left) / r.width) * GRID_SIZE);
    const y = Math.floor(((e.clientY - r.top) / r.height) * GRID_SIZE);
    return x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE ? { x, y } : null;
  };

  const apply = (p: Position | null) => {
    if (!p || !paint.current || !canPlaceWall(p)) return;
    const k = key(p);
    setWalls(prev => {
      if (paint.current === 'add' ? prev.has(k) : !prev.has(k)) return prev;
      const next = new Set(prev);
      if (paint.current === 'add') next.add(k);
      else next.delete(k);
      return next;
    });
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const p = cellAt(e);
    if (!p || !canPlaceWall(p)) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    // First cell decides: start on a wall to erase, on empty ground to build.
    paint.current = walls.has(key(p)) ? 'remove' : 'add';
    apply(p);
  };

  const save = () => {
    const id = saveLevel({ id: editingId, name: name || `${t('custom').replace(/^\S+\s/, '')} ${levels.length + 1}`, obstacles });
    setEditingId(id);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1500);
    return id;
  };

  const play = () => {
    const id = save();
    onPlay({ id, name, obstacles });
  };

  const remove = () => {
    if (!editingId || !window.confirm(t('confirmDelete'))) return;
    deleteLevel(editingId);
    load(levels.find(l => l.id !== editingId));
  };

  const btn = 'px-3 py-2 rounded-xl text-sm font-bold transition-colors';

  return (
    <div className="min-h-[100dvh] p-3 md:p-6 flex flex-col items-center gap-4" style={{ background: theme.background }}>
      <div className="w-full max-w-5xl flex items-center justify-between gap-2">
        <button onClick={onBack} className={`${btn} bg-gray-700/70 text-white hover:bg-gray-600`}>{t('back')}</button>
        <h1 className="text-xl md:text-3xl font-bold text-white">{t('editor')}</h1>
        <span className="w-20" />
      </div>

      <div className="w-full max-w-5xl flex flex-col md:flex-row gap-4 items-start">
        <div className="w-full md:flex-1 flex flex-col items-center gap-2">
          <Board
            grid={DEFAULT_GRID}
            theme={theme}
            snakes={[{ body: initialSnake(), skin }]}
            food={null}
            obstacles={obstacles}
            shaded={NO_BUILD}
            className="w-full max-w-[min(90vw,70vh)] aspect-square touch-none cursor-crosshair"
          >
            <div
              className="absolute inset-0 z-30"
              onPointerDown={onPointerDown}
              onPointerMove={e => paint.current && apply(cellAt(e))}
              onPointerUp={() => { paint.current = null; }}
              onPointerCancel={() => { paint.current = null; }}
            />
          </Board>
          <p className="text-xs text-gray-400 text-center max-w-md">{t('editorHelp')}</p>
        </div>

        <div className="w-full md:w-72 space-y-3">
          <div className="bg-gray-800/70 rounded-2xl border border-gray-700 p-3 space-y-2">
            <label className="text-sm font-semibold text-gray-300 block" htmlFor="level-name">{t('levelName')}</label>
            <input
              id="level-name"
              value={name}
              maxLength={24}
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-gray-900 text-white border border-gray-600 focus:outline-none focus:border-emerald-500"
            />
            <p className="text-xs text-gray-400">{walls.size} {t('walls')}</p>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={save} className={`${btn} bg-blue-600 text-white hover:bg-blue-500`}>{savedFlash ? t('saved') : t('saveScore')}</button>
              <button onClick={play} className={`${btn} bg-gradient-to-r from-green-500 to-emerald-600 text-white`}>{t('playLevel')}</button>
              <button onClick={() => setWalls(new Set())} className={`${btn} bg-gray-700 text-gray-200 hover:bg-gray-600`}>{t('clear')}</button>
              <button onClick={remove} disabled={!editingId} className={`${btn} bg-red-700/80 text-white hover:bg-red-600 disabled:opacity-40`}>{t('deleteLevel')}</button>
            </div>
          </div>

          <div className="bg-gray-800/70 rounded-2xl border border-gray-700 p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-gray-300">{t('myLevels')}</p>
              <button onClick={() => load(undefined)} className="text-xs font-bold text-emerald-400 hover:text-emerald-300">{t('newLevel')}</button>
            </div>
            <ul className="space-y-1 max-h-60 overflow-y-auto">
              {levels.map(l => (
                <li key={l.id}>
                  <button
                    onClick={() => load(l)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm ${l.id === editingId ? 'bg-emerald-600/30 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
                  >
                    {l.name} <span className="text-xs text-gray-500">· {l.obstacles.length} {t('walls')}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
