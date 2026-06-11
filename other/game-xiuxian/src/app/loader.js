// Standalone loading progress reporter - no dependencies to avoid circular imports
let loadingBar = null;
let loadingWrap = null;
let loadingText = null;

function ensureElements() {
  if (!loadingBar) loadingBar = document.getElementById('loading-bar-fill');
  if (!loadingWrap) loadingWrap = document.getElementById('loading-bar-wrap');
  if (!loadingText) loadingText = document.getElementById('loading-text');
}

export function reportLoading(pct, text) {
  ensureElements();
  const progress = Math.min(100, Math.max(0, pct));
  if (loadingBar) loadingBar.style.width = progress + '%';
  if (loadingText) loadingText.textContent = text || '正在加载...';
}

export function showLoadingBar() {
  ensureElements();
  if (loadingWrap) loadingWrap.classList.remove('hidden');
}

export function hideLoadingBar() {
  ensureElements();
  if (loadingWrap) loadingWrap.classList.add('hidden');
}

export function setStartBtnEnabled(enabled) {
  const btn = document.getElementById('startBtn');
  if (btn) btn.disabled = !enabled;
}