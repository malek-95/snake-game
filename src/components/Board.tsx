import type { ReactNode } from 'react';
import type { Grid, Position } from '../types/game.types';
import type { Skin, Theme } from '../features/look';

export interface BoardSnake {
  body: Position[];
  skin: Skin;
  blink?: boolean;
  dead?: boolean;
}

interface BoardProps {
  grid: Grid;
  theme: Theme;
  snakes: BoardSnake[];
  food: Position | null;
  golden?: Position | null;
  obstacles: Position[];
  /** Cells to tint (e.g. the editor's no-build zone). */
  shaded?: Position[];
  accentBorder?: boolean;
  wrapGlow?: boolean;
  className?: string;
  style?: React.CSSProperties;
  children?: ReactNode;
  onTouchStart?: (e: React.TouchEvent) => void;
  onTouchEnd?: (e: React.TouchEvent) => void;
}

/** Absolute position for cell p as % of the board, inset by `gap` px on each side. */
export const cellStyle = (p: Position, grid: Grid, gap = 1): React.CSSProperties => ({
  left: `calc(${p.x} * 100% / ${grid.cols} + ${gap}px)`,
  top: `calc(${p.y} * 100% / ${grid.rows} + ${gap}px)`,
  width: `calc(100% / ${grid.cols} - ${gap * 2}px)`,
  height: `calc(100% / ${grid.rows} - ${gap * 2}px)`,
});

/** Renders the playing field: grid lines, walls, apples and any number of snakes. */
export const Board = ({
  grid, theme, snakes, food, golden, obstacles, shaded, accentBorder, wrapGlow,
  className = '', style, children, onTouchStart, onTouchEnd,
}: BoardProps) => (
  <div
    className={`relative @container rounded-2xl border-2 overflow-hidden shadow-2xl ${className}`}
    style={{ background: theme.board, borderColor: accentBorder ? 'rgba(168,85,247,.6)' : theme.border, ...style }}
    onTouchStart={onTouchStart}
    onTouchEnd={onTouchEnd}
  >
    <div
      className="absolute inset-0"
      style={{
        opacity: theme.gridOpacity,
        backgroundImage: `linear-gradient(to right, ${theme.grid} 1px, transparent 1px), linear-gradient(to bottom, ${theme.grid} 1px, transparent 1px)`,
        backgroundSize: `calc(100% / ${grid.cols}) calc(100% / ${grid.rows})`,
      }}
    />

    {wrapGlow && (
      <>
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-purple-400 to-transparent opacity-60 animate-pulse z-20" />
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-purple-400 to-transparent opacity-60 animate-pulse z-20" />
        <div className="absolute top-0 bottom-0 left-0 w-1 bg-gradient-to-b from-transparent via-purple-400 to-transparent opacity-60 animate-pulse z-20" />
        <div className="absolute top-0 bottom-0 right-0 w-1 bg-gradient-to-b from-transparent via-purple-400 to-transparent opacity-60 animate-pulse z-20" />
      </>
    )}

    {shaded?.map(p => (
      <div key={`sh-${p.x}-${p.y}`} className="absolute bg-emerald-500/10" style={cellStyle(p, grid, 0)} />
    ))}

    {obstacles.map(p => (
      <div
        key={`obs-${p.x}-${p.y}`}
        className="absolute rounded-sm bg-gradient-to-br from-gray-500 to-gray-700 border border-gray-400/30 shadow-inner flex items-center justify-center text-[8px] md:text-[10px]"
        style={cellStyle(p, grid)}
      >
        <span className="opacity-60">🧱</span>
      </div>
    ))}

    {snakes.map((snake, si) =>
      snake.body.map((seg, i) => {
        const head = i === 0;
        const fade = head ? 1 : Math.max(0.45, 1 - (i / snake.body.length) * 0.55);
        return (
          <div
            key={`${si}-${i}`}
            className={`absolute rounded-md ${head ? 'z-20' : 'z-10'} ${snake.blink ? 'animate-pulse' : ''}`}
            style={{
              ...cellStyle(seg, grid),
              backgroundColor: snake.dead ? '#4b5563' : head ? snake.skin.head : snake.skin.body(i, snake.body.length),
              opacity: snake.dead ? 0.6 : fade,
              boxShadow: head && !snake.dead ? `0 0 12px ${snake.skin.glow}` : 'none',
            }}
          >
            {head && (
              <div className="w-full h-full flex items-center justify-center text-[10px] md:text-xs leading-none">
                {snake.dead ? '😵' : '👀'}
              </div>
            )}
          </div>
        );
      }),
    )}

    {food && food.x >= 0 && (
      <div className="absolute z-10 flex items-center justify-center animate-pulse" style={cellStyle(food, grid, 0)}>
        <span className="text-sm md:text-lg drop-shadow-lg">🍎</span>
      </div>
    )}

    {golden && (
      <div
        className="absolute z-10 flex items-center justify-center animate-pulse rounded-full"
        style={{ ...cellStyle(golden, grid, 0), boxShadow: '0 0 16px 4px rgba(250,204,21,.55)' }}
      >
        <span className="text-sm md:text-lg" style={{ filter: 'sepia(1) saturate(6) hue-rotate(5deg) brightness(1.15)' }}>🍎</span>
      </div>
    )}

    {children}
  </div>
);
