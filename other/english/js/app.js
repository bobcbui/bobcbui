/**
 * app.js - 主程序入口、关卡切换、Tab 路由与初始化
 */

// ================== LEVEL SELECTION ==================
function selectLevel(lvl, switchView = true) {
  AppState.currentLevel = lvl;
  AppState.currentCardIndex = 0;
  AppState.isMeaningRevealed = true;

  // 更新桌面侧栏药丸按钮
  document.querySelectorAll('.level-pill-btn').forEach(btn => btn.classList.remove('active'));
  const activePill = document.getElementById(`pill-${lvl}`);
  if (activePill) activePill.classList.add('active');

  // 更新移动端模态框勾选
  ['A1', 'A2', 'B1', 'B2'].forEach(l => {
    const el = document.getElementById(`modalCheck-${l}`);
    if (el) el.textContent = l === lvl ? '✓' : '';
  });

  closeLevelModal();
  renderLearnView();
  QuizEngine.renderQuizView();
  AppState.updateGlobalStatusIndicators();

  if (switchView) switchTab('learn');
}

function openLevelModal() {
  const modal = document.getElementById('levelModal');
  if (modal) modal.classList.add('open');
}

function closeLevelModal() {
  const modal = document.getElementById('levelModal');
  if (modal) modal.classList.remove('open');
}

// ================== TAB NAVIGATION ==================
function switchTab(tab) {
  AppState.activeTab = tab;

  // 切换视图容器
  document.querySelectorAll('.view-container').forEach(v => v.classList.remove('active'));
  const targetView = document.getElementById(`view-${tab}`);
  if (targetView) targetView.classList.add('active');

  // 桌面左侧侧边栏导航按钮
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const navBtn = document.getElementById(`nav-${tab}`);
  if (navBtn) navBtn.classList.add('active');

  // 移动端底部 Tab 栏
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  const tabBtn = document.getElementById(`tab-${tab}`);
  if (tabBtn) tabBtn.classList.add('active');

  if (tab === 'saved') renderSavedView();
  if (tab === 'progress') renderProgressView();
  if (tab === 'quiz') QuizEngine.resetQuiz();
  if (tab === 'learn') renderLearnView();
}

// 代理 QuizEngine 方法给 HTML 内联事件
function handleQuizAction() {
  QuizEngine.handleQuizAction();
}

function playQuizAudio() {
  QuizEngine.playQuizAudio();
}

// ================== INITIALIZATION ==================
async function initApp() {
  AppState.loadSavedState();
  AppState.updateGlobalStatusIndicators();

  try {
    const resp = await fetch('./resources/data.json');
    if (!resp.ok) throw new Error('Data load error: ' + resp.status);
    AppState.fullDataset = await resp.json();
  } catch (err) {
    console.warn('Dataset load failed:', err);
  }

  selectLevel(AppState.currentLevel, false);
  setupTouchSwipe();
  setupKeyboardNavigation();
}

// 页面加载完成后启动
window.addEventListener('DOMContentLoaded', initApp);

