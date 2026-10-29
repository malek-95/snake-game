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
  
  // Planned features
  timeAttack: string;
  survival: string;
  zen: string;
  golden: string;
  custom: string;
  versus: string;
  timeAttackDescription: string;
  survivalDescription: string;
  zenDescription: string;
  goldenDescription: string;
  customDescription: string;
  time: string;
  endGame: string;
  soundSection: string;
  soundEffects: string;
  music: string;
  on: string;
  off: string;
  skin: string;
  theme: string;
  locked: string;
  leaderboard: string;
  name: string;
  noScores: string;
  topTen: string;
  saveScore: string;
  rankedAt: string;
  achievements: string;
  achievementUnlocked: string;
  replay: string;
  watchReplay: string;
  lastGame: string;
  bestGame: string;
  noReplay: string;
  close: string;
  editor: string;
  levelName: string;
  clear: string;
  back: string;
  playLevel: string;
  deleteLevel: string;
  myLevels: string;
  newLevel: string;
  editorHelp: string;
  confirmDelete: string;
  chooseLevel: string;
  noCustomLevels: string;
  walls: string;
  saved: string;
  player1: string;
  player2: string;
  p1Controls: string;
  p2Controls: string;
  winsRound: string;
  winsMatch: string;
  draw: string;
  nextRound: string;
  newMatch: string;
  firstTo: string;
  keyboardNeeded: string;
  startRound: string;

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
    timeAttack: '⏱️ Contre-la-montre',
    survival: '⚡ Survie',
    zen: '🧘 Zen',
    golden: '✨ Pommes dorées',
    custom: '🧱 Perso',
    versus: '👥 2 joueurs',
    timeAttackDescription: 'Mange un maximum de pommes en 2 minutes !',
    survivalDescription: 'Chaque pomme te rend plus rapide. Tiens bon !',
    zenDescription: 'Pas de game over : les murs se traversent et te mordre coupe ta queue.',
    goldenDescription: 'Des pommes dorées rares valent 5x. Attrape-les avant qu’elles disparaissent !',
    customDescription: 'Joue sur un niveau que tu as dessiné.',
    time: 'Temps',
    endGame: '⏹ Terminer',
    soundSection: '🔊 Son',
    soundEffects: 'Effets sonores',
    music: 'Musique',
    on: 'Activé',
    off: 'Désactivé',
    skin: '🎨 Skin du serpent',
    theme: '🌈 Thème',
    locked: 'Verrouillé',
    leaderboard: '🏆 Classement',
    name: 'Nom',
    noScores: 'Aucun score pour l’instant',
    topTen: '🏅 Top 10 ! Ton nom :',
    saveScore: 'Enregistrer',
    rankedAt: 'Classé n°',
    achievements: '🎖️ Succès',
    achievementUnlocked: 'Succès débloqué !',
    replay: '🎬 Replay',
    watchReplay: '🎬 Revoir',
    lastGame: 'Dernière partie',
    bestGame: 'Meilleure partie',
    noReplay: 'Joue une partie pour la revoir ici.',
    close: 'Fermer',
    editor: '✏️ Éditeur',
    levelName: 'Nom du niveau',
    clear: 'Effacer',
    back: '← Retour',
    playLevel: '▶ Jouer',
    deleteLevel: 'Supprimer',
    myLevels: 'Mes niveaux',
    newLevel: '+ Nouveau',
    editorHelp: 'Clique ou glisse pour poser ou retirer des murs. La zone de départ (en vert) reste libre.',
    confirmDelete: 'Supprimer ce niveau ?',
    chooseLevel: 'Niveau perso',
    noCustomLevels: 'Crée d’abord un niveau dans l’éditeur.',
    walls: 'murs',
    saved: '✓ Enregistré',
    player1: 'Joueur 1',
    player2: 'Joueur 2',
    p1Controls: 'J1 : W A S D (Z Q S D)',
    p2Controls: 'J2 : flèches',
    winsRound: 'gagne la manche !',
    winsMatch: 'remporte le match ! 🏆',
    draw: 'Égalité !',
    nextRound: 'Manche suivante',
    newMatch: 'Nouveau match',
    firstTo: 'Premier à 3 manches',
    keyboardNeeded: 'Le mode 2 joueurs se joue au clavier.',
    startRound: 'Commencer',
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
    timeAttack: '⏱️ Time attack',
    survival: '⚡ Survival',
    zen: '🧘 Zen',
    golden: '✨ Golden apples',
    custom: '🧱 Custom',
    versus: '👥 2 players',
    timeAttackDescription: 'Eat as many apples as you can in 2 minutes!',
    survivalDescription: 'Every apple makes you faster. Hang on!',
    zenDescription: 'No game over: walls wrap and biting yourself cuts your tail.',
    goldenDescription: 'Rare golden apples are worth 5x. Grab them before they fade!',
    customDescription: 'Play a level you designed.',
    time: 'Time',
    endGame: '⏹ End game',
    soundSection: '🔊 Sound',
    soundEffects: 'Sound effects',
    music: 'Music',
    on: 'On',
    off: 'Off',
    skin: '🎨 Snake skin',
    theme: '🌈 Theme',
    locked: 'Locked',
    leaderboard: '🏆 Leaderboard',
    name: 'Name',
    noScores: 'No scores yet',
    topTen: '🏅 Top 10! Your name:',
    saveScore: 'Save',
    rankedAt: 'Ranked #',
    achievements: '🎖️ Achievements',
    achievementUnlocked: 'Achievement unlocked!',
    replay: '🎬 Replay',
    watchReplay: '🎬 Watch replay',
    lastGame: 'Last game',
    bestGame: 'Best game',
    noReplay: 'Play a game to watch it here.',
    close: 'Close',
    editor: '✏️ Editor',
    levelName: 'Level name',
    clear: 'Clear',
    back: '← Back',
    playLevel: '▶ Play',
    deleteLevel: 'Delete',
    myLevels: 'My levels',
    newLevel: '+ New',
    editorHelp: 'Click or drag to add or remove walls. The start zone (green) stays clear.',
    confirmDelete: 'Delete this level?',
    chooseLevel: 'Custom level',
    noCustomLevels: 'Create a level in the editor first.',
    walls: 'walls',
    saved: '✓ Saved',
    player1: 'Player 1',
    player2: 'Player 2',
    p1Controls: 'P1: W A S D',
    p2Controls: 'P2: arrow keys',
    winsRound: 'wins the round!',
    winsMatch: 'wins the match! 🏆',
    draw: 'Draw!',
    nextRound: 'Next round',
    newMatch: 'New match',
    firstTo: 'First to 3 rounds',
    keyboardNeeded: '2-player mode is played on a keyboard.',
    startRound: 'Start',
    language: '🌐 Language / Langue',
    french: '🇫🇷 Français',
    english: '🇬🇧 English',
  },
};
