import { G, waveActive, waveIntermission, waveIntermissionTimer, waveMonstersRemaining, waveMonstersTotal, gameOver } from '../core/state.js';
import { SKILL_DEFS, UPGRADE_DEFS, getUpgradeCost } from '../data/index.js';
import { bus } from '../core/events.js';
import { getScene } from '../core/runtime.js';
let _statusTimer = 0;

bus.on('status', (msg, duration) => {
  const el = document.getElementById('status-msg');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  _statusTimer = duration || 2;
});

function tickStatusMessage() {
  if (_statusTimer > 0) {
    _statusTimer -= 1;
    if (_statusTimer <= 0) {
      const el = document.getElementById('status-msg');
      if (el) el.classList.remove('show');
    }
    setTimeout(tickStatusMessage, 1000);
  }
}
tickStatusMessage();

export function renderHUD() {
  const hud = document.getElementById('hud');
  if (!hud) return;
  hud.innerHTML = `
    <div class="hud-wave">第 ${G.wave || 1} 波</div>
    <div class="hud-score">分数: ${G.score}</div>
    <div class="hud-gold">💰 ${G.gold}</div>
    <div class="hp-bar-wrap">
      <div class="hp-label">HP</div>
      <div class="hp-bar-bg">
        <div class="hp-bar-fill" style="width:${Math.max(0, G.hp / G.maxHp * 100)}%"></div>
      </div>
      <div class="hp-text">${Math.ceil(G.hp)}/${G.maxHp}</div>
    </div>
    ${waveIntermission ? `<div class="hud-intermission">下一波: ${Math.ceil(waveIntermissionTimer)}秒</div>` : ''}
    ${waveActive ? `<div class="hud-enemies">剩余妖兽: ${waveMonstersRemaining}</div>` : ''}
  `;
}

export function renderSkillBar() {
  const bar = document.getElementById('skill-bar');
  if (!bar) return;
  bar.innerHTML = '';
  SKILL_DEFS.forEach(skill => {
    const btn = document.createElement('div');
    btn.className = 'skill-btn';
    btn.id = 'skill-' + skill.id;
    btn.innerHTML = `
      <div class="skill-icon">${skill.icon}</div>
      <div class="skill-name">${skill.short}</div>
      <div class="skill-cd" id="cd-${skill.id}"></div>
    `;
    btn.onclick = () => {
      const scene = getScene();
      if (scene && scene.skillSystem) {
        scene.skillSystem.tryUseSkill(skill.id);
      }
    };
    bar.appendChild(btn);
  });
}

export function renderUpgradePanel() {
  let panel = document.getElementById('upgrade-panel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'upgrade-panel';
    panel.className = 'upgrade-panel';
    document.querySelector('.ui-layer').appendChild(panel);
  }

  if (!waveIntermission && !gameOver) {
    panel.classList.add('hidden');
    return;
  }

  if (gameOver) {
    panel.classList.add('hidden');
    return;
  }

  panel.classList.remove('hidden');

  let html = '<div class="upgrade-title">波次间隙 - 升级炮台</div>';
  html += `<div class="upgrade-gold">💰 ${G.gold}</div>`;
  html += '<div class="upgrade-grid">';

  UPGRADE_DEFS.forEach(up => {
    const currentLv = G.upgradeLevels[up.id] || 0;
    const cost = getUpgradeCost(up.id, currentLv);
    const maxed = currentLv >= up.maxLevel;
    const canAfford = G.gold >= cost;

    html += `<div class="upgrade-item ${maxed ? 'maxed' : ''} ${!canAfford && !maxed ? 'cannot-afford' : ''}" `;
    html += `onclick="window._gameUpgrade('${up.id}')">`;
    html += `<div class="upgrade-name">${up.name}</div>`;
    html += `<div class="upgrade-desc">${up.desc}</div>`;
    html += `<div class="upgrade-lv">Lv.${currentLv}/${up.maxLevel}</div>`;
    html += `<div class="upgrade-cost">${maxed ? '已满级' : '💰' + cost}</div>`;
    html += `</div>`;
  });

  html += '</div>';
  html += `<button class="btn-next-wave" onclick="window._startNextWave()">开始第 ${G.wave + 1} 波</button>`;
  panel.innerHTML = html;
}

export function renderGameOver() {
  let panel = document.getElementById('gameover-panel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'gameover-panel';
    panel.className = 'gameover-overlay';
    document.querySelector('.ui-layer').appendChild(panel);
  }
  panel.classList.remove('hidden');
  panel.innerHTML = `
    <div class="gameover-box">
      <h2>💀 炮台被摧毁</h2>
      <div class="gameover-stat">存活波次: ${G.wave}</div>
      <div class="gameover-stat">击杀妖兽: ${G.kills}</div>
      <div class="gameover-stat">最终分数: ${G.score}</div>
      <button class="btn-restart" onclick="window._restartGame()">重新开始</button>
    </div>
  `;
}

export function updateHUD() {
  renderHUD();
}

bus.on('hud-refresh', renderHUD);
bus.on('skillbar-refresh', renderSkillBar);
