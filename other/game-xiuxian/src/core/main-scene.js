/* ============================================================================
 * MainScene：单屏战场 —— 玩家固定底部，敌人从顶部涌来，
 * 系统类通过 installSceneSystems 装配（见 ../systems/index.js）
 * ========================================================================== */

import { P, recalcStats, gameStarted, runFinished } from '@/core/state.js';
import { WORLD } from '@/data/index.js';
import { installSceneSystems } from '@/systems/index.js';
import { bus } from '@/core/events.js';
import { loadGame } from '@/core/save.js';
import { setScene, setSkillCooldowns } from '@/core/runtime.js';
import { createGeneratedTextures } from '@/core/textures.js';
import { getEl } from '@/core/dom.js';
import { reportLoading } from '@/app/loader.js';
import { renderMenu } from '@/ui/index.js';

export class MainScene extends Phaser.Scene {
  constructor(){ super({key:'main'}); }

  preload(){
    reportLoading(40, '生成纹理资源...');
    createGeneratedTextures(this);
    reportLoading(60, '纹理加载完成');
  }

  create(){
    setScene(this);
    reportLoading(65, '初始化场景...');
    this.worldSize = WORLD.width;
    this.worldHeight = WORLD.height;
    this.playerBaseY = WORLD.playerY;
    this.wallY = Math.min(this.worldHeight - 48, this.playerBaseY + 55);
    this.wallX = this.worldSize / 2;
    this.physics.world.setBounds(0, 0, this.worldSize, this.worldHeight);
    this.runPaused = true;

    // 玩家固定底部
    this.player = this.physics.add.sprite(WORLD.playerX, WORLD.playerY, 'player');
    this.player.setDepth(10);
    this.playerDead = false;

    // 地面底纹（简单单色 + 底部防线）
    this.ground = this.add.graphics();
    this.ground.fillStyle(0xefe3c0, 1);
    this.ground.fillRect(0, 0, this.worldSize, this.worldHeight);
    this.ground.fillStyle(0xf7edc8, 1);
    this.ground.fillRect(0, WORLD.playerY - 30, this.worldSize, this.worldHeight - WORLD.playerY + 30);
    this.ground.lineStyle(3, 0xb57a19, 0.35);
    this.ground.lineBetween(0, WORLD.playerY + 30, this.worldSize, WORLD.playerY + 30);
    this.ground.fillStyle(0x806346, 1);
    this.ground.fillRect(0, this.wallY, this.worldSize, this.worldHeight - this.wallY);
    this.ground.fillStyle(0xb8945c, 1);
    this.ground.fillRect(0, this.wallY, this.worldSize, 7);
    this.ground.lineStyle(1, 0xead19b, 0.7);
    for (let x = 0; x < this.worldSize; x += 48) {
      this.ground.lineBetween(x, this.wallY + 8, x, this.worldHeight);
    }

    this.enemies = this.physics.add.group();
    this.projectiles = this.physics.add.group();
    this.enemyProjs = this.physics.add.group();
    this.hpBarGfx = this.add.graphics().setDepth(16);
    this.pool = {};
    installSceneSystems(this);
    this.physics.add.overlap(this.projectiles, this.enemies, (proj, en)=>{ this.combatSystem.onProjHit(proj, en); }, null, this);
    this.physics.add.overlap(this.player, this.enemyProjs, (p, proj)=>{ this.combatSystem.onEnemyProjHit(proj); }, null, this);
    this.skillCooldowns = {};
    setSkillCooldowns(this.skillCooldowns);

    loadGame();
    reportLoading(75, '加载存档...');
    recalcStats();
    reportLoading(85, '加载完成...');

    // 自动进入主页（局外）
    const doAutoStart = () => {
      reportLoading(100, '');
      const lbWrap = document.getElementById('loading-bar-wrap');
      if (lbWrap) lbWrap.classList.add('hidden');
      document.getElementById('loading-area')?.classList.add('hidden');
      renderMenu();
    };
    setTimeout(doAutoStart, 400);
  }

  clearEnemies(){
    this.enemies.children.iterate((en)=>{
      if(!en) return;
      const lbl=en.getData && en.getData('label');
      if(lbl) lbl.destroy();
      const uw=en.getData && en.getData('ultWarning');
      if(uw) uw.destroy();
      en.destroy();
    });
    this.projectiles.children.iterate((p)=>{ if(p&&p.active) this.freeProj(p); });
    this.enemyProjs.children.iterate((p)=>{ if(p&&p.active) this.freeProj(p); });
    this.hpBarGfx.clear();
  }

  damageFlash(t){
    const el=getEl('damageFlash');
    if(!el)return;
    el.style.opacity='1';
    clearTimeout(el._to);
    el._to=setTimeout(()=>{el.style.opacity='0';},60);
  }

  damageWall(damage, source) {
    if (runFinished || !gameStarted) return;
    const amount = Math.max(1, Math.round(damage || 1));
    P.wallHp = Math.max(0, P.wallHp - amount);
    this.damageFlash(0.12);
    bus.emit('hud-refresh');
    if (P.wallHp <= 0) {
      bus.emit('status', '🧱 城墙被攻破！', 2);
      this.stageSystem?.failStage('城墙被攻破');
    } else if (source) {
      bus.emit('status', '🧱 城墙受击 -' + amount, 0.8);
    }
  }

  /* ---- 弹丸对象池 ---- */
  getPooledProj(x, y, tex, group) {
    group = group || this.projectiles;
    const pool = this.pool[tex] || (this.pool[tex] = []);
    let p = pool.pop();
    if (p && p.scene) {
      const despawnTimer = p.getData('despawnTimer');
      if (despawnTimer?.remove) despawnTimer.remove(false);
      p.setActive(true).setVisible(true).setPosition(x, y);
      p.setAlpha(1).setScale(1).clearTint();
      p.setData('despawnTimer', null);
      if (p.body) { p.body.enable = true; p.body.reset(x, y); }
      return p;
    }
    p = group.create(x, y, tex);
    if (p && p.body) p.body.allowGravity = false;
    if (p) {
      p.setDepth(8);
      p.setData('despawnTimer', null);
    }
    return p;
  }

  scheduleProjFree(p, lifetime) {
    if (!p) return;
    const oldTimer = p.getData('despawnTimer');
    if (oldTimer?.remove) oldTimer.remove(false);
    const timer = this.time.delayedCall(lifetime, () => {
      if (p?.active) this.freeProj(p);
    });
    p.setData('despawnTimer', timer);
  }

  freeProj(p) {
    if (!p) return;
    const despawnTimer = p.getData('despawnTimer');
    if (despawnTimer?.remove) despawnTimer.remove(false);
    p.setData('despawnTimer', null);
    if (!p.active) return;
    p.setActive(false).setVisible(false);
    if (p.body) { p.body.enable = false; p.body.velocity.set(0, 0); }
    const tex = p.texture.key;
    (this.pool[tex] = this.pool[tex] || []).push(p);
  }

  showSkillName(name, color){
    this.skillEffects?.showSkillName(name, color);
  }

  update(time,delta){
    if (this.runPaused || this.playerDead) return;
    const dt=delta/1000;
    P.totalPlayTime += dt;
    this.entityAnimationSystem?.update(dt);
    this.combatLoopSystem?.update(dt, time);
    this.stageSystem.update(dt);
    this.uiTickSystem?.update(dt, time);
  }
}
