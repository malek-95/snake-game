import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import type { Grid, Position } from '../types/game.types';
import type { Skin, Theme } from '../features/look';

export interface BoardSnake {
  body: Position[];
  skin: Skin;
  blink?: boolean;
  dead?: boolean;
  /** Power-up effect: see-through ghost or icy frozen snake. */
  effect?: 'ghost' | 'frozen';
}

interface BoardProps {
  grid: Grid;
  theme: Theme;
  snakes: BoardSnake[];
  food: Position | null;
  golden?: Position | null;
  /** Extra pick-ups shown as glowing icons (online power-ups). */
  items?: { pos: Position; emoji: string }[];
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
  /** Length of one game tick: when set, snakes glide from cell to cell instead of jumping. */
  tickMs?: number;
  /** Draw cell lines (the level editor needs them to place walls). */
  showGrid?: boolean;
}

/** A layer of stars as CSS gradients placed in %, so they scale with any board size. */
const starLayer = (count: number, seed: number) => {
  let s = seed;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  return Array.from({ length: count }, () => {
    const size = rnd() < 0.8 ? 1.2 : 2.2;
    const alpha = (0.35 + rnd() * 0.65).toFixed(2);
    return `radial-gradient(${size}px ${size}px at ${(rnd() * 100).toFixed(1)}% ${(rnd() * 100).toFixed(1)}%, rgba(255,255,255,${alpha}), transparent)`;
  }).join(',');
};
const FAR_STARS = starLayer(90, 7);
const NEAR_STARS = starLayer(28, 42);

/** Which way the head faces, as a rotation; a step longer than one cell means it just wrapped. */
const headAngle = (body: Position[]) => {
  if (body.length < 2) return 0;
  let dx = body[0].x - body[1].x;
  let dy = body[0].y - body[1].y;
  if (Math.abs(dx) > 1) dx = -Math.sign(dx);
  if (Math.abs(dy) > 1) dy = -Math.sign(dy);
  return dx === 1 ? 0 : dx === -1 ? 180 : dy === 1 ? 90 : -90;
};

/**
 * One snake drawn as a single smooth line through its segments, recomputed every animation frame
 * while it moves, so the body bends naturally around corners and stays in one piece.
 */
const SnakeLayer = ({ snake, grid, tickMs }: { snake: BoardSnake; grid: Grid; tickMs?: number }) => {
  const move = useRef<{ from: Position[] | null; to: Position[]; at: number }>({ from: null, to: snake.body, at: 0 });
  if (move.current.to !== snake.body) move.current = { from: move.current.to, to: snake.body, at: performance.now() };

  // Redraw on every frame until this move is finished, then rest.
  const [, setFrame] = useState(0);
  useEffect(() => {
    if (!tickMs) return;
    let raf = 0;
    const loop = () => {
      setFrame(f => f + 1);
      if (performance.now() - move.current.at < tickMs) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [snake.body, tickMs]);

  const { from, to, at } = move.current;
  const t = tickMs ? Math.min(1, (performance.now() - at) / tickMs) : 1;
  // Each segment slides from where it was to where it is; new tail pieces, wrap-arounds and respawns don't slide.
  const pts = to.map((p, i) => {
    const q = from?.[i];
    const slides = !!q && Math.abs(q.x - p.x) + Math.abs(q.y - p.y) === 1;
    return slides ? { x: q.x + (p.x - q.x) * t + 0.5, y: q.y + (p.y - q.y) * t + 0.5 } : { x: p.x + 0.5, y: p.y + 0.5 };
  });

  const len = to.length;
  const width = (i: number) => 0.7 - 0.32 * (len > 1 ? i / (len - 1) : 0); // slim, tapering to the tail
  const { skin, dead, effect } = snake;
  const head = pts[0];
  const gradient = `head${useId().replace(/:/g, '')}`; // unique even with several boards on screen

  return (
    <svg
      className={`absolute inset-0 w-full h-full pointer-events-none z-10 ${snake.blink ? 'animate-pulse' : ''}`}
      viewBox={`0 0 ${grid.cols} ${grid.rows}`}
      preserveAspectRatio="none"
      style={{
        overflow: 'visible',
        opacity: effect === 'ghost' ? 0.45 : 1,
        filter: dead ? 'grayscale(1) brightness(0.65)'
          : effect === 'frozen' ? 'saturate(0.25) brightness(1.35) drop-shadow(0 0 6px #7dd3fc)'
          : `drop-shadow(0 0 6px ${skin.glow})`,
      }}
    >
      <defs>
        <radialGradient id={gradient} cx="35%" cy="30%" r="75%">
          <stop offset="0%" style={{ stopColor: `color-mix(in srgb, ${skin.head} 45%, white)` }} />
          <stop offset="55%" style={{ stopColor: skin.head }} />
          <stop offset="100%" style={{ stopColor: `color-mix(in srgb, ${skin.head} 60%, black)` }} />
        </radialGradient>
      </defs>
      {/* Tail first, so pieces nearer the head are drawn on top. */}
      {pts.slice(1).map((b, k) => {
        const a = pts[k];
        if (Math.abs(a.x - b.x) + Math.abs(a.y - b.y) > 1.5) return null; // wrapped: no line across the board
        return <line key={k} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={skin.body(k + 1, len)} strokeWidth={width(k + 1)} strokeLinecap="round" />;
      }).reverse()}
      <g data-cell={`${to[0].x},${to[0].y}`} className="z-20" transform={`translate(${head.x} ${head.y}) rotate(${headAngle(to)})`}>
        <circle r={0.45} fill={`url(#${gradient})`} />
        {[-0.18, 0.18].map(ey => (
          <g key={ey}>
            <circle cx={0.14} cy={ey} r={0.14} fill="white" />
            {dead ? (
              <path d={`M${0.07} ${ey - 0.07}L${0.21} ${ey + 0.07}M${0.21} ${ey - 0.07}L${0.07} ${ey + 0.07}`} stroke="#111827" strokeWidth={0.045} />
            ) : (
              <circle cx={0.19} cy={ey} r={0.075} fill="#111827" />
            )}
          </g>
        ))}
      </g>
    </svg>
  );
};

/** Absolute position for cell p as % of the board, inset by `gap` px on each side. */
export const cellStyle = (p: Position, grid: Grid, gap = 1): React.CSSProperties => ({
  left: `calc(${p.x} * 100% / ${grid.cols} + ${gap}px)`,
  top: `calc(${p.y} * 100% / ${grid.rows} + ${gap}px)`,
  width: `calc(100% / ${grid.cols} - ${gap * 2}px)`,
  height: `calc(100% / ${grid.rows} - ${gap * 2}px)`,
});

/** Renders the playing field: grid lines, walls, apples and any number of snakes. */
export const Board = ({
  grid, theme, snakes, food, golden, items, obstacles, shaded, accentBorder, wrapGlow,
  className = '', style, children, onTouchStart, onTouchEnd, tickMs, showGrid,
}: BoardProps) => {
  return (
  <div
    className={`relative @container rounded-2xl border-2 overflow-hidden shadow-2xl ${className}`}
    style={{ background: theme.board, borderColor: accentBorder ? 'rgba(168,85,247,.6)' : theme.border, ...style }}
    onTouchStart={onTouchStart}
    onTouchEnd={onTouchEnd}
  >
    {/* Deep space: distant stars, and nearer ones that twinkle. */}
    <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: FAR_STARS, opacity: 0.7 }} />
    <div className="absolute inset-0 pointer-events-none animate-twinkle" style={{ backgroundImage: NEAR_STARS }} />

    {showGrid && (
      <div
        className="absolute inset-0"
        style={{
          opacity: theme.gridOpacity * 2,
          backgroundImage: `linear-gradient(to right, ${theme.grid} 1px, transparent 1px), linear-gradient(to bottom, ${theme.grid} 1px, transparent 1px)`,
          backgroundSize: `calc(100% / ${grid.cols}) calc(100% / ${grid.rows})`,
        }}
      />
    )}

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

    {/* Walls are asteroids. */}
    {obstacles.map(p => (
      <div
        key={`obs-${p.x}-${p.y}`}
        className="absolute rounded-[42%_58%_46%_54%]"
        style={{
          ...cellStyle(p, grid),
          background: 'radial-gradient(circle at 35% 30%, #a8a29e, #57534e 55%, #1c1917)',
          boxShadow: 'inset -2px -2px 4px rgba(0,0,0,.55), 0 0 6px rgba(0,0,0,.6)',
        }}
      />
    ))}

    {snakes.map((snake, si) => (
      <SnakeLayer key={si} snake={snake} grid={grid} tickMs={tickMs} />
    ))}

    {food && food.x >= 0 && (
      <div
        className="absolute z-10 flex items-center justify-center animate-pulse rounded-full"
        style={{ ...cellStyle(food, grid, 0), boxShadow: '0 0 14px 2px rgba(248,113,113,.45)' }}
      >
        <span className="text-sm md:text-lg drop-shadow-lg">🍎</span>
      </div>
    )}

    {items?.map(item => (
      <div
        key={`item-${item.pos.x}-${item.pos.y}`}
        className="absolute z-10 flex items-center justify-center animate-pulse rounded-full"
        style={{ ...cellStyle(item.pos, grid, 0), boxShadow: '0 0 14px 3px rgba(129,140,248,.55)', background: 'rgba(129,140,248,.18)' }}
      >
        <span className="text-sm md:text-lg">{item.emoji}</span>
      </div>
    ))}

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
};
