import { G } from '../core/state.js';
import { SKILL_DEFS } from '../data/skills.js';
import { bus } from '../core/events.js';
import { getScene, getSkillCooldowns } from '../core/runtime.js';

let _statusTimer = 0;

bus.on('status', (msg, duration) => {
  const el = document.getElementById('statusMsg');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  _statusTimer = duration || 2;
});

function tickStatus() {
  if (_statusTimer > 0) {
    _statusTimer -= 1;
    if (_statusTimer <= 0) {
      const el = document.getElementById('statusMsg');
      if (el) el.classList.remove('show');
    }
    setTimeout(tickStatus, 1000);
  }
}
tickStatus();

export function renderHUD() {
  const hud = document.getElementById('hud');
  if (!hud) return;
  hud.innerHTML = `
    <div class="hud-stage">第${G.stage || 1}关</div>
    <div class="hud-level">${G.level || 1} / 20</div>
    <div class="hp-wrap">
      <div class="hp-bar">
        <div class="hp-fill" style="width:${Math.max(0, G.hp / G.maxHp * 100)}%"></div>
      </div>
      <div class="hp-num">${Math.ceil(G.hp)}</div>
    </div>
  `;
}

export function renderSkillList() {
  const bar = document.getElementById('skillBar');
  if (!bar) return;

  const skills = G.skills;
  bar.innerHTML = '';

  skills.forEach(skill => {
    const def = SKILL_DEFS.find(s => s.id === skill.id);
    if (!def) return;

    const btn = document.createElement('div');
    btn.className = 'skill-btn';
    btn.id = 'sk-' + skill.id;

    const cd = (getSkillCooldowns()[skill.id] || 0).toFixed(1);
    const onCd = cd > 0;

    btn.innerHTML = `
      <div class="sk-icon">${def.icon}</div>
      <div class="sk-info">
        <div class="sk-name">${def.name} Lv.${skill.level}</div>
        ${onCd ? `<div class="sk-cd">${cd}s</div>` : ''}
      </div>
    `;
    if (onCd) btn.classList.add('on-cd');

    btn.onclick = () => {
      const scene = getScene();
      if (scene && scene.skillSystem) {
        scene.skillSystem.tryUseSkill(skill.id);
      }
    };
    bar.appendChild(btn);
  });

  if (skills.length === 0) {
    bar.innerHTML = '<div class="sk-empty">通关获得技能</div>';
  }
}

export function renderCardDraw(cards) {
  let overlay = document.getElementById('cardDrawOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'cardDrawOverlay';
    overlay.className = 'card-overlay';
    document.querySelector('.ui-layer').appendChild(overlay);
  }
  overlay.classList.remove('hidden');

  let html = '<div class="card-title">🎴 选择一张卡牌</div>';
  html += '<div class="card-grid">';

  cards.forEach((card, i) => {
    html += `<div class="card-item" onclick="window._pickCard(${i})">
      <div class="card-icon">${card.icon}</div>
      <div class="card-name">${card.name}</div>
      <div class="card-desc">${card.desc}</div>
    </div>`;
  });

  html += '</div>';
  overlay.innerHTML = html;
  window._pendingCards = cards;
}

export function renderGameOver() {
  let overlay = document.getElementById('gameOverOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'gameOverOverlay';
    overlay.className = 'gameover-overlay';
    document.querySelector('.ui-layer').appendChild(overlay);
  }
  overlay.classList.remove('hidden');
  overlay.innerHTML = `
    <div class="go-box">
      <h2>💀 修仙失败</h2>
      <div class="go-stat">关卡: 第${G.stage}关 ${G.level}/20</div>
      <div class="go-stat">击杀: ${G.kills} 妖兽</div>
      <div class="go-stat">分数: ${G.score}</div>
      <div class="go-stat" style="color:#ffd700">飞剑术 Lv.${G.swordLevel}</div>
      <button class="go-btn" onclick="window._restartGame()">重新修炼</button>
    </div>
  `;
}

export function renderStageComplete() {
  let overlay = document.getElementById('stageOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'stageOverlay';
    overlay.className = 'stage-overlay';
    document.querySelector('.ui-layer').appendChild(overlay);
  }
  overlay.classList.remove('hidden');
  overlay.innerHTML = `
    <div class="st-box">
      <h2>🎉 第${G.stage}关通过！</h2>
      <div class="st-stat">飞剑术 Lv.${G.swordLevel}</div>
      <div class="st-stat">技能数: ${G.skills.length}</div>
      <div class="st-stat">分数: ${G.score}</div>
      <button class="st-btn" onclick="window._nextStage()">进入第${G.stage + 1}关</button>
    </div>
  `;
}

export function renderLevelIntro() {
}

bus.on('hud-refresh', renderHUD);
bus.on('skillbar-refresh', renderSkillList);
