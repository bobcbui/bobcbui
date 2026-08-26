/**
 * learn.js - 闪卡浸入式学习模块（卡片渲染、主动回忆自测、发音、收藏与手势导航）
 */

function renderLearnView() {
  const cards = AppState.getLevelCards();
  if (!cards.length) return;

  if (AppState.currentCardIndex >= cards.length) {
    AppState.currentCardIndex = 0;
  }

  const card = cards[AppState.currentCardIndex];
  const levelData = AppState.fullDataset.levels[AppState.currentLevel] || {
    title: `${AppState.currentLevel} · Practice`,
    subtitle: '核心训练',
    description: '日常英语词汇与口语表达'
  };

  // 标题与计数器
  const subEl = document.getElementById('learnLevelSub');
  const titleEl = document.getElementById('learnLevelTitle');
  const currentNumEl = document.getElementById('learnCurrentNum');
  const totalNumEl = document.getElementById('learnTotalNum');

  if (subEl) subEl.textContent = `${levelData.title} · ${levelData.subtitle}`;
  if (titleEl) titleEl.textContent = levelData.description;
  if (currentNumEl) currentNumEl.textContent = AppState.currentCardIndex + 1;
  if (totalNumEl) totalNumEl.textContent = cards.length;

  // 渲染分段进度条
  const track = document.getElementById('learnProgressTrack');
  if (track) {
    track.innerHTML = '';
    cards.forEach((_, idx) => {
      const seg = document.createElement('div');
      seg.className = 'progress-segment';
      if (idx < AppState.currentCardIndex) seg.classList.add('done');
      else if (idx === AppState.currentCardIndex) seg.classList.add('current');
      track.appendChild(seg);
    });
  }

  // 渲染卡片内容
  const flashcard = document.getElementById('mainFlashcard');
  if (flashcard) {
    flashcard.className = `flashcard type-${card.type}`;
  }

  const cardTypeBadge = document.getElementById('cardTypeBadge');
  const cardTerm = document.getElementById('cardTerm');
  const cardPhonetic = document.getElementById('cardPhonetic');
  const cardMeaning = document.getElementById('cardMeaning');
  const cardExample = document.getElementById('cardExample');
  const cardTranslation = document.getElementById('cardTranslation');
  const cardNote = document.getElementById('cardNote');
  const revealBtnText = document.getElementById('revealBtnText');

  if (cardTypeBadge) cardTypeBadge.textContent = card.label;
  if (cardTerm) cardTerm.textContent = card.title;
  if (cardPhonetic) cardPhonetic.textContent = card.phonetic || '';
  if (cardMeaning) cardMeaning.textContent = AppState.isMeaningRevealed ? card.meaning : '🙈 点击下方展开释义';
  if (cardExample) cardExample.textContent = card.example;
  if (cardTranslation) cardTranslation.textContent = AppState.isMeaningRevealed ? card.translation : '•••••••••••••••••••••••••';
  if (cardNote) cardNote.textContent = card.note || '日常口语高频表达';
  if (revealBtnText) revealBtnText.textContent = AppState.isMeaningRevealed ? '🙈 隐藏释义自测' : '👀 显示释义';

  // 收藏状态同步
  const isSaved = AppState.userState.savedCardIds.includes(card.id);
  const saveBtn = document.getElementById('saveCardBtn');
  if (saveBtn) {
    saveBtn.classList.toggle('saved', isSaved);
  }

  // 记录掌握进度
  if (!AppState.userState.learnedCardIds.includes(card.id)) {
    AppState.userState.learnedCardIds.push(card.id);
    AppState.updateGlobalStatusIndicators();
  }
}

function nextCard() {
  const cards = AppState.getLevelCards();
  if (!cards.length) return;
  AppState.currentCardIndex = (AppState.currentCardIndex + 1) % cards.length;
  AppState.isMeaningRevealed = true;
  animateCardTransition(1);
  renderLearnView();
}

function prevCard() {
  const cards = AppState.getLevelCards();
  if (!cards.length) return;
  AppState.currentCardIndex = (AppState.currentCardIndex - 1 + cards.length) % cards.length;
  AppState.isMeaningRevealed = true;
  animateCardTransition(-1);
  renderLearnView();
}

function animateCardTransition(direction) {
  const el = document.getElementById('mainFlashcard');
  if (!el) return;
  el.style.transform = `translateX(${direction * 14}px) scale(0.98)`;
  el.style.opacity = '0.4';
  setTimeout(() => {
    el.style.transform = 'translateX(0) scale(1)';
    el.style.opacity = '1';
  }, 140);
}

function toggleActiveRecall() {
  AppState.isMeaningRevealed = !AppState.isMeaningRevealed;
  renderLearnView();
}

function toggleSaveCurrent() {
  const cards = AppState.getLevelCards();
  const card = cards[AppState.currentCardIndex];
  if (!card) return;
  const idx = AppState.userState.savedCardIds.indexOf(card.id);
  if (idx >= 0) {
    AppState.userState.savedCardIds.splice(idx, 1);
  } else {
    AppState.userState.savedCardIds.push(card.id);
  }
  renderLearnView();
  AppState.updateGlobalStatusIndicators();
}

function playAudioCurrent() {
  const cards = AppState.getLevelCards();
  const card = cards[AppState.currentCardIndex];
  if (!card) return;
  speakText(card.title || card.example);
}

function setupKeyboardNavigation() {
  document.addEventListener('keydown', e => {
    if (AppState.activeTab === 'learn') {
      if (e.key === 'ArrowRight') nextCard();
      if (e.key === 'ArrowLeft') prevCard();
      if (e.key === ' ') {
        e.preventDefault();
        playAudioCurrent();
      }
    }
  });
}

function setupTouchSwipe() {
  let touchStartX = 0;
  const cardEl = document.getElementById('mainFlashcard');
  if (!cardEl) return;

  cardEl.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });

  cardEl.addEventListener('touchend', e => {
    const delta = e.changedTouches[0].screenX - touchStartX;
    if (Math.abs(delta) > 45) {
      if (delta < 0) nextCard();
      else prevCard();
    }
  });
}

