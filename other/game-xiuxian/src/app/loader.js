/* 独立加载进度报告器（无依赖，避免循环引用） */

let loadingBar = null;
let loadingWrap = null;
let loadingTextEl = null;

function ensureElements() {
  if (!loadingBar) loadingBar = document.getElementById('loading-bar-fill');
  if (!loadingWrap) loadingWrap = document.getElementById('loading-bar-wrap');
  if (!loadingTextEl) loadingTextEl = document.getElementById('loading-text');
}

export function reportLoading(pct, text) {
  ensureElements();
  const progress = Math.min(100, Math.max(0, pct));
  if (loadingBar) loadingBar.style.width = progress + '%';
  if (loadingTextEl) loadingTextEl.textContent = text || '正在加载...';
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
  const btn = document.getElementById('enterStageBtn');
  if (btn) btn.disabled = !enabled;
}
