import { useRef, type ReactNode } from 'react';
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

const Eyes = ({ angle, dead }: { angle: number; dead?: boolean }) => (
  <div className="absolute inset-0" style={{ transform: `rotate(${angle}deg)` }}>
    {[30, 70].map(top => (
      <span
        key={top}
        className="absolute rounded-full bg-white flex items-center justify-center"
        style={{ width: '32%', height: '32%', left: '62%', top: `${top}%`, transform: 'translate(-50%, -50%)' }}
      >
        {dead ? (
          <span className="text-[8px] md:text-[10px] leading-none font-black text-gray-900">×</span>
        ) : (
          <span className="block rounded-full bg-gray-900" style={{ width: '55%', height: '55%', transform: 'translateX(30%)' }} />
        )}
      </span>
    ))}
  </div>
);

/** A shaded sphere in `color`, for the head. */
const sphere = (color: string) =>
  `radial-gradient(circle at 35% 30%, color-mix(in srgb, ${color} 45%, white), ${color} 55%, color-mix(in srgb, ${color} 60%, black))`;

/** Body segments: a soft highlight but no dark rim, so overlapping segments merge into one tube. */
const tube = (color: string) =>
  `radial-gradient(circle at 40% 35%, color-mix(in srgb, ${color} 70%, white), ${color} 65%)`;

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
  className = '', style, children, onTouchStart, onTouchEnd, tickMs, showGrid,
}: BoardProps) => {
  // Remember each snake's previous body (only when it actually changes), so a segment that moved
  // exactly one cell glides, while wrap-arounds and respawns jump straight to their new place.
  const track = useRef<{ body: Position[]; prev: Position[] | null }[]>([]);
  snakes.forEach((s, si) => {
    const t = track.current[si];
    if (!t) track.current[si] = { body: s.body, prev: null };
    else if (t.body !== s.body) track.current[si] = { body: s.body, prev: t.body };
  });

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

    {/* Snakes: overlapping shaded spheres that taper to the tail read as one smooth glowing body. */}
    {snakes.map((snake, si) => {
      const len = snake.body.length;
      const angle = headAngle(snake.body);
      return (
        <div
          key={`snake-${si}`}
          className="absolute inset-0 z-10 pointer-events-none"
          style={{ filter: snake.dead ? 'grayscale(1) brightness(0.65)' : `drop-shadow(0 0 6px ${snake.skin.glow})` }}
        >
          {snake.body.map((seg, i) => {
            const head = i === 0;
            const before = track.current[si]?.prev?.[i];
            const glide = !!tickMs && !!before && Math.abs(before.x - seg.x) + Math.abs(before.y - seg.y) === 1;
            const size = head ? 1.35 : 1.28 - 0.3 * (len > 1 ? i / (len - 1) : 0); // overlap neighbours, taper to the tail
            return (
              <div
                key={i}
                data-cell={`${seg.x},${seg.y}`}
                className={`absolute left-0 top-0 ${head ? 'z-20' : 'z-10'}`}
                style={{
                  width: `calc(100% / ${grid.cols})`,
                  height: `calc(100% / ${grid.rows})`,
                  transform: `translate(${seg.x * 100}%, ${seg.y * 100}%)`,
                  transition: glide ? `transform ${tickMs}ms linear` : 'none',
                  zIndex: len - i, // head on top, each segment over the one behind it
                }}
              >
                <div
                  className={`absolute inset-0 rounded-full ${snake.blink ? 'animate-pulse' : ''}`}
                  style={{ transform: `scale(${size})`, background: head ? sphere(snake.skin.head) : tube(snake.skin.body(i, len)) }}
                >
                  {head && <Eyes angle={angle} dead={snake.dead} />}
                </div>
              </div>
            );
          })}
        </div>
      );
    })}

    {food && food.x >= 0 && (
      <div
        className="absolute z-10 flex items-center justify-center animate-pulse rounded-full"
        style={{ ...cellStyle(food, grid, 0), boxShadow: '0 0 14px 2px rgba(248,113,113,.45)' }}
      >
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
};
