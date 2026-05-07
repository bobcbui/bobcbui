// Import all modules for their side effects (registrations on window)
import './data.js';
import { recalcStats, refreshSkills, initHotbar } from './state.js';
import { setStatus, setLoot } from './helpers.js';
import { saveGame, loadGame } from './save.js';
import { updateHUD, hotbarRender, toggleCharPanel } from './ui.js';
import { tryUseSkill } from './skills.js';
import { craftPill, useConsumable } from './potions.js';
import { tryBreakthrough, doBreakthrough, cancelBreakthrough, toggleCultivate } from './cultivation.js';
import { MainScene } from './scene.js';

// Ensure window globals for onclick handlers
window.setStatus = setStatus;
window.setLoot = setLoot;
window.saveGame = saveGame;
window.loadGame = loadGame;

window.addEventListener('load', ()=>{
  hotbarRender();
  updateHUD();

  const canvas = document.getElementById('gameCanvas');
  const config = {
    type: Phaser.AUTO,
    canvas,
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: '#0a1320',
    physics: { default:'arcade', arcade:{ gravity:{x:0,y:0}, debug:false } },
    scene: [MainScene],
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: window.innerWidth, height: window.innerHeight }
  };
  new Phaser.Game(config);

  const ui = document.querySelector('.ui-layer');
  const alchemyBar = document.createElement('div');
  alchemyBar.style.cssText = 'position:absolute;top:10px;right:10px;pointer-events:auto;display:flex;gap:6px;';
  alchemyBar.innerHTML = `
    <button class="btn btn-sm btn-sec" onclick="craftPill('heal_pill')">炼回血丹(5💰)</button>
    <button class="btn btn-sm btn-sec" onclick="craftPill('qi_pill')">炼回灵丹(8💰)</button>
    <button class="btn btn-sm btn-sec" onclick="craftPill('buff_pill')">炼爆气丹(12💰)</button>
    <button class="btn btn-sm btn-gold" onclick="toggleCharPanel()">角色B</button>
    <button class="btn btn-sm btn-sec" onclick="tryBreakthrough()">突破C</button>
    <button class="btn btn-sm btn-sec" onclick="saveGame()">存档</button>
  `;
  ui.appendChild(alchemyBar);

  const tips = document.createElement('div');
  tips.style.cssText = 'position:absolute;bottom:55px;left:50%;transform:translateX(-50%);font-size:11px;color:var(--text-dim);pointer-events:none;white-space:nowrap;';
  tips.innerHTML = '左键移动 · 右键标记 · QWE R技能 · 空格打坐 · B角色 · C突破 · X炼丹 · 1-4丹药';
  ui.appendChild(tips);
});
