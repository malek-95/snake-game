# 🐍 Snake Game - Architecture Documentation

## Overview

A modern, feature-rich Snake game built with React, TypeScript, and Tailwind CSS. The game features multiple game modes, difficulty levels, lives system, bonus multipliers, and full internationalization support.

## Architecture

### Directory Structure

```
src/
├── components/           # UI Components (future expansion)
├── hooks/               # Custom React hooks
│   └── useSnakeGame.ts  # Main game logic hook
├── types/               # TypeScript type definitions
│   └── game.types.ts    # All game-related types
├── utils/               # Pure utility functions
│   └── game.utils.ts    # Game logic utilities
├── constants/           # Game constants and configurations
│   └── game.constants.ts # All game constants
├── i18n/               # Internationalization
│   ├── translations.ts  # Translation strings
│   ├── useTranslation.ts # Translation hook
│   └── index.ts        # Module exports
├── App.tsx             # Main application component
├── main.tsx           # Application entry point
└── index.css          # Global styles
```

### Key Design Principles

1. **Separation of Concerns**
   - Game logic is isolated in `useSnakeGame` hook
   - UI rendering is handled by React components
   - Utility functions are pure and testable
   - Types are centralized and reusable

2. **Type Safety**
   - All game entities are strongly typed
   - TypeScript interfaces for all data structures
   - Type-safe event system

3. **Performance**
   - Refs for frequently accessed values in game loop
   - Minimal re-renders with proper state management
   - Efficient collision detection

4. **Extensibility**
   - Easy to add new game modes
   - Configurable difficulty settings
   - Modular level generation system
   - Plugin-ready architecture

## Core Components

### Game State Management

The game uses a custom hook `useSnakeGame` that manages all game state:

```typescript
interface GameStateData {
  snake: Position[];
  food: Position;
  direction: Direction;
  gameState: GameState;
  score: number;
  highScore: number;
  difficulty: Difficulty;
  wrapAround: boolean;
  applesEaten: number;
  multiplier: number;
  lives: number;
  bonusLivesGiven: number;
  gameMode: GameMode;
  level: number;
  obstacles: Position[];
  levelApples: number;
  invincible: boolean;
}
```

### Game Loop

The game loop runs on a fixed interval based on difficulty:
- Easy: 160ms per tick
- Medium: 100ms per tick
- Hard: 60ms per tick

Each tick:
1. Processes direction queue
2. Calculates new head position
3. Checks collisions (walls, self, obstacles)
4. Handles food consumption
5. Updates score and bonuses
6. Checks level completion (in levels mode)

### Direction Queue System

To prevent input conflicts, directions are queued:
- Maximum 2 directions in queue
- Validated against last direction
- Consumed one per game tick
- Prevents 180° turns

## Features

### Game Modes

1. **Classic Mode**
   - Traditional snake gameplay
   - Optional wall wrap-around
   - Focus on high score

2. **Levels Mode**
   - Progressive difficulty
   - Obstacles that increase each level
   - Must eat X apples to advance
   - Speed increases with level

### Lives System

- Start with 1 life
- Gain bonus life every 30 apples (max 3 bonus lives)
- On death: respawn with same snake length
- Brief invincibility after respawn
- Game over when all lives lost

### Bonus System

- Multiplier increases every 10 apples
- Visual notifications for bonuses
- Score = base points × multiplier
- Multiplier resets on death

### Internationalization

- Full French and English support
- Easy to add new languages
- Persistent language preference
- All UI text is translatable

## Configuration

### Game Constants

Located in `src/constants/game.constants.ts`:

```typescript
export const GRID_SIZE = 20;
export const SPEED_CONFIG = { easy: 160, medium: 100, hard: 60 };
export const SCORE_CONFIG = { easy: 5, medium: 10, hard: 20 };
export const BONUS_CONFIG = {
  multiplierEvery: 10,
  lifeEvery: 30,
  maxBonusLives: 3,
};
```

### Level Generation

Levels are procedurally generated in `src/utils/game.utils.ts`:
- Level 1: Simple corners (6 obstacles)
- Level 2: Horizontal walls (14 obstacles)
- Level 3: Vertical walls + corners (16 obstacles)
- Level 4: Cross pattern (16 obstacles)
- Level 5: Diagonal walls (20 obstacles)
- Level 6+: Random obstacles (+4 per level, max 25)

## Extension Guide

### Adding a New Game Mode

1. Add mode type to `src/types/game.types.ts`:
```typescript
export type GameMode = 'classic' | 'levels' | 'your-new-mode';
```

2. Update `useSnakeGame` hook to handle new mode logic

3. Add UI controls in `App.tsx`

4. Add translations to `src/i18n/translations.ts`

### Adding New Power-ups

1. Define power-up type in `src/types/game.types.ts`:
```typescript
export interface PowerUp {
  type: 'speed' | 'slow' | 'double-points' | 'shield';
  position: Position;
  duration: number;
}
```

2. Add power-up generation logic in `useSnakeGame`

3. Handle power-up collection in `moveSnake` function

4. Add visual rendering in `App.tsx`

### Adding New Languages

1. Add language code to `src/types/game.types.ts`:
```typescript
export type Language = 'fr' | 'en' | 'your-language';
```

2. Add translations to `src/i18n/translations.ts`:
```typescript
export const translations: Record<Language, Translations> = {
  // ... existing languages
  'your-language': {
    title: 'Your Title',
    // ... all translation keys
  }
};
```

### Customizing Difficulty

Edit `src/constants/game.constants.ts`:

```typescript
export const SPEED_CONFIG: Record<Difficulty, number> = {
  easy: 200,    // Slower
  medium: 120,  // Medium
  hard: 50,     // Faster
};

export const SCORE_CONFIG: Record<Difficulty, number> = {
  easy: 3,      // Less points
  medium: 10,   // Standard
  hard: 25,     // More points
};
```

## Performance Tips

1. **Avoid unnecessary re-renders**
   - Use refs for values accessed in game loop
   - Memoize expensive calculations
   - Use `useCallback` for event handlers

2. **Efficient collision detection**
   - Use array methods instead of nested loops
   - Early return on collision found
   - Exclude tail from collision check when moving

3. **Minimize DOM updates**
   - Use CSS transforms for animations
   - Batch state updates
   - Use `key` prop correctly for lists

## Testing Strategy

### Unit Tests (Recommended)

```typescript
// Test utility functions
describe('getRandomPosition', () => {
  it('should not return position occupied by snake', () => {
    const snake = [{ x: 5, y: 5 }];
    const pos = getRandomPosition(snake, []);
    expect(pos).not.toEqual(snake[0]);
  });
});

// Test game logic
describe('useSnakeGame', () => {
  it('should increase score when eating food', () => {
    // Test implementation
  });
});
```

### Manual Testing Checklist

- [ ] Snake moves in all directions
- [ ] Can't make 180° turns
- [ ] Game over on wall collision (classic mode)
- [ ] Wall wrap-around works correctly
- [ ] Lives system works (death, respawn, game over)
- [ ] Bonus multiplier increases correctly
- [ ] Level progression works
- [ ] Obstacles don't spawn in safe zone
- [ ] Language switching works
- [ ] Settings persist across sessions
- [ ] Fullscreen mode works
- [ ] Mobile controls work (swipe + D-pad)
- [ ] Keyboard controls work
- [ ] Pause/resume works correctly

## Future Enhancements

### Potential Features

1. **Multiplayer Mode**
   - Local 2-player split screen
   - Online multiplayer with WebSockets

2. **Custom Levels**
   - Level editor
   - Share levels via URL
   - Community levels

3. **Achievements System**
   - Track milestones
   - Unlock rewards
   - Social sharing

4. **Sound Effects**
   - Background music
   - Sound effects for actions
   - Volume controls

5. **Skins/Themes**
   - Different snake designs
   - Board themes
   - Custom colors

6. **Replay System**
   - Record gameplay
   - Share replays
   - Analyze performance

## Browser Support

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support
- Mobile browsers: ✅ Full support with touch controls

## Performance Metrics

Target performance:
- 60 FPS on modern devices
- < 100ms input latency
- < 50MB memory usage
- < 2s initial load time

## Contributing

When extending the game:

1. Follow TypeScript best practices
2. Keep functions pure when possible
3. Add types for all new features
4. Update translations for new UI text
5. Test on multiple screen sizes
6. Document new features in this README

## License

This project is open source and available for educational purposes.

---

**Built with ❤️ using React, TypeScript, and Tailwind CSS**
