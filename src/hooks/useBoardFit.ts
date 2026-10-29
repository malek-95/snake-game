import { useEffect, useRef, useState } from 'react';
import { gridForArea } from '../utils/game.utils';
import { DEFAULT_GRID } from '../constants/game.constants';
import type { Grid } from '../types/game.types';

/**
 * Measures the space left for the board. When `fill` is on, it suggests a grid that fills that
 * space with ~28px cells, and sizes a (possibly locked) grid to fit it with square cells.
 */
export const useBoardFit = (fill: boolean) => {
  const areaRef = useRef<HTMLDivElement>(null);
  const [area, setArea] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = areaRef.current;
    if (!fill || !el) return;
    const ro = new ResizeObserver(([entry]) => setArea({ w: entry.contentRect.width, h: entry.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, [fill]);

  const preferredGrid = fill && area.w > 0 ? gridForArea(area.w, area.h) : DEFAULT_GRID;

  const boardStyle = (grid: Grid): React.CSSProperties => {
    if (!fill) return { aspectRatio: `${grid.cols} / ${grid.rows}` };
    const cell = Math.min(area.w / grid.cols, area.h / grid.rows);
    return { width: grid.cols * cell, height: grid.rows * cell };
  };

  return { areaRef, preferredGrid, boardStyle };
};
