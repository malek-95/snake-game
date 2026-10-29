export type Language = 'fr' | 'en';

export interface Translations {
  // Header
  title: string;
  settings: string;
  
  // Scoreboard
  score: string;
  record: string;
  bonus: string;
  apples: string;
  lives: string;
  speed: string;
  mode: string;
  
  // Game modes
  classic: string;
  levels: string;
  
  // Difficulties
  easy: string;
  medium: string;
  hard: string;
  
  // Options
  wrapAround: string;
  wrapAroundOn: string;
  wrapAroundOff: string;
  disabledInLevels: string;
  
  // Board sizes
  boardSize: string;
  small: string;
  mediumSize: string;
  large: string;
  
  // Display
  display: string;
  fullscreen: string;
  exitFullscreen: string;
  
  // Game mode
  gameMode: string;
  difficulty: string;
  
  // Level progress
  level: string;
  applesProgress: string;
  
  // Lives bonus
  livesBonus: string;
  applesWord: string;
  remaining: string;
  remainingPlural: string;
  
  // Controls
  pause: string;
  restart: string;
  swipeOrButtons: string;
  arrowsOrWasd: string;
  spacePause: string;
  
  // Overlays
  snakeGame: string;
  classicDescription: string;
  levelsDescription: string;
  play: string;
  pressEnterOrSpace: string;
  paused: string;
  currentScore: string;
  resume: string;
  gameOver: string;
  applesEaten: string;
  levelReached: string;
  bonusLivesUsed: string;
  newRecord: string;
  playAgain: string;
  
  // Notifications
  bonusNotification: string;
  nextBonus: string;
  lifeLost: string;
  remaining2: string;
  lifeGained: string;
  total: string;
  totalPlural: string;
  levelComplete: string;
  levelCompleteEnd: string;
  nextLevel: string;
  nextLevelEnd: string;
  
  // Language selector
  language: string;
  french: string;
  english: string;
}

export const translations: Record<Language, Translations> = {
  fr: {
    title: '🐍 Snake',
    settings: 'Paramètres',
    score: 'Score',
    record: '🏆 Record',
    bonus: 'Bonus',
    apples: 'Pommes',
    lives: 'Vies',
    speed: 'Vitesse',
    mode: 'Mode',
    classic: '🎮 Classique',
    levels: '🏆 Niveaux',
    easy: '🐢 Facile',
    medium: '🐇 Moyen',
    hard: '⚡ Difficile',
    wrapAround: '🌀 Traversée des murs',
    wrapAroundOn: '🌀 Activé',
    wrapAroundOff: '🧱 Désactivé',
    disabledInLevels: ' (désactivé en mode niveaux)',
    boardSize: '📐 Taille du plateau',
    small: '🔹 Petit',
    mediumSize: '🔷 Moyen',
    large: '🟦 Grand',
    display: '🖥️ Affichage',
    fullscreen: '⬜ Plein écran',
    exitFullscreen: '🔲 Quitter le plein écran',
    gameMode: '🎮 Mode de jeu',
    difficulty: '⚡ Difficulté',
    level: 'Niveau',
    applesProgress: 'pommes',
    livesBonus: '💚 Vie bonus à',
    applesWord: 'pommes',
    remaining: 'restante',
    remainingPlural: 'restantes',
    pause: '⏸ Pause',
    restart: '🔄 Restart',
    swipeOrButtons: 'Glissez ou utilisez les boutons',
    arrowsOrWasd: '🎮 Flèches ou WASD pour diriger le serpent',
    spacePause: '⏸ Espace pour pause • Entrée pour démarrer',
    snakeGame: 'Jeu du Serpent',
    classicDescription: 'Dirigez le serpent pour manger les pommes. Ne touchez pas les murs ni vous-même!',
    levelsDescription: 'Traversez les niveaux avec des obstacles. Mangez assez de pommes pour avancer!',
    play: '▶ Jouer',
    pressEnterOrSpace: 'Appuyez sur Entrée ou Espace',
    paused: 'Pause',
    currentScore: 'Score actuel:',
    resume: '▶ Reprendre',
    gameOver: 'Game Over!',
    applesEaten: 'pommes mangées',
    levelReached: '🏆 Niveau atteint:',
    bonusLivesUsed: 'vies bonus utilisées',
    newRecord: '🏆 Nouveau record!',
    playAgain: '🔄 Rejouer',
    bonusNotification: '🎉 BONUS!',
    nextBonus: 'Prochain bonus:',
    lifeLost: '💔 Vie perdue!',
    remaining2: 'restantes',
    lifeGained: '💚 +1 Vie!',
    total: 'totale',
    totalPlural: 'totales',
    levelComplete: '🎊 Niveau',
    levelCompleteEnd: 'terminé!',
    nextLevel: 'Niveau',
    nextLevelEnd: '...',
    language: '🌐 Language / Langue',
    french: '🇫🇷 Français',
    english: '🇬🇧 English',
  },
  en: {
    title: '🐍 Snake',
    settings: 'Settings',
    score: 'Score',
    record: '🏆 Record',
    bonus: 'Bonus',
    apples: 'Apples',
    lives: 'Lives',
    speed: 'Speed',
    mode: 'Mode',
    classic: '🎮 Classic',
    levels: '🏆 Levels',
    easy: '🐢 Easy',
    medium: '🐇 Medium',
    hard: '⚡ Hard',
    wrapAround: '🌀 Wrap Around',
    wrapAroundOn: '🌀 Enabled',
    wrapAroundOff: '🧱 Disabled',
    disabledInLevels: ' (disabled in levels mode)',
    boardSize: '📐 Board Size',
    small: '🔹 Small',
    mediumSize: '🔷 Medium',
    large: '🟦 Large',
    display: '🖥️ Display',
    fullscreen: '⬜ Fullscreen',
    exitFullscreen: '🔲 Exit Fullscreen',
    gameMode: '🎮 Game Mode',
    difficulty: '⚡ Difficulty',
    level: 'Level',
    applesProgress: 'apples',
    livesBonus: '💚 Bonus life at',
    applesWord: 'apples',
    remaining: 'remaining',
    remainingPlural: 'remaining',
    pause: '⏸ Pause',
    restart: '🔄 Restart',
    swipeOrButtons: 'Swipe or use buttons',
    arrowsOrWasd: '🎮 Arrows or WASD to control the snake',
    spacePause: '⏸ Space to pause • Enter to start',
    snakeGame: 'Snake Game',
    classicDescription: 'Guide the snake to eat apples. Don\'t hit the walls or yourself!',
    levelsDescription: 'Navigate through levels with obstacles. Eat enough apples to advance!',
    play: '▶ Play',
    pressEnterOrSpace: 'Press Enter or Space',
    paused: 'Paused',
    currentScore: 'Current score:',
    resume: '▶ Resume',
    gameOver: 'Game Over!',
    applesEaten: 'apples eaten',
    levelReached: '🏆 Level reached:',
    bonusLivesUsed: 'bonus lives used',
    newRecord: '🏆 New record!',
    playAgain: '🔄 Play Again',
    bonusNotification: '🎉 BONUS!',
    nextBonus: 'Next bonus:',
    lifeLost: '💔 Life lost!',
    remaining2: 'remaining',
    lifeGained: '💚 +1 Life!',
    total: 'total',
    totalPlural: 'total',
    levelComplete: '🎊 Level',
    levelCompleteEnd: 'completed!',
    nextLevel: 'Level',
    nextLevelEnd: '...',
    language: '🌐 Language / Langue',
    french: '🇫🇷 Français',
    english: '🇬🇧 English',
  },
};
