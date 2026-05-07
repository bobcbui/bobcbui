// Import all modules for their side effects (registrations on window)
import './data.js';
import { recalcStats, refreshSkills, initHotbar } from './state.js';
import { setStatus, setLoot } from './helpers.js';
import { saveGame, loadGame } from './save.js';
import { updateHUD, hotbarRender, toggleCharPanel, toggleBagPanel, toggleSkillPanel, toggleAchPanel, toggleShopPanel, upgradeSkill, equipSkill, addAttr } from './ui.js';
import { tryBreakthrough } from './cultivation.js';
import { genEquipment } from './equipment.js';
import { ACHIEVEMENTS, SHOP_ITEMS } from './data.js';
import { MainScene } from './scene.js';

// Ensure window globals for onclick handlers
window.setStatus = setStatus;
window.setLoot = setLoot;
window.saveGame = saveGame;
window.loadGame = loadGame;
window.genEquipment = genEquipment;
window._data = { ACHIEVEMENTS, SHOP_ITEMS };

window.addEventListener('load', ()=>{
  hotbarRender();
  updateHUD();

  const canvas = document.getElementById('gameCanvas');
  const config = {
    type: Phaser.CANVAS,
    renderType: Phaser.CANVAS,
    canvas,
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: '#efe3c0',
    physics: { default:'arcade', arcade:{ gravity:{x:0,y:0}, debug:false } },
    scene: [MainScene],
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: window.innerWidth, height: window.innerHeight }
  };
  new Phaser.Game(config);

  const ui = document.querySelector('.ui-layer');
  const navBar = document.createElement('div');
  navBar.style.cssText = 'position:absolute;top:10px;right:10px;pointer-events:auto;display:flex;gap:5px;flex-wrap:wrap;justify-content:flex-end;';
  navBar.innerHTML = `
    <button class="btn btn-sm btn-gold" onclick="toggleCharPanel()">角色(B)</button>
    <button class="btn btn-sm btn-sec" onclick="toggleBagPanel()">背包</button>
    <button class="btn btn-sm btn-sec" onclick="toggleSkillPanel()">技能</button>
    <button class="btn btn-sm btn-sec" onclick="toggleAchPanel()">成就</button>
    <button class="btn btn-sm btn-gold" onclick="toggleShopPanel()">百宝阁(X)</button>
    <button class="btn btn-sm btn-sec" onclick="tryBreakthrough()">突破(C)</button>
    <button class="btn btn-sm btn-sec" onclick="saveGame()">存档</button>
  `;
  ui.appendChild(navBar);

  const joyZone = document.getElementById('joystick-zone');
  const joyThumb = document.getElementById('joystick-thumb');
  if(joyZone && joyThumb){
    let joyId=null, joySX=0, joySY=0;
    joyZone.addEventListener('touchstart', (e)=>{
      e.preventDefault();
      const t=e.changedTouches[0];
      joyId=t.identifier; joySX=t.clientX; joySY=t.clientY;
      joyZone.classList.add('active');
    });
    joyZone.addEventListener('touchmove', (e)=>{
      e.preventDefault();
      for(let i=0;i<e.changedTouches.length;i++){
        const t=e.changedTouches[i];
        if(t.identifier===joyId){
          const dx=t.clientX-joySX, dy=t.clientY-joySY;
          const dist=Math.sqrt(dx*dx+dy*dy);
          const maxR=45;
          const clamp=Math.min(dist,maxR);
          const nx=dist>0.01?dx/dist:0, ny=dist>0.01?dy/dist:0;
          joyThumb.style.transform=`translate(calc(-50% + ${clamp*nx}px), calc(-50% + ${clamp*ny}px))`;
          window.joystickDir={x:nx, y:ny};
        }
      }
    });
    const joyEnd = ()=>{
      joyId=null; joyThumb.style.transform='translate(-50%,-50%)';
      window.joystickDir=null; joyZone.classList.remove('active');
    };
    joyZone.addEventListener('touchend', (e)=>{
      for(let i=0;i<e.changedTouches.length;i++){
        if(e.changedTouches[i].identifier===joyId){e.preventDefault(); joyEnd();}
      }
    });
    joyZone.addEventListener('touchcancel', (e)=>{e.preventDefault(); joyEnd();});
  }
});
