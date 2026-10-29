export type Language = 'fr' | 'en';

export const translations = {
  fr: {
    // Header
    title: '🐍 Snake',
    settings: 'Paramètres',
    
    // Scoreboard
    score: 'Score',
    record: '🏆 Record',
    bonus: 'Bonus',
    apples: 'Pommes',
    lives: 'Vies',
    speed: 'Vitesse',
    mode: 'Mode',
    
    // Game modes
    classic: '🎮 Classique',
    levels: '🏆 Niveaux',
    
    // Difficulties
    easy: '🐢 Facile',
    medium: '🐇 Moyen',
    hard: '⚡ Difficile',
    
    // Options
    wrapAround: '🌀 Traversée des murs',
    wrapAroundOn: '🌀 Activé',
    wrapAroundOff: '🧱 Désactivé',
    disabledInLevels: ' (désactivé en mode niveaux)',
    
    // Board sizes
    boardSize: '📐 Taille du plateau',
    small: '🔹 Petit',
    mediumSize: '🔷 Moyen',
    large: '🟦 Grand',
    
    // Display
    display: '🖥️ Affichage',
    fullscreen: '⬜ Plein écran',
    exitFullscreen: '🔲 Quitter le plein écran',
    
    // Game mode
    gameMode: '🎮 Mode de jeu',
    difficulty: '⚡ Difficulté',
    
    // Level progress
    level: 'Niveau',
    applesProgress: 'pommes',
    
    // Lives bonus
    livesBonus: '💚 Vie bonus à',
    applesWord: 'pommes',
    remaining: 'restante',
    remainingPlural: 'restantes',
    
    // Controls
    pause: '⏸ Pause',
    restart: '🔄 Restart',
    swipeOrButtons: 'Glissez ou utilisez les boutons',
    arrowsOrWasd: '🎮 Flèches ou WASD pour diriger le serpent',
    spacePause: '⏸ Espace pour pause • Entrée pour démarrer',
    
    // Overlays
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
    
    // Notifications
    bonusNotification: '🎉 BONUS!',
    lifeLost: '💔 Vie perdue!',
    remaining2: 'restantes',
    lifeGained: '💚 +1 Vie!',
    total: 'totale',
    totalPlural: 'totales',
    levelComplete: '🎊 Niveau',
    levelCompleteEnd: 'terminé!',
    nextLevel: 'Niveau',
    nextLevelEnd: '...',
  },
  en: {
    // Header
    title: '🐍 Snake',
    settings: 'Settings',
    
    // Scoreboard
    score: 'Score',
    record: '🏆 Record',
    bonus: 'Bonus',
    apples: 'Apples',
    lives: 'Lives',
    speed: 'Speed',
    mode: 'Mode',
    
    // Game modes
    classic: '🎮 Classic',
    levels: '🏆 Levels',
    
    // Difficulties
    easy: '🐢 Easy',
    medium: '🐇 Medium',
    hard: '⚡ Hard',
    
    // Options
    wrapAround: '🌀 Wrap Around',
    wrapAroundOn: '🌀 Enabled',
    wrapAroundOff: '🧱 Disabled',
    disabledInLevels: ' (disabled in levels mode)',
    
    // Board sizes
    boardSize: '📐 Board Size',
    small: '🔹 Small',
    mediumSize: '🔷 Medium',
    large: '🟦 Large',
    
    // Display
    display: '🖥️ Display',
    fullscreen: '⬜ Fullscreen',
    exitFullscreen: '🔲 Exit Fullscreen',
    
    // Game mode
    gameMode: '🎮 Game Mode',
    difficulty: '⚡ Difficulty',
    
    // Level progress
    level: 'Level',
    applesProgress: 'apples',
    
    // Lives bonus
    livesBonus: '💚 Bonus life at',
    applesWord: 'apples',
    remaining: 'remaining',
    remainingPlural: 'remaining',
    
    // Controls
    pause: '⏸ Pause',
    restart: '🔄 Restart',
    swipeOrButtons: 'Swipe or use buttons',
    arrowsOrWasd: '🎮 Arrows or WASD to control the snake',
    spacePause: '⏸ Space to pause • Enter to start',
    
    // Overlays
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
    
    // Notifications
    bonusNotification: '🎉 BONUS!',
    lifeLost: '💔 Life lost!',
    remaining2: 'remaining',
    lifeGained: '💚 +1 Life!',
    total: 'total',
    totalPlural: 'total',
    levelComplete: '🎊 Level',
    levelCompleteEnd: 'completed!',
    nextLevel: 'Level',
    nextLevelEnd: '...',
  },
};

export type TranslationKey = keyof typeof translations.fr;
