import { useEffect, useMemo, useState } from 'react';
import { Modal } from './Modal';
import { Board } from './Board';
import { decodeCell, obstaclesAt, type Replay } from '../features/replay';
import type { Skin, Theme } from '../features/look';
import type { TFunction } from '../i18n/useTranslation';

interface Props {
  last: Replay | null;
  best: Replay | null;
  skin: Skin;
  theme: Theme;
  t: TFunction;
  onClose: () => void;
}

const SPEEDS = [0.5, 1, 2, 4];

const formatTime = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export const ReplayViewer = ({ last, best, skin, theme, t, onClose }: Props) => {
  const [which, setWhich] = useState<'last' | 'best'>(last ? 'last' : 'best');
  const replay = which === 'last' ? last : best;
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);

  useEffect(() => {
    setIndex(0);
    setPlaying(true);
  }, [replay]);

  const frames = replay?.frames ?? [];
  const lastIndex = frames.length - 1;

  // Advance using the recorded gap between ticks, so speed-ups and slow-downs replay faithfully.
  useEffect(() => {
    if (!playing || index >= lastIndex) return;
    const gap = Math.max(16, (frames[index + 1].t - frames[index].t) / speed);
    const timer = setTimeout(() => setIndex(i => i + 1), gap);
    return () => clearTimeout(timer);
  }, [playing, index, lastIndex, speed, frames]);

  const view = useMemo(() => {
    if (!replay || !frames[index]) return null;
    const f = frames[index];
    const g = replay.grid;
    return {
      snake: f.s.map(n => decodeCell(n, g)),
      food: decodeCell(f.f, g),
      golden: f.g !== undefined ? decodeCell(f.g, g) : null,
      obstacles: obstaclesAt(frames, index).map(n => decodeCell(n, g)),
      score: f.sc,
    };
  }, [replay, frames, index]);

  const ended = index >= lastIndex;

  return (
    <Modal title={t('replay')} onClose={onClose} closeLabel={t('close')} wide>
      <div className="grid grid-cols-2 gap-2 mb-3">
        {([['last', last, t('lastGame')], ['best', best, t('bestGame')]] as const).map(([key, r, label]) => (
          <button
            key={key}
            disabled={!r}
            onClick={() => setWhich(key)}
            className={`py-2 rounded-xl text-sm font-bold transition-colors disabled:opacity-40 ${which === key ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
          >
            {label}{r ? ` · ${r.score}` : ''}
          </button>
        ))}
      </div>

      {!replay || !view ? (
        <p className="text-center text-gray-400 py-10">{t('noReplay')}</p>
      ) : (
        <>
          <div className="flex justify-between text-sm text-gray-300 mb-2 tabular-nums">
            <span>{t(replay.mode)} · {t(replay.difficulty)}</span>
            <span>{t('score')}: <b className="text-white">{view.score}</b></span>
          </div>
          <div className="flex justify-center">
            <Board
              grid={replay.grid}
              theme={theme}
              snakes={[{ body: view.snake, skin, dead: ended }]}
              food={view.food}
              golden={view.golden}
              obstacles={view.obstacles}
              style={{ width: `min(100%, calc(46vh *${replay.grid.cols} / ${replay.grid.rows}))`, aspectRatio: `${replay.grid.cols} / ${replay.grid.rows}` }}
            />
          </div>

          <div className="mt-3 flex items-center gap-3">
            <button
              onClick={() => (ended ? (setIndex(0), setPlaying(true)) : setPlaying(p => !p))}
              className="w-11 h-11 shrink-0 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white text-lg font-bold"
              aria-label={ended ? '↺' : playing ? t('pause') : t('resume')}
            >
              {ended ? '↺' : playing ? '❚❚' : '▶'}
            </button>
            <input
              type="range"
              min={0}
              max={lastIndex}
              value={index}
              onChange={e => { setIndex(+e.target.value); setPlaying(false); }}
              className="flex-1 accent-emerald-500"
              aria-label={t('time')}
            />
            <span className="text-xs text-gray-400 tabular-nums w-20 text-right">
              {formatTime(frames[index].t)} / {formatTime(frames[lastIndex].t)}
            </span>
          </div>
          <div className="mt-2 flex justify-center gap-1.5">
            {SPEEDS.map(s => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`px-3 py-1 rounded-lg text-xs font-bold ${speed === s ? 'bg-gray-200 text-gray-900' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
              >
                {s}x
              </button>
            ))}
          </div>
        </>
      )}
    </Modal>
  );
};
