/**
 * saved.js - 生词本模块（过滤、集中复习、发音与取消收藏）
 */

function filterSaved(lvl) {
  AppState.savedFilter = lvl;
  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.classList.toggle('active', chip.textContent === (lvl === 'ALL' ? '全部' : lvl));
  });
  renderSavedView();
}

function renderSavedView() {
  const container = document.getElementById('savedListContainer');
  if (!container) return;
  container.innerHTML = '';

  let allCards = [];
  ['A1', 'A2', 'B1', 'B2'].forEach(lvl => {
    const cards = AppState.fullDataset.levels[lvl]?.cards || [];
    allCards.push(...cards);
  });

  const savedList = allCards.filter(c => AppState.userState.savedCardIds.includes(c.id));
  const filtered = AppState.savedFilter === 'ALL'
    ? savedList
    : savedList.filter(c => c.id.startsWith(AppState.savedFilter.toLowerCase()));

  const savedCountPill = document.getElementById('savedCountPill');
  if (savedCountPill) {
    savedCountPill.textContent = `${filtered.length} 个收藏`;
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding:50px 20px; background:white; border-radius:16px; border:2px dashed #e2e8f0;">
        <p style="font-size:32px;">🌟</p>
        <p style="font-size:16px; font-weight:800; color:var(--text-main); margin-top:8px;">暂无收藏的单词或短语</p>
        <p style="font-size:12px; color:var(--text-muted); margin-top:4px;">在学习卡片右上角点击星标即可添加至生词本随时复习</p>
      </div>
    `;
    return;
  }

  filtered.forEach(card => {
    const item = document.createElement('div');
    item.className = 'saved-card-item';
    item.innerHTML = `
      <div>
        <div class="saved-card-term">${card.title}</div>
        <div class="saved-card-meaning">${card.meaning} · <span style="color:#8a99a8">${card.phonetic || ''}</span></div>
      </div>
      <div class="saved-card-actions">
        <button class="icon-action-btn" onclick="speakText('${card.title.replace(/'/g, "\\'")}')" title="发音">
          <svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>
        </button>
        <button class="icon-action-btn saved" onclick="removeSaved('${card.id}')" title="取消收藏">
          <svg viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
        </button>
      </div>
    `;
    container.appendChild(item);
  });
}

function removeSaved(id) {
  const idx = AppState.userState.savedCardIds.indexOf(id);
  if (idx >= 0) {
    AppState.userState.savedCardIds.splice(idx, 1);
  }
  renderSavedView();
  renderLearnView();
  AppState.updateGlobalStatusIndicators();
}

