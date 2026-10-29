# 🚀 Quick Start Guide

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Modern web browser

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure Overview

```
snake-game/
├── src/
│   ├── App.tsx              # Main UI component
│   ├── main.tsx             # Entry point
│   ├── index.css            # Global styles
│   ├── hooks/
│   │   └── useSnakeGame.ts  # Game logic (THE BRAIN)
│   ├── types/
│   │   └── game.types.ts    # TypeScript definitions
│   ├── utils/
│   │   └── game.utils.ts    # Helper functions
│   ├── constants/
│   │   └── game.constants.ts # Game configuration
│   └── i18n/
│       ├── translations.ts  # All text strings
│       ├── useTranslation.ts # Translation hook
│       └── index.ts         # Module exports
├── ARCHITECTURE.md          # Detailed architecture docs
└── package.json
```

## Understanding the Code

### 1. Game Logic (`src/hooks/useSnakeGame.ts`)

This is the core of the game. It manages:
- Snake movement and growth
- Collision detection
- Score calculation
- Lives system
- Level progression
- All game state

**Key functions:**
- `moveSnake()` - Main game loop logic
- `handleDeath()` - Death and respawn logic
- `startGame()` - Initialize new game
- `changeDirection()` - Handle player input

### 2. UI Component (`src/App.tsx`)

Handles all visual rendering:
- Game board
- Snake and food rendering
- Overlays (start, pause, game over)
- Controls (keyboard, touch, D-pad)
- Settings modal
- Notifications

### 3. Types (`src/types/game.types.ts`)

Defines all TypeScript interfaces:
- `Position` - x, y coordinates
- `Direction` - UP, DOWN, LEFT, RIGHT
- `GameState` - idle, playing, paused, gameover
- `GameMode` - classic, levels
- Event types for notifications

### 4. Utilities (`src/utils/game.utils.ts`)

Pure functions for game logic:
- `getRandomPosition()` - Find safe random spot
- `getNextPosition()` - Calculate next move
- `generateLevelConfig()` - Create level obstacles
- `findSafeSpawnPosition()` - Find respawn location

### 5. Constants (`src/constants/game.constants.ts`)

All configurable values:
- Grid size (20x20)
- Speed settings per difficulty
- Score values
- Bonus thresholds
- Initial snake position

### 6. Internationalization (`src/i18n/`)

Multi-language support:
- `translations.ts` - All text in FR/EN
- `useTranslation.ts` - Hook for accessing translations
- Easy to add new languages

## Common Tasks

### Change Grid Size

Edit `src/constants/game.constants.ts`:
```typescript
export const GRID_SIZE = 25; // Change from 20 to 25
```

### Adjust Game Speed

Edit `src/constants/game.constants.ts`:
```typescript
export const SPEED_CONFIG: Record<Difficulty, number> = {
  easy: 200,    // Slower (higher = slower)
  medium: 100,
  hard: 50,     // Faster (lower = faster)
};
```

### Change Bonus Thresholds

Edit `src/constants/game.constants.ts`:
```typescript
export const BONUS_CONFIG = {
  multiplierEvery: 15,  // Multiplier every 15 apples
  lifeEvery: 25,        // Life every 25 apples
  maxBonusLives: 5,     // Max 5 bonus lives
};
```

### Add New Difficulty

1. Update `src/types/game.types.ts`:
```typescript
export type Difficulty = 'easy' | 'medium' | 'hard' | 'extreme';
```

2. Update `src/constants/game.constants.ts`:
```typescript
export const SPEED_CONFIG: Record<Difficulty, number> = {
  easy: 160,
  medium: 100,
  hard: 60,
  extreme: 30, // New difficulty
};

export const SCORE_CONFIG: Record<Difficulty, number> = {
  easy: 5,
  medium: 10,
  hard: 20,
  extreme: 50, // New difficulty
};
```

3. Add UI button in `src/App.tsx` settings modal

4. Add translation in `src/i18n/translations.ts`

### Modify Level Design

Edit `src/utils/game.utils.ts` → `generateLevelConfig()`:

```typescript
// Example: Add circular pattern for level 7
if (level >= 7) {
  const radius = 6;
  for (let angle = 0; angle < 360; angle += 30) {
    const rad = (angle * Math.PI) / 180;
    const x = Math.round(center + radius * Math.cos(rad));
    const y = Math.round(center + radius * Math.sin(rad));
    addObstacle(x, y);
  }
}
```

### Add New Game Mode

1. Add type in `src/types/game.types.ts`:
```typescript
export type GameMode = 'classic' | 'levels' | 'maze';
```

2. Update `useSnakeGame` hook:
```typescript
// Add mode-specific logic in moveSnake()
if (gameModeRef.current === 'maze') {
  // Maze-specific collision detection
}
```

3. Add UI in `src/App.tsx`

4. Add translations

## Debugging Tips

### View Game State

Add this to `useSnakeGame` hook:
```typescript
useEffect(() => {
  console.log('Game State:', {
    snake: snake.length,
    score,
    lives,
    level,
    direction,
  });
}, [snake, score, lives, level, direction]);
```

### Test Collision Detection

In `src/utils/game.utils.ts`, add logging:
```typescript
export const collidesWithSnake = (pos: Position, snake: Position[]) => {
  const collision = snake.some(segment => 
    segment.x === pos.x && segment.y === pos.y
  );
  if (collision) {
    console.log('Collision at:', pos);
  }
  return collision;
};
```

### Performance Monitoring

Add FPS counter in `App.tsx`:
```typescript
const [fps, setFps] = useState(0);
useEffect(() => {
  let frameCount = 0;
  const interval = setInterval(() => {
    setFps(frameCount);
    frameCount = 0;
  }, 1000);
  
  const loop = () => {
    frameCount++;
    requestAnimationFrame(loop);
  };
  loop();
  
  return () => clearInterval(interval);
}, []);
```

## Testing Your Changes

### Manual Testing Checklist

After making changes, verify:

- [ ] Game starts correctly
- [ ] Snake moves smoothly
- [ ] Food spawns in valid locations
- [ ] Collisions work (walls, self, obstacles)
- [ ] Score increases correctly
- [ ] Lives system works
- [ ] Bonuses trigger at right times
- [ ] Levels progress correctly
- [ ] Settings persist
- [ ] Language switching works
- [ ] Mobile controls work
- [ ] Keyboard controls work
- [ ] Pause/resume works
- [ ] Game over screen shows
- [ ] Restart works

### Browser Testing

Test on:
- Desktop Chrome
- Desktop Firefox
- Desktop Safari
- Mobile Chrome (Android)
- Mobile Safari (iOS)

### Screen Size Testing

Test with:
- Mobile portrait (320px)
- Mobile landscape (640px)
- Tablet (768px)
- Desktop (1920px)
- Fullscreen mode

## Common Issues

### Snake Teleports Through Walls

**Problem:** Wrap-around not working correctly

**Solution:** Check `wrapPosition()` in `src/utils/game.utils.ts`:
```typescript
export const wrapPosition = (pos: Position): Position => {
  return {
    x: (pos.x + GRID_SIZE) % GRID_SIZE,
    y: (pos.y + GRID_SIZE) % GRID_SIZE,
  };
};
```

### Game Runs Too Fast/Slow

**Problem:** Speed settings not applied

**Solution:** Check `startGameLoop()` in `useSnakeGame.ts`:
```typescript
const actualSpeed = Math.max(40, baseSpeed / speedMultiplier);
gameLoopRef.current = window.setInterval(moveSnake, actualSpeed);
```

### Obstacles Spawn on Snake

**Problem:** Level generation places obstacles in spawn zone

**Solution:** Check `isSafePosition()` in `src/utils/game.utils.ts`:
```typescript
export const isSafePosition = (x: number, y: number, center: number): boolean => {
  return !(x >= center - 5 && x <= center + 2 && y >= center - 2 && y <= center + 2);
};
```

### Translations Not Updating

**Problem:** UI text doesn't change when language switches

**Solution:** Ensure you're using the `t()` function from `useTranslation` hook:
```typescript
const { t } = useTranslation();
<h1>{t('title')}</h1> // ✅ Correct
<h1>Title</h1>        // ❌ Wrong - hardcoded
```

## Next Steps

1. Read `ARCHITECTURE.md` for detailed design documentation
2. Explore the code in this order:
   - `src/constants/game.constants.ts` (configuration)
   - `src/types/game.types.ts` (data structures)
   - `src/utils/game.utils.ts` (helper functions)
   - `src/hooks/useSnakeGame.ts` (game logic)
   - `src/App.tsx` (UI rendering)
3. Try making small changes and testing
4. Gradually work up to larger features

## Resources

- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [React Hooks Guide](https://react.dev/reference/react)

## Need Help?

1. Check `ARCHITECTURE.md` for detailed explanations
2. Look at inline code comments
3. Review TypeScript types for understanding data flow
4. Check browser console for errors
5. Add console.log statements for debugging

---

**Happy coding! 🎮🐍**
