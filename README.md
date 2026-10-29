# 🐍 Snake Game - Modern Web Application

A feature-rich, modern Snake game built with React, TypeScript, and Tailwind CSS. This project demonstrates clean architecture, type safety, and best practices for building maintainable web applications.

![Snake Game](https://img.shields.io/badge/React-18.3-green) ![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue) ![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-purple)

## 🎮 Features

### Core Gameplay
- 🎯 Classic Snake gameplay with smooth controls
- 🎮 Multiple game modes (Classic & Levels)
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

### Controls
- ⌨️ Keyboard (Arrow keys or WASD)
- 👆 Touch swipe (Mobile)
- 🎮 D-Pad buttons (Mobile)
- ⏸️ Pause/Resume functionality

### Customization
- 📐 Three board sizes (Small, Medium, Large)
- 🖥️ Fullscreen mode
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

### Automated Testing (Recommended)

```bash
# Install testing dependencies
npm install -D @testing-library/react @testing-library/jest-dom vitest

# Run tests
npm test
```

## 📚 Documentation

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Detailed architecture documentation
- **[QUICKSTART.md](./QUICKSTART.md)** - Developer quick start guide
- **[IMPROVEMENTS.md](./IMPROVEMENTS.md)** - Architecture improvements summary

## 🔮 Future Enhancements

### Planned Features
- [ ] Sound effects and music
- [ ] Achievements system
- [ ] Replay system
- [ ] Custom level editor
- [ ] Multiplayer mode
- [ ] More game modes
- [ ] Skins and themes
- [ ] Leaderboards

### Potential Improvements
- [ ] Canvas rendering for better performance
- [ ] Web Workers for game logic
- [ ] Progressive Web App (PWA)
- [ ] Mobile app (React Native)
- [ ] Backend for online features

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
