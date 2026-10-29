# 🐍 Snake Game - Modern Web Application

A feature-rich, modern Snake game built with React, TypeScript, and Tailwind CSS. This project demonstrates clean architecture, type safety, and best practices for building maintainable web applications.

![Snake Game](https://img.shields.io/badge/React-18.3-green) ![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue) ![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-purple)

## 🎮 Features

### Core Gameplay
- 🎯 Classic Snake gameplay with smooth controls
- 🎮 Seven game modes: Classic, Levels, Time attack, Survival, Zen, Golden apples and Custom levels
- 👥 Local 2-player mode on one keyboard
- 🌐 Online 2-player with room codes and invite links
- 🌍 World leaderboard
- ⚡ Three difficulty levels (Easy, Medium, Hard)
- 🔄 Wall wrap-around option
- 📱 Responsive design (Desktop & Mobile)

### Advanced Features
- ❤️ Lives system with bonus lives
- ✨ Score multiplier bonuses
- 🏆 High score tracking (localStorage)
- 🎊 Level progression with obstacles
- 🛡️ Invincibility after death
- 🌐 Full internationalization (French & English)
- 🔊 Sound effects and music, generated in the browser (no audio files)
- 🎖️ 17 achievements, some unlocking new snake skins
- 🏅 Top 10 leaderboard per mode and difficulty (saved on this device)
- 🎬 Replays of your last and best game
- ✏️ Level editor: draw walls, save levels, play them

### Controls
- ⌨️ Keyboard (Arrow keys or WASD)
- 👆 Touch swipe (Mobile)
- 🎮 D-Pad buttons (Mobile)
- ⏸️ Pause/Resume functionality

### Customization
- 📐 Three board sizes (Small, Medium, Large)
- 🖥️ Fullscreen mode
- 📲 Installable app that works offline (PWA)
- 🎨 7 snake skins and 5 color themes
- 🎨 Modern UI with animations
- ⚙️ Comprehensive settings menu

## 🏗️ Architecture

This project follows a clean, modular architecture:

```
src/
├── components/           # UI Components (future)
├── hooks/               # Custom React hooks
│   └── useSnakeGame.ts  # Game logic
├── types/               # TypeScript definitions
│   └── game.types.ts    # All types
├── utils/               # Pure utility functions
│   └── game.utils.ts    # Game helpers
├── constants/           # Configuration
│   └── game.constants.ts # Game settings
├── i18n/               # Internationalization
│   ├── translations.ts  # Translation strings
│   └── useTranslation.ts # Translation hook
└── App.tsx             # Main UI component
```

### Key Design Principles
- ✅ **Separation of Concerns** - Logic, UI, and data are separate
- ✅ **Type Safety** - Full TypeScript coverage
- ✅ **Testability** - Pure functions and clear interfaces
- ✅ **Performance** - Optimized game loop with refs
- ✅ **Maintainability** - Clean, documented code

📖 **Read more:** [ARCHITECTURE.md](./ARCHITECTURE.md) | [IMPROVEMENTS.md](./IMPROVEMENTS.md)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd snake-game

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Development

```bash
# Start dev server with hot reload
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

📖 **Developer guide:** [QUICKSTART.md](./QUICKSTART.md)

## 🌐 Online Features (Supabase)

Online 2-player and the world leaderboard run on [Supabase](https://supabase.com) (free tier is plenty).
Without it configured, the game works as before and the online buttons are hidden.

### Local development

Needs Docker running.

```bash
npx supabase start   # starts Postgres + Realtime and applies supabase/migrations
npx supabase status -o env   # copy API_URL and ANON_KEY into .env.local (see .env.example)
npm run dev
```

With `.env.local` set, `npm test` also runs the live tests against your local backend
(score storage and the security rules, room joining, messaging, "room full" and "not found").

### Cloud project

1. Create a free project at supabase.com.
2. Link and push the database schema:
   ```bash
   npx supabase login
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push
   ```
3. Copy the **Project URL** and the **anon / publishable key** (Project Settings → API).
   Both are public by design; the database rules only allow reading scores and adding valid ones.
   Never put the `service_role` / secret key in the app.
4. For local use, put them in `.env.local`. For the hosted site, add them as **repository variables**
   (GitHub → Settings → Secrets and variables → Actions → Variables): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.

### How online play works

- The host creates a room and shares its 4-letter code or invite link (`…/?room=ABCD`).
- The host's browser runs the match and broadcasts each tick over Supabase Realtime; the guest sends its turns.
- Online matches use a fixed 30×20 board so both players see the same game, and work with swipe and D-pad on phones.

### Known limits

- Scores are reported by the browser, so a determined player could post a fake one.
- The guest sees moves about half a round-trip later than the host.
- The free Supabase tier allows 2 million realtime messages a month (a 3-minute match uses about 3,600).

## 🚢 Deployment

Every push to `master` runs the tests and deploys to **GitHub Pages** (`.github/workflows/deploy.yml`).
Pull requests run typecheck, tests and a build (`.github/workflows/ci.yml`).

## 🎯 How to Play

### Desktop
1. Press **Space** or **Enter** to start
2. Use **Arrow Keys** or **WASD** to control the snake
3. Press **Space** to pause/resume
4. Eat 🍎 apples to grow and score points

### Mobile
1. Tap **▶ Play** to start
2. **Swipe** in any direction to move
3. Use **D-Pad buttons** for precise control
4. Tap **⏸ Pause** to pause the game

### Game Modes

#### Classic Mode
- Traditional snake gameplay
- Optional wall wrap-around
- Focus on high score

#### Levels Mode
- Progressive difficulty
- Navigate through obstacles
- Eat X apples to advance
- Speed increases each level

#### Time Attack
- Eat as many apples as you can in 2 minutes

#### Survival
- Every apple makes the snake faster

#### Zen
- No game over: walls wrap, and biting yourself cuts off your tail
- Press **End game** when you're done

#### Golden Apples
- Classic, plus rare golden apples worth 5x that fade after a few seconds

#### Custom
- Play a level you drew in the editor (✏️ button)

#### 2 Players
- Player 1: **W A S D** (Z Q S D on AZERTY keyboards), Player 2: **arrow keys**
- Crash into a wall, yourself or the other snake and you lose the round
- First to 3 rounds wins the match

#### Online
- Play a friend on another device: create a room and share the code or link, or join with a friend's code
- Arrow keys, WASD, swipe or the on-screen D-pad

### Scoring
- **Easy:** 5 points per apple
- **Medium:** 10 points per apple
- **Hard:** 20 points per apple
- **Bonus:** Multiplier increases every 10 apples
- **Lives:** Extra life every 30 apples (max 3 bonus)

## 🛠️ Configuration

All game settings are in `src/constants/game.constants.ts`:

```typescript
// Grid size
export const GRID_SIZE = 20;

// Speed (ms per tick)
export const SPEED_CONFIG = {
  easy: 160,
  medium: 100,
  hard: 60,
};

// Score per apple
export const SCORE_CONFIG = {
  easy: 5,
  medium: 10,
  hard: 20,
};

// Bonus thresholds
export const BONUS_CONFIG = {
  multiplierEvery: 10,
  lifeEvery: 30,
  maxBonusLives: 3,
};
```

## 🌐 Internationalization

The game supports multiple languages:

### Adding a New Language

1. Update `src/types/game.types.ts`:
```typescript
export type Language = 'fr' | 'en' | 'your-language';
```

2. Add translations to `src/i18n/translations.ts`:
```typescript
export const translations: Record<Language, Translations> = {
  'your-language': {
    title: 'Your Title',
    // ... all translation keys
  }
};
```

Current languages:
- 🇫🇷 French (Français)
- 🇬🇧 English

## 📱 Browser Support

- ✅ Chrome/Edge (Latest)
- ✅ Firefox (Latest)
- ✅ Safari (Latest)
- ✅ Mobile browsers (iOS & Android)

## 🧪 Testing

### Manual Testing Checklist

- [ ] Snake moves in all directions
- [ ] Can't make 180° turns
- [ ] Game over on collision
- [ ] Lives system works
- [ ] Bonuses trigger correctly
- [ ] Level progression works
- [ ] Settings persist
- [ ] Language switching works
- [ ] Mobile controls work
- [ ] Fullscreen mode works

### Automated Testing

```bash
npm test
```

Covers the game rules and every mode, the 2-player rules, leaderboard ranking,
achievements, replay encoding, custom level validation and storage fallbacks.

## 📚 Documentation

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Detailed architecture documentation
- **[QUICKSTART.md](./QUICKSTART.md)** - Developer quick start guide
- **[IMPROVEMENTS.md](./IMPROVEMENTS.md)** - Architecture improvements summary

## 🔮 Future Enhancements

### Planned Features
- [x] Sound effects and music
- [x] Achievements system
- [x] Replay system
- [x] Custom level editor
- [x] Multiplayer mode (local, 2 players)
- [x] More game modes
- [x] Skins and themes
- [x] Leaderboards (on this device)
- [ ] Online multiplayer and global leaderboards (need a backend)

### Potential Improvements
- [x] Progressive Web App (PWA): installable, works offline
- [x] Backend for online features (global leaderboard, online 2-player) with Supabase
- [ ] Canvas rendering: only worth it if very long snakes ever feel slow; the HTML board is fast enough today
- Not planned:
  - Web Workers for game logic: a tick takes microseconds, so a worker would only add input lag
  - React Native app: the PWA already installs on phones; wrap it with Capacitor if app-store listings are ever needed

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Follow the existing code style
4. Add types for new features
5. Update translations for new UI text
6. Test on multiple browsers/devices
7. Commit your changes (`git commit -m 'Add amazing feature'`)
8. Push to the branch (`git push origin feature/amazing-feature`)
9. Open a Pull Request

### Code Style
- Use TypeScript for all new code
- Follow existing naming conventions
- Add JSDoc comments for public functions
- Keep functions pure when possible
- Update documentation

## 📄 License

This project is open source and available for educational purposes.

## 🙏 Acknowledgments

- Built with [React](https://react.dev)
- Styled with [Tailwind CSS](https://tailwindcss.com)
- Type-safe with [TypeScript](https://www.typescriptlang.org)
- Bundled with [Vite](https://vitejs.dev)

## 📞 Support

For questions, issues, or feature requests:
- Open an issue on GitHub
- Check existing documentation
- Review the architecture docs

## 🌟 Star History

If you find this project useful, consider giving it a star! ⭐

---

**Built with ❤️ using React, TypeScript, and Tailwind CSS**

**Version:** 2.0.0  
**Last Updated:** 2024  
**Status:** ✅ Production Ready
