import { P, isCultivating, cultProgress, statusTimer, lootTimer, autoSaveTimer,
  setCultProgress, setAutoSaveTimer, setStatusTimer, setLootTimer, recalcStats, refreshSkills, initHotbar,
  checkAchievements } from './state.js';
import { ZONES, SKILL_DEFS, getRealm, getRealmIndex } from './data.js';
import { MovementSystem } from './systems/MovementSystem.js';
import { BuffSystem } from './systems/BuffSystem.js';
import { SpawnSystem } from './systems/SpawnSystem.js';
import { AISystem } from './systems/AISystem.js';
import { CombatSystem } from './systems/CombatSystem.js';
import { WaveSystem } from './systems/WaveSystem.js';
import { TextPool } from './systems/TextPool.js';
import { bus } from './events.js';
import { loadGame } from './save.js';
import { toggleCultivate, tryBreakthrough } from './cultivation.js';
import { toggleCharPanel, toggleBagPanel, toggleSkillPanel, toggleAchPanel, toggleShopPanel,
  hotbarRender, updateHUD, updateHotbarCooldowns, addAttr, upgradeSkill, equipSkill } from './ui.js';

export class MainScene extends Phaser.Scene {
  constructor(){ super({key:'main'}); }
  preload(){
    const g = this.make.graphics({add:false});
    g.fillStyle(0x6de27a,1); g.fillCircle(14,14,12); g.fillStyle(0x88ff99,0.4); g.fillCircle(14,14,16);
    g.generateTexture('player',28,28); g.clear();
    g.fillStyle(0xff5544,1); g.fillCircle(10,10,9); g.generateTexture('beast',20,20); g.clear();
    g.fillStyle(0xff8800,1); g.fillCircle(12,12,11); g.fillStyle(0xffaa44,0.4); g.fillCircle(12,12,14);
    g.generateTexture('elite',24,24); g.clear();
    g.fillStyle(0xcc22ff,1); g.fillCircle(16,16,14); g.fillStyle(0xdd66ff,0.3); g.fillCircle(16,16,18);
    g.fillStyle(0xffdd00,0.8); g.fillCircle(16,16,6);
    g.generateTexture('boss',32,32); g.clear();
    g.fillStyle(0x8b5a2b,1); g.fillRect(0,3,18,3); g.generateTexture('arrow',18,9); g.clear();
    g.fillStyle(0xff6633,1); g.fillCircle(6,6,5); g.fillStyle(0xffaa66,0.5); g.fillCircle(6,6,7);
    g.generateTexture('fireball',14,14); g.clear();
    g.fillStyle(0x99ddff,1); g.fillRect(0,3,22,4); g.fillStyle(0xccffff,0.5); g.fillRect(0,2,22,6);
    g.generateTexture('swordQi',22,10); g.clear();
    g.fillStyle(0x5aa6b1,0.75); g.fillCircle(12,12,10); g.fillStyle(0xd8f2ef,0.5); g.fillCircle(12,12,14);
    g.generateTexture('water',28,28); g.clear();
    g.fillStyle(0x9fb884,0.75); g.fillCircle(12,12,10); g.fillStyle(0xf5f0d8,0.55); g.fillCircle(12,12,15);
    g.generateTexture('wind',30,30); g.clear();
    g.fillStyle(0xffee88,1); g.fillRect(1,0,5,20); g.fillStyle(0xffffcc,0.5); g.fillRect(0,0,7,20);
    g.generateTexture('bolt',7,20); g.clear();
    g.fillStyle(0x65c8ff,1); g.fillCircle(5,5,4); g.generateTexture('loot',10,10); g.clear();
    g.destroy();
  }
  create(){
    window.scene = this;
    window.teleportToZone = (zoneId) => this.switchMap(zoneId);
    this._currentMap = MAPS[0];
    this.physics.world.setBounds(0,0,this._currentMap.worldSize,this._currentMap.worldSize);
    this.ground = this.add.graphics();
    this.drawGround();
    this.player = this.physics.add.sprite(this._currentMap.worldSize/2, this._currentMap.worldSize/2, 'player');
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(10);
    this.playerDead = false;
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setZoom(1.2);
    this.cameras.main.setBounds(0,0,this._currentMap.worldSize,this._currentMap.worldSize);
    this.enemies = this.physics.add.group();
    this.projectiles = this.physics.add.group();
    this.enemyProjs = this.physics.add.group();
    this.hpBarGfx = this.add.graphics().setDepth(16);
    this.pool = {};
    this.textPool = new TextPool(this, 24);
    this.movementSystem = new MovementSystem(this);
    this.buffSystem = new BuffSystem(this);
    this.spawnSystem = new SpawnSystem(this);
    this.aiSystem = new AISystem(this);
    this.combatSystem = new CombatSystem(this);
    this.waveSystem = new WaveSystem(this);
    this.physics.add.overlap(this.projectiles, this.enemies, (proj, en)=>{ this.combatSystem.onProjHit(proj, en); }, null, this);
    this.physics.add.overlap(this.player, this.enemies, (p, en)=>{ this.combatSystem.onEnemyContact(en); }, null, this);
    this.physics.add.overlap(this.player, this.enemyProjs, (p, proj)=>{ this.combatSystem.onEnemyProjHit(proj); }, null, this);
    for(let i=0;i<8;i++) this.spawnSystem.spawnEnemy();
    this.isMoving = false;
    this.moveTarget = new Phaser.Math.Vector2(this._currentMap.worldSize/2, this._currentMap.worldSize/2);
    this.input.on('pointerdown', (ptr)=>{
      if(ptr.event.button===0){ this.isMoving=true; this.moveTarget.set(ptr.worldX,ptr.worldY); }
      else if(ptr.event.button===2){ this.placeMarker(ptr.worldX,ptr.worldY); }
    });
    this.input.on('pointerup', (ptr)=>{ if(ptr.event.button===0) this.isMoving=false; });
    this.input.on('pointermove', (ptr)=>{ if(this.isMoving) this.moveTarget.set(ptr.worldX,ptr.worldY); });
    this.input.mouse.disableContextMenu();
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = {
      up: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
    };
    this.input.keyboard.addKeys('SPACE,B,C,X,Z');
    this.input.keyboard.on('keydown-SPACE', toggleCultivate);
    this.input.keyboard.on('keydown-B', toggleCharPanel);
    this.input.keyboard.on('keydown-C', tryBreakthrough);
    this.input.keyboard.on('keydown-X', toggleShopPanel);
    this.skillCooldowns = {};
    for(const sk of SKILL_DEFS) this.skillCooldowns[sk.id] = 0;
    window.skillCooldowns = this.skillCooldowns;
    this.shieldOrbs = [];
    this.shieldTimer = 0;
    this.shieldReflect = 0;

    this.deathModal = document.getElementById('deathModal');
    const rb = document.getElementById('respawnBtn');
    if(rb) rb.onclick = ()=>{ this.respawnPlayer(); };

    this.marker = null;
    this.lastZoneId = null;

    loadGame();
    bus.emit('status','读档成功',1.5);
    recalcStats();
    bus.emit('hud-refresh');
    bus.emit('hotbar-refresh');
    this.updateZoneLabel();
  }

  drawGround(){
    const g = this.ground; g.clear();
    const s = this._currentMap.worldSize;
    const m = this._currentMap;
    g.fillStyle(parseInt('0x' + m.bgColor.replace('#',''), 16) || 0xefe3c0, 1);
    g.fillRect(0, 0, s, s);
    for(let x = 0; x < s; x += 40) {
      for(let y = 0; y < s; y += 40) {
        g.fillStyle(m.color, 0.1 + Math.random() * 0.08);
        g.fillRect(x, y, 40, 40);
      }
    }
    if (m.safe) {
      g.fillStyle(0xf7edc8, 0.85); g.fillCircle(s / 2, s / 2, s * 0.35);
      g.lineStyle(3, 0xb57a19, 0.4); g.strokeCircle(s / 2, s / 2, s * 0.35);
      g.lineStyle(1, 0x8aa678, 0.25); g.strokeCircle(s / 2, s / 2, 60);
    }
  }

  getCurrentMap(){
    return this._currentMap;
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

  updateZoneLabel(){
    const zone = this._currentMap;
    const el=document.getElementById('zone-label');
    if(el){
      el.textContent='「 '+zone.name+' 」';
      el.style.color=zone.colorName||'#fff';
      el.classList.add('show');
      if(this.zoneFadeTimer) clearTimeout(this.zoneFadeTimer);
      this.zoneFadeTimer=setTimeout(()=>el.classList.remove('show'),2000);
    }
  }

  damageFlash(t){
    const el=document.getElementById('damageFlash');
    if(!el)return;
    el.style.opacity='1';
    clearTimeout(el._to);
    el._to=setTimeout(()=>{el.style.opacity='0';},60);
  }

  switchMap(mapId){
    const map = MAPS.find(m => m.id === mapId);
    if (!map || map.id === this._currentMap.id) return;
    const overlay = document.getElementById('loadingOverlay');
    const bar = document.getElementById('loadingBar');
    const txt = document.getElementById('loadingText');
    if (overlay) { overlay.style.display = 'flex'; if (txt) txt.textContent = '传送至 ' + map.name + '...'; if (bar) bar.style.width = '0%'; }
    setTimeout(() => { if (bar) bar.style.width = '50%'; }, 100);
    setTimeout(() => { if (bar) bar.style.width = '100%'; }, 300);
    setTimeout(() => {
      this._currentMap = map;
      this.physics.world.setBounds(0, 0, map.worldSize, map.worldSize);
      this.cameras.main.setBounds(0, 0, map.worldSize, map.worldSize);
      this.drawGround();
      this.player.setPosition(map.worldSize / 2, map.worldSize / 2);
      this.moveTarget.set(map.worldSize / 2, map.worldSize / 2);
      this.lastZoneId = null;
      this.clearEnemies();
      for (let i = 0; i < 8; i++) this.spawnSystem.spawnEnemy();
      this.updateZoneLabel();
      bus.emit('status', '📍 传送至 ' + map.name, 2);
      bus.emit('save');
      if (overlay) overlay.style.display = 'none';
    }, 500);
  }

  respawnPlayer(){
    P.hp=P.maxHp;
    this.playerDead=false;
    this.player.setAlpha(1);
    this.player.setPosition(this._currentMap.worldSize/2,this._currentMap.worldSize/2);
    this.moveTarget.set(this._currentMap.worldSize/2,this._currentMap.worldSize/2);
    if(this.deathModal)this.deathModal.classList.add('hidden');
    recalcStats();
    bus.emit('status','转生归来',1.5);
    bus.emit('hud-refresh');
    bus.emit('save');
  }

  respawnPlayer(){
    P.hp=P.maxHp;
    this.playerDead=false;
    this.player.setAlpha(1);
    this.player.setPosition(this._currentMap.worldSize/2,this._currentMap.worldSize/2);
    this.moveTarget.set(this._currentMap.worldSize/2,this._currentMap.worldSize/2);
    if(this.deathModal)this.deathModal.classList.add('hidden');
    recalcStats();
    bus.emit('status','转生归来',1.5);
    bus.emit('hud-refresh');
    bus.emit('save');
  }

  placeMarker(x,y){
    if(this.marker)this.marker.destroy();
    this.marker=this.add.circle(x,y,7,0xffffff,0.5).setDepth(20);
    this.time.delayedCall(1200,()=>{if(this.marker){this.marker.destroy();this.marker=null;}});
  }

  getPooledProj(x, y, tex, group) {
    group = group || this.projectiles;
    const pool = this.pool[tex] || (this.pool[tex] = []);
    let p = pool.pop();
    if (p && p.scene) {
      p.setActive(true).setVisible(true).setPosition(x, y);
      p.setAlpha(1).setScale(1).clearTint();
      if (p.body) { p.body.enable = true; p.body.reset(x, y); }
      return p;
    }
    p = group.create(x, y, tex);
    if (p && p.body) p.body.allowGravity = false;
    if (p) p.setDepth(8);
    return p;
  }

  freeProj(p) {
    if (!p || !p.active) return;
    p.setActive(false).setVisible(false);
    if (p.body) { p.body.enable = false; p.body.velocity.set(0, 0); }
    const tex = p.texture.key;
    (this.pool[tex] = this.pool[tex] || []).push(p);
  }

  applyBuffVisual(color){
    const c=this.add.circle(this.player.x,this.player.y,30,color||0x66ffcc,0.2).setDepth(3);
    this.tweens.add({targets:c,alpha:0,scale:2,duration:600,onComplete:()=>c.destroy()});
  }

  showSkillName(name, color){
    this.textPool.show(this.player.x, this.player.y - 40, name, {
      fontSize: '14px',
      color: '#' + color.toString(16).padStart(6, '0'),
      stroke: '#000', strokeThickness: 1,
      depth: 20, floatDist: 40, duration: 900
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

  update(time,delta){
    const dt=delta/1000;
    if(this._currentMap.safe && this.enemies.countActive(true)>0) this.clearEnemies();
    P.totalPlayTime += dt;
    this.movementSystem.update();
    if (this.playerDead) this.player.setVelocity(0, 0);
    if (isCultivating && !this.playerDead) {
      const cultRate = 0.02 + getRealmIndex(P.realm) * 0.005;
      let cp = cultProgress + cultRate * dt;
      if (cp >= 1) {
        cp = 0;
        const r = getRealm(P.realm);
        if (P.stage < r.stages) {
          P.stage++; recalcStats(); refreshSkills(); initHotbar();
          bus.emit('status', '🌊 ' + (r.name) + ' ' + (P.stage) + '层！', 2);
          bus.emit('hud-refresh'); bus.emit('hotbar-refresh'); bus.emit('save');
        } else { bus.emit('status', '⚡ 境界圆满，按 C 尝试突破！', 2); }
      }
      setCultProgress(cp);
      if (Math.random() < 0.3) {
        const px = this.player.x + Phaser.Math.Between(-20, 20), py = this.player.y + Phaser.Math.Between(-20, 20);
        const dot = this.add.circle(px, py, 3, 0x88ddff, 0.6).setDepth(2);
        this.tweens.add({ targets: dot, alpha: 0, y: py - 30, duration: 600, onComplete: () => dot.destroy() });
      }
    }
    this.buffSystem.update(dt);
    const skillNow = time / 1000;
    const qDef = SKILL_DEFS.find(s => s.id === P.hotbar[0]?.id) || SKILL_DEFS.find(s => s.id === 'swordfly');
    const qRange = (qDef.range || 280) * (1 + (P.buff.rangeBoost || 0));
    const qR2 = qRange * qRange;
    const { closestQ, activeEnemies } = this.aiSystem.update(dt, time / 1000, qRange, qR2);
    if (!this.playerDead) {
      if (!this.playerAura || !this.playerAura.active) {
        const colors = [0x6de27a, 0x66ffcc, 0x88ccff, 0xffd700, 0xcc66ff, 0xff8866, 0xaa44ff, 0xffffff, 0xffdd00];
        const cIdx = Math.min(getRealmIndex(P.realm), colors.length - 1);
        this.playerAura = this.add.circle(this.player.x, this.player.y, 22, colors[cIdx] || 0x6de27a, 0.15).setDepth(1);
        this.tweens.add({ targets: this.playerAura, alpha: 0.08, scale: 1.6, duration: 1200, yoyo: true, repeat: -1 });
      } else this.playerAura.setPosition(this.player.x, this.player.y);
    }
    if (!this.playerDead && !this._currentMap.safe) {
      this.combatSystem.useAutoAttack(skillNow, closestQ, qDef);
      this.combatSystem.useManualSkills(skillNow, activeEnemies);
    }
    this.waveSystem.update(dt);
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
     if (this._hudTick > 6) { this._hudTick = 0; bus.emit('hud-refresh'); bus.emit('hotbar-refresh'); updateHotbarCooldowns(); }
    if (time % 2000 < delta * 1.5) bus.emit('check-achievements');
  }
}
