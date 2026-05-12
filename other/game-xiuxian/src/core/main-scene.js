import { P, isCultivating, cultProgress, statusTimer, lootTimer, autoSaveTimer,
  setCultProgress, setAutoSaveTimer, setStatusTimer, setLootTimer, recalcStats, refreshSkills, initHotbar,
  checkAchievements, baseHp, baseMaxHp, currentWave,
  setBaseHp, setCurrentWave, setWavePending } from './state.js';
import { SKILL_DEFS, getRealm, getRealmIndex, WORLD, LANES, LANE_WIDTH, DEFENSE_LINE_Y, PLAYER_ZONE_TOP } from '../data/index.js';
import { installSceneSystems } from '../systems/index.js';
import { bus } from './events.js';
import { loadGame } from './save.js';
import { setScene, setSkillCooldowns } from './runtime.js';
import { createGeneratedTextures } from './textures.js';
import { toggleCultivate, tryBreakthrough } from './cultivation.js';
import { hotbarRender, updateHotbarCooldowns } from '../ui/index.js';

export class MainScene extends Phaser.Scene {
  constructor(){ super({key:'Battle'}); }

  init(data) {
    this._levelStartWave = data?.startWave || 1;
    this._levelWaveCount = data?.waveCount || 5;
    this._maxWaveForLevel = this._levelStartWave + this._levelWaveCount - 1;
  }

  preload(){
    createGeneratedTextures(this);
  }

  create(){
    setScene(this);

    this.worldWidth = WORLD.width;
    this.worldHeight = WORLD.height;

    this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);

    this.ground = this.add.graphics();
    this.drawBattlefield();

    this.player = this.physics.add.sprite(this.worldWidth / 2, WORLD.height - 100, 'player');
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(10);
    this.player.setData('baseScale', 1);
    this.playerDead = false;

    this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);
    this.cameras.main.scrollX = 0;
    this.cameras.main.scrollY = 0;

    this.enemies = this.physics.add.group();
    this.projectiles = this.physics.add.group();
    this.enemyProjs = this.physics.add.group();
    this.hpBarGfx = this.add.graphics().setDepth(16);
    this.pool = {};

    installSceneSystems(this);

    this.physics.add.overlap(this.projectiles, this.enemies, (proj, en)=>{ this.combatSystem.onProjHit(proj, en); }, null, this);
    this.physics.add.overlap(this.player, this.enemies, (p, en)=>{ this.combatSystem.onEnemyContact(en); }, null, this);
    this.physics.add.overlap(this.player, this.enemyProjs, (p, proj)=>{ this.combatSystem.onEnemyProjHit(proj); }, null, this);

    this.isMoving = false;
    this.moveTarget = new Phaser.Math.Vector2(this.worldWidth / 2, WORLD.height - 100);

    this.input.on('pointerdown', (ptr)=>{
      if(ptr.event.button === 0){
        const ty = Phaser.Math.Clamp(ptr.worldY, PLAYER_ZONE_TOP, this.worldHeight - 30);
        this.isMoving = true;
        this.moveTarget.set(ptr.worldX, ty);
      }
    });
    this.input.on('pointerup', (ptr)=>{ if(ptr.event.button === 0) this.isMoving = false; });
    this.input.on('pointermove', (ptr)=>{
      if(this.isMoving){
        const ty = Phaser.Math.Clamp(ptr.worldY, PLAYER_ZONE_TOP, this.worldHeight - 30);
        this.moveTarget.set(ptr.worldX, ty);
      }
    });
    this.input.mouse.disableContextMenu();

    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = {
      up: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
    };

    this.input.keyboard.addKeys('SPACE,C');
    this.input.keyboard.on('keydown-SPACE', toggleCultivate);
    this.input.keyboard.on('keydown-C', tryBreakthrough);

    this.skillCooldowns = {};
    for(const sk of SKILL_DEFS) this.skillCooldowns[sk.id] = 0;
    setSkillCooldowns(this.skillCooldowns);

    this.shieldOrbs = [];
    this.shieldTimer = 0;
    this.shieldReflect = 0;

    this.deathModal = document.getElementById('deathModal');
    const rb = document.getElementById('respawnBtn');
    if(rb) rb.onclick = ()=>{ this.respawnPlayer(); };

    this._defenseText = this.add.text(WORLD.width / 2, DEFENSE_LINE_Y + 10, '', {
      fontSize: '14px',
      fontFamily: '"Segoe UI","Microsoft YaHei",sans-serif',
      color: '#b94a3e',
      stroke: '#fff',
      strokeThickness: 2
    }).setOrigin(0.5, 0).setDepth(25);

    this._waveText = this.add.text(WORLD.width / 2, 14, '', {
      fontSize: '15px',
      fontFamily: '"Segoe UI","Microsoft YaHei",sans-serif',
      color: '#b57a19',
      stroke: '#fff',
      strokeThickness: 2
    }).setOrigin(0.5, 0).setDepth(25);

    this._waitingWave = true;

    loadGame();
    P.hp = P.maxHp;
    setBaseHp(baseMaxHp);
    recalcStats();

    this.time.delayedCall(600, () => {
      this._startNextWave();
      bus.emit('status', '⚔️ 兽潮来袭！守住防线！', 2.5);
    });

    bus.emit('save');
  }

  drawBattlefield(){
    const g = this.ground;
    const w = this.worldWidth;
    const h = this.worldHeight;

    g.fillStyle(0xe8dcb0, 1);
    g.fillRect(0, 0, w, h);

    g.fillStyle(0xd4c898, 0.3);
    for(let x = 0; x < w; x += 40){
      for(let y = 0; y < h; y += 40){
        if((x / 40 + y / 40) % 2 === 0){
          g.fillRect(x, y, 40, 40);
        }
      }
    }

    for(let i = 1; i < LANES; i++){
      const lx = i * LANE_WIDTH;
      g.lineStyle(1, 0xb8a878, 0.25);
      g.lineBetween(lx, 0, lx, h);
    }

    const defY = DEFENSE_LINE_Y;
    g.fillStyle(0x8a6a4a, 0.6);
    g.fillRect(0, defY - 4, w, 10);
    g.fillStyle(0xd4b896, 0.5);
    g.fillRect(0, defY - 3, w, 3);

    g.fillStyle(0xb94a3e, 0.15);
    g.fillRect(0, defY + 6, w, h - defY - 6);

    g.fillStyle(0xc9a96e, 0.3);
    g.fillRect(w / 2 - 2, defY + 6, 4, h - defY - 6);
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
    const el=document.getElementById('damageFlash');
    if(!el)return;
    el.style.opacity='1';
    clearTimeout(el._to);
    el._to=setTimeout(()=>{el.style.opacity='0';},60);
  }

  respawnPlayer(){
    P.hp = P.maxHp;
    this.playerDead = false;
    this.player.setAlpha(1);
    this.player.setPosition(this.worldWidth / 2, WORLD.height - 100);
    this.moveTarget.set(this.worldWidth / 2, WORLD.height - 100);
    if(this.deathModal) this.deathModal.classList.add('hidden');
    recalcStats();
    bus.emit('status','转生归来',1.5);
    bus.emit('save');
  }

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

  updateFireballFields(){
    this.projectiles.children.iterate((proj)=>{
      if(!proj || !proj.active || proj.getData('skillId') !== 'fireball') return;
      if (proj.getData('noFireField')) return;
      const lastX = proj.getData('lastFireFieldX') ?? proj.x;
      const lastY = proj.getData('lastFireFieldY') ?? proj.y;
      const dx = proj.x - lastX;
      const dy = proj.y - lastY;
      if(dx * dx + dy * dy < 70 * 70) return;
      const dmg = proj.getData('damage') || 10;
      this.groundEffectSystem?.addFireField(proj.x, proj.y, dmg * 0.18, 10);
      proj.setData('lastFireFieldX', proj.x);
      proj.setData('lastFireFieldY', proj.y);
    });
  }

  applyBuffVisual(color){
    this.skillEffects?.onBuffCast(color || 0x66ffcc);
  }

  showSkillName(name, color){
    this.skillEffects?.showSkillName(name, color);
  }

  showWorldNotice(text, color = '#f7d98e'){
    if(!this.textPool || !this.player) return;
    this.textPool.show(this.player.x, this.player.y - 58, text, {
      fontSize: '16px',
      color,
      stroke: '#3f2d1d',
      strokeThickness: 3,
      depth: 28,
      floatDist: 52,
      duration: 1100
    });
  }

  doLightningEffect(success){
    const color=success?0xffdd44:0xff4444;
    for(let i=0;i<12;i++){
      const x=this.player.x+Phaser.Math.Between(-60,60);
      const y=this.player.y+Phaser.Math.Between(-120,0);
      const bolt=this.add.sprite(x,y,'bolt').setDepth(15).setScale(1+Math.random()*0.8);
      bolt.setTint(color);
      this.tweens.add({targets:bolt,alpha:0,y:y+80,scale:0.2,duration:300+Math.random()*200,delay:i*40,onComplete:()=>bolt.destroy()});
    }
  }

  _startNextWave(){
    const nw = currentWave + 1;
    if (currentWave >= this._maxWaveForLevel) {
      this.showWorldNotice('🎉 关卡通关！', '#ffd700');
      bus.emit('status', '关卡通关！即将返回...', 3);
      this.time.delayedCall(2000, () => {
        this.scene.start('MapMenu');
      });
      return;
    }
    setCurrentWave(nw);
    if (nw > P.maxWave) P.maxWave = nw;

    const isBossWave = nw % 5 === 0;
    const count = Math.min(3 + nw * 2, 25);

    for (let i = 0; i < count; i++) {
      this.spawnSystem.spawnEnemy({ allowBoss: isBossWave });
    }

    if (isBossWave) {
      const bos = this.spawnSystem.spawnEnemy({ forceBoss: true, allowBoss: false, allowElite: false });
      if (bos) {
        bos.setData('atk', Math.round((bos.getData('atk') || 1) * 2));
        bos.setData('xp', Math.round((bos.getData('xp') || 1) * 5));
        bos.setData('isBoss', true);
        bos.setTexture('monster-boss');
        bos.setScale(1.4);
        bos.setData('baseScale', 1.4);
        bus.emit('status', '👑 妖兽王降临！', 2.5);
      }
    }

    setWavePending(false);
    bus.emit('status', '⚔️ 第 ' + nw + ' 波来袭！', 2);
    bus.emit('wave-changed');
  }

  checkWaveCleared(){
    if (this._waitingWave) return;
    if (this.enemies.countActive(true) === 0) {
    this._waitingWave = true;
    this._levelWaveCount = 5;
    this._levelStartWave = 1;
    this._maxWaveForLevel = 0;

    setCurrentWave(this._levelStartWave - 1);
      bus.emit('status', '妖兽退散，下一波准备中...', 2);
      this.time.delayedCall(3000, () => {
        this._waitingWave = false;
        this._startNextWave();
      });
    }
  }

  onEnemyReachBottom(en) {
    if (!en || en.getData('dead')) return;
    en.setData('dead', true);
    const dmg = Math.round((en.getData('atk') || 5) * 0.5);
    setBaseHp(baseHp - dmg);
    this.damageFlash(0.3);
    const lbl = en.getData('label'); if (lbl) lbl.destroy();
    en.destroy();

    if (baseHp <= 0) {
      this.playerDead = true;
      this.player.setAlpha(0.3);
      this.player.setVelocity(0, 0);
      this.isMoving = false;
      this.clearEnemies();
      bus.emit('status', '防线失守...', 2);
      this.time.delayedCall(2000, () => {
        this.scene.start('MapMenu');
      });
    }
  }

  update(time, delta){
    const dt = delta / 1000;

    P.totalPlayTime += dt;

    this.movementSystem.update();
    this.entityAnimationSystem?.update(dt);

    if (this.playerDead) this.player.setVelocity(0, 0);

    if (isCultivating && !this.playerDead) {
      const cultRate = 0.03 + getRealmIndex(P.realm) * 0.006;
      let cp = cultProgress + cultRate * dt;
      if (cp >= 1) {
        cp = 0;
        const r = getRealm(P.realm);
        if (P.stage < r.stages) {
          P.stage++; recalcStats(); refreshSkills(); initHotbar();
          bus.emit('status', '🌊 ' + (r.name) + ' ' + (P.stage) + '层！', 2);
          bus.emit('save');
        } else { bus.emit('status', '⚡ 境界圆满，按 C 尝试突破！', 2); }
      }
      setCultProgress(cp);
    }

    this.combatSystem.updateSwordProjectiles(dt);
    this.skillEffects?.updateProjectileTrails();
    this.updateFireballFields();
    this.groundEffectSystem?.update(dt);

    if (!this.playerDead && P.hp < P.maxHp) {
      const noEnemies = this.enemies.countActive(true) === 0;
      if (noEnemies) {
        P.hp = Math.min(P.maxHp, P.hp + P.maxHp * 0.03 * dt);
      }
    }

    this.buffSystem.update(dt);

    const skillNow = time / 1000;
    const qDef = SKILL_DEFS.find(s => s.id === P.hotbar[0]?.id) || SKILL_DEFS.find(s => s.id === 'swordfly');
    const view = this.cameras.main?.worldView;
    const visibleRange = view
      ? Math.sqrt(view.width * view.width + view.height * view.height) * 0.5 + 80
      : (qDef.range || 300);
    const qRange = qDef.id === 'swordfly'
      ? Math.max(qDef.range || 300, visibleRange)
      : (qDef.range || 280) * (1 + (P.buff.rangeBoost || 0));
    const qR2 = qRange * qRange;

    const { closestQ, activeEnemies } = this.aiSystem.update(dt, time / 1000, qRange, qR2);

    this.sceneEffectsSystem?.update(dt);

    if (!this.playerDead) {
      if (!this.playerAura || !this.playerAura.active) {
        const colors = [0x6de27a, 0x66ffcc, 0x88ccff, 0xffd700, 0xcc66ff];
        const cIdx = Math.min(getRealmIndex(P.realm), colors.length - 1);
        this.playerAura = this.add.circle(this.player.x, this.player.y, 22, colors[cIdx] || 0x6de27a, 0.15).setDepth(1);
        this.tweens.add({ targets: this.playerAura, alpha: 0.08, scale: 1.6, duration: 1200, yoyo: true, repeat: -1 });
      } else this.playerAura.setPosition(this.player.x, this.player.y);
    }

    if (!this.playerDead) {
      this.combatSystem.useAutoAttack(skillNow, closestQ, activeEnemies, qDef);
      this.combatSystem.useManualSkills(skillNow, activeEnemies);
    }

    this.checkWaveCleared();

    let st = statusTimer;
    if (st > 0) { st -= dt; if (st <= 0) { const el = document.getElementById('status'); if (el) el.classList.remove('show'); } }
    setStatusTimer(st);

    let lt = lootTimer;
    if (lt > 0) { lt -= dt; if (lt <= 0) { const el = document.getElementById('loot-popup'); if (el) el.classList.remove('show'); } }
    setLootTimer(lt);

    let at = autoSaveTimer + dt;
    if (at >= 30) { at = 0; bus.emit('save'); }
    setAutoSaveTimer(at);

    this._hudTick = (this._hudTick || 0) + 1;
    if (this._hudTick > 6) {
      this._hudTick = 0;
      if (this._defenseText) {
        const pct = Math.max(0, Math.round(baseHp / baseMaxHp * 100));
        this._defenseText.setText('🏰 防线 ' + Math.round(baseHp) + '/' + baseMaxHp + ' (' + pct + '%)');
      }
      if (this._waveText) {
        this._waveText.setText('第 ' + currentWave + ' 波');
      }
      hotbarRender();
      updateHotbarCooldowns();
    }

    if (time % 2000 < delta * 1.5) bus.emit('check-achievements');

    this.enemies.children.iterate((en) => {
      if (!en || en.getData('dead')) return;
      if (en.y > DEFENSE_LINE_Y + 20) this.onEnemyReachBottom(en);
    });
  }
}
