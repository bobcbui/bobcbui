/**
 * state.js - 全局状态管理、数据持久化与通用数据获取
 */

const AppState = {
  fullDataset: { levels: {} },
  currentLevel: 'A1',
  activeTab: 'learn',
  currentCardIndex: 0,
  isMeaningRevealed: true,
  savedFilter: 'ALL',

  userState: {
    xp: 140,
    streak: 7,
    hearts: 5,
    savedCardIds: ['a1_1', 'b1_1', 'b2_8'],
    learnedCardIds: ['a1_1'],
    quizAttempts: { total: 4, correct: 4 }
  },

  // 从 LocalStorage 加载用户数据
  loadSavedState() {
    try {
      const savedUser = localStorage.getItem('fluent_english_state_v2');
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        this.userState = Object.assign(this.userState, parsed);
      }
      const savedLvl = localStorage.getItem('fluent_level');
      if (savedLvl && ['A1', 'A2', 'B1', 'B2'].includes(savedLvl)) {
        this.currentLevel = savedLvl;
      }
    } catch (e) {
      console.warn('LocalStorage load error:', e);
    }
  },

  // 持久化用户数据到 LocalStorage
  persistState() {
    try {
      localStorage.setItem('fluent_english_state_v2', JSON.stringify(this.userState));
      localStorage.setItem('fluent_level', this.currentLevel);
    } catch (e) {
      console.warn('LocalStorage persist error:', e);
    }
  },

  // 获取当前等级的所有卡片
  getLevelCards(level = this.currentLevel) {
    return this.fullDataset.levels[level]?.cards || [];
  },

  // 获取当前等级的所有测验题
  getLevelQuizzes(level = this.currentLevel) {
    return this.fullDataset.levels[level]?.quizzes || [];
  },

  // 更新所有页面顶部、侧边栏及统计面板的状态数值
  updateGlobalStatusIndicators() {
    const { xp, streak, hearts, learnedCardIds, quizAttempts } = this.userState;

    // 移动端状态徽章
    const mobileStreak = document.getElementById('mobileStreak');
    const mobileXp = document.getElementById('mobileXp');
    const mobileHearts = document.getElementById('mobileHearts');
    const mobileLevelBadge = document.getElementById('mobileLevelBadge');

    if (mobileStreak) mobileStreak.textContent = String(streak).padStart(2, '0');
    if (mobileXp) mobileXp.textContent = xp;
    if (mobileHearts) mobileHearts.textContent = hearts;
    if (mobileLevelBadge) mobileLevelBadge.textContent = this.currentLevel;

    // 桌面侧边栏与右侧面板
    const sideStreakCount = document.getElementById('sideStreakCount');
    const rightStreakCount = document.getElementById('rightStreakCount');
    const rightXpCount = document.getElementById('rightXpCount');
    const rightHeartCount = document.getElementById('rightHeartCount');
    const currentLevelLabel = document.getElementById('currentLevelLabel');

    if (sideStreakCount) sideStreakCount.textContent = String(streak).padStart(2, '0');
    if (rightStreakCount) rightStreakCount.textContent = String(streak).padStart(2, '0');
    if (rightXpCount) rightXpCount.textContent = xp;
    if (rightHeartCount) rightHeartCount.textContent = hearts;
    if (currentLevelLabel) currentLevelLabel.textContent = this.currentLevel;

    // 进度面板汇总数值
    const statStreak = document.getElementById('statStreak');
    const statXp = document.getElementById('statXp');
    const statLearnedCount = document.getElementById('statLearnedCount');
    const statAccuracy = document.getElementById('statAccuracy');

    if (statStreak) statStreak.textContent = `${streak} 天`;
    if (statXp) statXp.textContent = xp;

    const totalCards = ['A1', 'A2', 'B1', 'B2'].reduce((acc, lvl) => {
      return acc + (this.fullDataset.levels[lvl]?.cards?.length || 8);
    }, 0);
    if (statLearnedCount) statLearnedCount.textContent = `${learnedCardIds.length} / ${totalCards}`;

    const accuracy = quizAttempts.total > 0
      ? Math.round((quizAttempts.correct / quizAttempts.total) * 100)
      : 100;
    if (statAccuracy) statAccuracy.textContent = `${accuracy}%`;

    // 更新各等级掌握度进度条
    ['A1', 'A2', 'B1', 'B2'].forEach(lvl => {
      const lvlCards = this.fullDataset.levels[lvl]?.cards || [];
      const count = lvlCards.filter(c => learnedCardIds.includes(c.id)).length;
      const total = lvlCards.length || 8;
      const pct = Math.round((count / total) * 100);

      const percentEl = document.getElementById(`masteryPercent-${lvl}`);
      const fillEl = document.getElementById(`masteryFill-${lvl}`);
      if (percentEl) percentEl.textContent = `${pct}%`;
      if (fillEl) fillEl.style.width = `${pct}%`;
    });

    this.persistState();
  }
};

