import { P, isCultivating, cultProgress, statusTimer, lootTimer, autoSaveTimer,
  setCultProgress, setAutoSaveTimer, setStatusTimer, setLootTimer, recalcStats, refreshSkills, initHotbar,
  checkAchievements } from './state.js';
import { MAPS, SKILL_DEFS, getRealm, getRealmIndex, WORLD, ZONES } from '../data/index.js';
import { installSceneSystems } from '../systems/index.js';
import { bus } from './events.js';
import { loadGame } from './save.js';
import { setScene, setSkillCooldowns } from './runtime.js';
import { createGeneratedTextures } from './textures.js';
import { toggleCultivate, tryBreakthrough } from './cultivation.js';
import { toggleCharPanel, toggleBagPanel, toggleSkillPanel, toggleAchPanel, toggleShopPanel,
  hotbarRender, updateHUD, updateHotbarCooldowns, addAttr, upgradeSkill, equipSkill } from '../ui/index.js';

export class MainScene extends Phaser.Scene {
  constructor(){ super({key:'main'}); }
  preload(){
    createGeneratedTextures(this);
  }
  create(){
    setScene(this);
    this.worldSize = WORLD.size;
    this._currentMap = { worldSize: WORLD.size, safeRadius: WORLD.safeRadius, id:'hehuan', name:'合欢宗', colorName:'#c9a96e' };
    this.physics.world.setBounds(0,0,this.worldSize,this.worldSize);
    this.ground = this.add.graphics();
    this.drawGround();
    this.player = this.physics.add.sprite(this.worldSize/2, this.worldSize/2, 'player');
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(10);
    this.player.setData('baseScale', 1);
    this.playerDead = false;
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setZoom(1.2);
    this.cameras.main.setBounds(0,0,this.worldSize,this.worldSize);
    this.enemies = this.physics.add.group();
    this.projectiles = this.physics.add.group();
    this.enemyProjs = this.physics.add.group();
    this.hpBarGfx = this.add.graphics().setDepth(16);
    this.pool = {};
    installSceneSystems(this);
    this.physics.add.overlap(this.projectiles, this.enemies, (proj, en)=>{ this.combatSystem.onProjHit(proj, en); }, null, this);
    this.physics.add.overlap(this.player, this.enemies, (p, en)=>{ this.combatSystem.onEnemyContact(en); }, null, this);
    this.physics.add.overlap(this.player, this.enemyProjs, (p, proj)=>{ this.combatSystem.onEnemyProjHit(proj); }, null, this);
    for(let i=0;i<8;i++) this.spawnSystem.spawnEnemy();
    this.isMoving = false;
    this.moveTarget = new Phaser.Math.Vector2(this.worldSize/2, this.worldSize/2);
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
    setSkillCooldowns(this.skillCooldowns);
    this.shieldOrbs = [];
    this.shieldTimer = 0;
    this.shieldReflect = 0;

    this.deathModal = document.getElementById('deathModal');
    const rb = document.getElementById('respawnBtn');
    if(rb) rb.onclick = ()=>{ this.respawnPlayer(); };

    this.marker = null;
    this.lastZoneId = null;
    this._wasInSafe = true;

    loadGame();
    bus.emit('status','读档成功',1.5);
    recalcStats();
    bus.emit('hud-refresh');
    bus.emit('hotbar-refresh');
    this.updateZoneLabel();
  }

  drawGround(){
    const g = this.ground; g.clear();
    const s = this.worldSize;
    g.fillStyle(0xefe3c0, 1); g.fillRect(0, 0, s, s);
    for(const zone of ZONES){
      for(let x=0;x<s;x+=100){
        for(let y=0;y<s;y+=100){
          const cx=x+50,cy=y+50;
          const dist=Math.sqrt((cx-s/2)*(cx-s/2)+(cy-s/2)*(cy-s/2));
          if(dist>=zone.minDist&&dist<zone.maxDist){
            g.fillStyle(zone.color,0.12+Math.random()*0.06);
            g.fillRect(x-1,y-1,102,102);
          }
        }
      }
    }
    const r = WORLD.safeRadius;
    const half = s/2;
    g.fillStyle(0xf7edc8,0.82); g.fillRect(half-r, half-r, r*2, r*2);
    this._drawWorldGrid(g);
    g.lineStyle(3,0xb57a19,0.45); g.strokeRect(half-r, half-r, r*2, r*2);
    g.lineStyle(2,0xb99a59,0.15);
    for(let d=1200;d<4400;d+=600) g.strokeCircle(s/2,s/2,d);
    this._drawScenery(g);
  }

  _drawWorldGrid(g){
    const s = this.worldSize;
    const step = 100;
    g.lineStyle(1,0x8aa678,0.16);
    for(let v=0;v<=s;v+=step){
      g.lineBetween(v,0,v,s);
      g.lineBetween(0,v,s,v);
    }
  }

  _drawScenery(g){
    const s = this.worldSize;
    const center = s/2;
    const sr = WORLD.safeRadius;
    const h = (x,y)=>Math.abs(Math.sin(x*12.9898+y*78.233)*43758.5453)%1;

    for(let x=20;x<s;x+=80){
      for(let y=20;y<s;y+=80){
        if(Math.abs(x-center)<=sr+60&&Math.abs(y-center)<=sr+60) continue;
        const v = h(x,y);
        if(v<0.08){
          g.fillStyle(0x7a7a80,0.45); g.fillRect(x-12,y-8,24+Math.floor(v*20),16+Math.floor(v*10));
          g.fillStyle(0x9a9aa0,0.3); g.fillRect(x-8,y-12,16,8);
        }else if(v<0.11){
          g.fillStyle(0x5599cc,0.25); g.fillRect(x-40,y-15,80,30);
        }
      }
    }

    for(let i=0;i<6;i++){
      const sx=Phaser.Math.Between(sr+200,s-sr-200), sy=Phaser.Math.Between(sr+200,s-sr-200);
      g.fillStyle(0x667788,0.18); g.fillTriangle(sx,sy,sx-50,sy+120,sx+50,sy+120);
      g.fillStyle(0x8899aa,0.14); g.fillTriangle(sx-15,sy-40,sx,sy+60,sx+30,sy+60);
    }

    for(let i=0;i<4;i++){
      const sx=Phaser.Math.Between(sr+100,s-sr-100), sy=Phaser.Math.Between(sr+100,s-sr-100);
      g.fillStyle(0x889988,0.1); g.fillTriangle(sx,sy,sx-30,sy+80,sx+40,sy+80);
      g.fillStyle(0x99aa99,0.08); g.fillTriangle(sx-10,sy-20,sx+20,sy+50,sx+45,sy+50);
    }

    for(let ri=0;ri<3;ri++){
      let rx=Phaser.Math.Between(sr+150,s*0.6), ry=Phaser.Math.Between(sr+150,s-sr-150);
      g.lineStyle(8+Math.floor(h(rx,ry+ri*99)*10),0x5599cc,0.14);
      g.beginPath(); g.moveTo(rx,ry);
      for(let seg=0;seg<8;seg++){
        rx+=Phaser.Math.Between(-30,60); ry+=Phaser.Math.Between(-80,80);
        rx=Phaser.Math.Clamp(rx,50,s-50); ry=Phaser.Math.Clamp(ry,50,s-50);
        g.lineTo(rx,ry);
      }
      g.strokePath();
    }

    this._drawSectDecor(g);
  }

  _drawSectDecor(g){
    const c=this.worldSize/2, sr=WORLD.safeRadius;
    const h=(x,y)=>Math.abs(Math.sin(x*31.337+y*17.771)*43758.5453)%1;
    for(let x=c-sr+40;x<c+sr;x+=90){
      for(let y=c-sr+40;y<c+sr;y+=90){
        if(Math.abs(x-c)<sr*0.5&&Math.abs(y-c)<sr*0.5) continue;
        const v=h(x,y);
        if(v<0.15){
          g.fillStyle(0xc9a66b,0.35); g.fillRect(x-10,y-10,20,20);
          g.fillStyle(0xb89a5a,0.28); g.fillRect(x-8,y-20,8,14);
          g.fillStyle(0x8a6a3a,0.35); g.fillTriangle(x-12,y+10,x,y+10,x-6,y-2);
        }else if(v<0.28){
          g.fillStyle(0x7a5a3a,0.3); g.fillRect(x-4,y-4,8,14);
          g.fillStyle(0x9a7a5a,0.2); g.fillRect(x-6,y+10,12,4);
        }else if(v<0.38){
          g.fillStyle(0x5599cc,0.2); g.fillCircle(x,y,8+Math.floor(v*12));
          g.fillStyle(0x88aacc,0.1); g.fillCircle(x,y,14+Math.floor(v*12));
        }else if(v<0.48){
          g.fillStyle(0x66aa44,0.25); g.fillCircle(x,y,6+Math.floor(v*8));
          g.fillStyle(0x88cc66,0.15); g.fillCircle(x+3,y-2,4+Math.floor(v*6));
        }else if(v<0.55){
          g.fillStyle(0xd4b896,0.3); g.fillRect(x-14,y-2,28,4);
          g.fillStyle(0xc4a886,0.2); g.fillRect(x-10,y-6,6,12);
        }
      }
    }
    g.fillStyle(0xc9a96e,0.25);
    g.fillRect(c-14,c-14,28,28);
    g.fillStyle(0xd4b896,0.18);
    g.fillTriangle(c-18,c+14,c,c-8,c+18,c+14);
    g.lineStyle(2,0xd4b896,0.3);
    g.strokeRect(c-18,c-18,36,36);
    g.fillStyle(0xe8d5a8,0.18);
    for(let ax=-1;ax<=1;ax+=2){
      for(let ay=-1;ay<=1;ay+=2){
        g.fillRect(c+ax*30-10,c+ay*30-10,20,20);
        g.fillStyle(0xb89a5a,0.2); g.fillRect(c+ax*30-3,c+ay*30-18,6,12);
      }
    }
  }

  getCurrentZone(){
    const cx=this.player.x,cy=this.player.y;
    const s=this.worldSize/2;
    const dist=Math.sqrt((cx-s)*(cx-s)+(cy-s)*(cy-s));
    for(const zone of ZONES){ if(dist>=zone.minDist&&dist<zone.maxDist) return zone; }
    return ZONES[ZONES.length-1];
  }

  _inSafeZone(){
    const c = this.worldSize/2;
    const r = WORLD.safeRadius;
    return Math.abs(this.player.x-c)<=r && Math.abs(this.player.y-c)<=r;
  }

  updateZoneLabel(){
    const zone = this.getCurrentZone();
    const el=document.getElementById('zone-label');
    if(el){
      el.textContent=zone.name;
      el.style.color=zone.colorName||'#fff';
      el.classList.add('show');
    }
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

  teleportToZone(zoneId){
    const zone = ZONES.find(z => z.id === zoneId);
    if (!zone) return;
    const s = this.worldSize;
    const c = s / 2;
    const dist = zoneId === 'hehuan' ? 0 : (zone.minDist + zone.maxDist) / 2;
    const angle = Math.random() * Math.PI * 2;
    const x = Phaser.Math.Clamp(c + Math.cos(angle) * dist, 30, s - 30);
    const y = Phaser.Math.Clamp(c + Math.sin(angle) * dist, 30, s - 30);
    this.player.setPosition(x, y);
    this.moveTarget.set(x, y);
    this.lastZoneId = null;
    this.updateZoneLabel();
    bus.emit('status', '📍 传送至 ' + zone.name, 2);
    bus.emit('save');
  }

  respawnPlayer(){
    P.hp=P.maxHp;
    this.playerDead=false;
    this.player.setAlpha(1);
    this.player.setPosition(this.worldSize/2,this.worldSize/2);
    this.moveTarget.set(this.worldSize/2,this.worldSize/2);
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
    this.skillEffects?.onBuffCast(color || 0x66ffcc);
  }

  showSkillName(name, color){
    this.skillEffects?.showSkillName(name, color);
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
    const inSafe = this._inSafeZone();
    if (inSafe && !this._wasInSafe) {
      this._wasInSafe = true;
      this.clearEnemies();
      bus.emit('status', '已进入安全区', 1.2);
    } else if (!inSafe && this._wasInSafe) {
      this._wasInSafe = false;
      bus.emit('status', '已离开安全区', 1.2);
    }
    if (inSafe && this.enemies.countActive(true) > 0) this.clearEnemies();
    P.totalPlayTime += dt;
    this.movementSystem.update();
    this.entityAnimationSystem?.update(dt);
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
    this.skillEffects?.updateProjectileTrails();
    if (!this.playerDead && P.hp < P.maxHp) {
      const noEnemies = this.enemies.countActive(true) === 0;
      if (inSafe || noEnemies) {
        const healRate = inSafe ? P.maxHp * 0.05 : P.maxHp * 0.02;
        P.hp = Math.min(P.maxHp, P.hp + healRate * dt);
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
    if (!this.playerDead && !this._inSafeZone()) {
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
      if (this._hudTick > 6) { this._hudTick = 0; bus.emit('hud-refresh'); bus.emit('hotbar-refresh'); updateHotbarCooldowns(); this.updateZoneLabel(); }
    if (time % 2000 < delta * 1.5) bus.emit('check-achievements');
  }
}
