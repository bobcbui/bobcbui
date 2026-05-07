import { P, waveNum, waveTimer, wavePending, waveDelay, isCultivating, cultProgress, statusTimer, lootTimer, autoSaveTimer,
  setWaveNum, setWaveTimer, setWavePending, setCultProgress, setAutoSaveTimer, setStatusTimer, setLootTimer, recalcStats, refreshSkills, initHotbar } from './state.js';
import { ZONES, BESTIARY, BOSS_NAMES, SKILL_DEFS, RARITY_LABEL, getRealm, getRealmIndex } from './data.js';
import { genEquipment } from './equipment.js';

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
    g.fillStyle(0xffee88,1); g.fillRect(1,0,5,20); g.fillStyle(0xffffcc,0.5); g.fillRect(0,0,7,20);
    g.generateTexture('bolt',7,20); g.clear();
    g.fillStyle(0x65c8ff,1); g.fillCircle(5,5,4); g.generateTexture('loot',10,10); g.clear();
    g.destroy();
  }
  create(){
    window.scene = this;
    this.worldSize = 3500;
    this.physics.world.setBounds(0,0,this.worldSize,this.worldSize);
    this.ground = this.add.graphics();
    this.drawGround();
    this.player = this.physics.add.sprite(this.worldSize/2, this.worldSize/2, 'player');
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(10);
    this.playerDead = false;
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setZoom(1.2);
    this.cameras.main.setBounds(0,0,this.worldSize,this.worldSize);
    this.enemies = this.physics.add.group();
    this.pickups = this.physics.add.group();
    this.projectiles = this.physics.add.group();
    this.hpBarGfx = this.add.graphics().setDepth(16);
    this.physics.add.overlap(this.projectiles, this.enemies, (proj, en)=>{ this.onProjHit(proj, en); }, null, this);
    this.physics.add.overlap(this.player, this.pickups, (p, pk)=>{ this.onPickup(pk); }, null, this);
    this.physics.add.overlap(this.player, this.enemies, (p, en)=>{ this.onEnemyContact(en); }, null, this);
    for(let i=0;i<8;i++) this.spawnEnemy();
    this.isMoving = false;
    this.moveTarget = new Phaser.Math.Vector2(this.worldSize/2, this.worldSize/2);
    this.input.on('pointerdown', (ptr)=>{
      if(ptr.event.button===0){ this.isMoving=true; this.moveTarget.set(ptr.worldX,ptr.worldY); }
      else if(ptr.event.button===2){ this.placeMarker(ptr.worldX,ptr.worldY); }
    });
    this.input.on('pointerup', (ptr)=>{ if(ptr.event.button===0) this.isMoving=false; });
    this.input.on('pointermove', (ptr)=>{ if(this.isMoving) this.moveTarget.set(ptr.worldX,ptr.worldY); });
    this.input.mouse.disableContextMenu();
    this.keys = this.input.keyboard.addKeys('Q,W,E,R,ONE,TWO,THREE,FOUR,SPACE,B,C,X,Z');
    this.input.keyboard.on('keydown-Q', ()=>{ const fn=window.tryUseSkill; const h=P.hotbar[0]; if(fn&&h&&h.kind==='skill'&&h.id)fn(h.id); });
    this.input.keyboard.on('keydown-W', ()=>{ const fn=window.tryUseSkill; const h=P.hotbar[1]; if(fn&&h&&h.kind==='skill'&&h.id)fn(h.id); });
    this.input.keyboard.on('keydown-E', ()=>{ const fn=window.tryUseSkill; const h=P.hotbar[2]; if(fn&&h&&h.kind==='skill'&&h.id)fn(h.id); });
    this.input.keyboard.on('keydown-R', ()=>{ const fn=window.tryUseSkill; const h=P.hotbar[3]; if(fn&&h&&h.kind==='skill'&&h.id)fn(h.id); });
    this.input.keyboard.on('keydown-SPACE', ()=>{ const fn=window.toggleCultivate; if(fn)fn(); });
    this.input.keyboard.on('keydown-B', ()=>{ const fn=window.toggleCharPanel; if(fn)fn(); });
    this.input.keyboard.on('keydown-C', ()=>{ const fn=window.tryBreakthrough; if(fn)fn(); });
    this.input.keyboard.on('keydown-X', ()=>{ const fn=window.craftPill; if(fn)fn('heal_pill'); });
    this.input.keyboard.on('keydown-ONE', ()=>{ const fn=window.useConsumable; if(fn)fn(0); });
    this.input.keyboard.on('keydown-TWO', ()=>{ const fn=window.useConsumable; if(fn)fn(1); });
    this.input.keyboard.on('keydown-THREE', ()=>{ const fn=window.useConsumable; if(fn)fn(2); });
    this.input.keyboard.on('keydown-FOUR', ()=>{ const fn=window.useConsumable; if(fn)fn(3); });

    this.deathModal = document.getElementById('deathModal');
    const rb = document.getElementById('respawnBtn');
    if(rb) rb.onclick = ()=>{ this.respawnPlayer(); };

    this.marker = null;
    this.lastAutoAtk = 0;
    this.lastZoneId = null;

    const ld=window.loadGame; if(ld)ld();
    const ss=window.setStatus; if(ss)ss('读档成功',1.5);
    recalcStats();
    const h=window.updateHUD; if(h)h();
    const hr=window.hotbarRender; if(hr)hr();
    this.updateZoneLabel();
  }

  drawGround(){
    const g = this.ground; g.clear();
    const s = this.worldSize;
    g.fillStyle(0x1a2a1a,1); g.fillRect(0,0,s,s);
    for(const zone of ZONES){
      for(let x=0;x<s;x+=50){
        for(let y=0;y<s;y+=50){
          const cx=x+25,cy=y+25;
          const dist=Math.sqrt((cx-s/2)*(cx-s/2)+(cy-s/2)*(cy-s/2));
          if(dist>=zone.minDist&&dist<zone.maxDist){
            g.fillStyle(zone.color,0.15+Math.random()*0.1);
            g.fillRect(x-1,y-1,52,52);
          }
        }
      }
    }
    g.fillStyle(0x446644,0.3); g.fillCircle(s/2,s/2,100);
    g.lineStyle(1,0x88aa88,0.2); g.strokeCircle(s/2,s/2,60);
    g.lineStyle(2,0x335533,0.15);
    for(let r=500;r<2000;r+=300) g.strokeCircle(s/2,s/2,r);
  }

  getCurrentZone(){
    const cx=this.player.x,cy=this.player.y;
    const s=this.worldSize/2;
    const dist=Math.sqrt((cx-s)*(cx-s)+(cy-s)*(cy-s));
    for(const zone of ZONES){ if(dist>=zone.minDist&&dist<zone.maxDist) return zone; }
    return ZONES[ZONES.length-1];
  }

  updateZoneLabel(){
    const zone=this.getCurrentZone();
    const el=document.getElementById('zone-label');
    if(el){
      el.textContent='「 '+zone.name+' 」';
      el.style.color=zone.colorName||'#fff';
      el.classList.add('show');
      if(this.zoneFadeTimer) clearTimeout(this.zoneFadeTimer);
      this.zoneFadeTimer=setTimeout(()=>el.classList.remove('show'),2000);
    }
  }

  spawnEnemy(){
    const zone=this.getCurrentZone();
    const list=BESTIARY[zone.id]||BESTIARY.village;
    const tmpl=list[Math.floor(Math.random()*list.length)];
    let x=this.player.x+Phaser.Math.Between(-400,400);
    let y=this.player.y+Phaser.Math.Between(-400,400);
    x=Phaser.Math.Clamp(x,30,this.worldSize-30);
    y=Phaser.Math.Clamp(y,30,this.worldSize-30);
    const isElite=Math.random()<0.08;
    const isBoss=Math.random()<0.01&&zone.monsterLv>=3;
    const texture=isBoss?'boss':(isElite?'elite':'beast');
    const en=this.enemies.create(x,y,texture);
    en.setCollideWorldBounds(true); en.setDepth(5);
    const lvMult=1+(zone.monsterLv-1)*0.3;
    en.setData('hp',Math.round(tmpl.hp*lvMult*(isBoss?4:(isElite?1.8:1))));
    en.setData('maxHp',Math.round(tmpl.hp*lvMult*(isBoss?4:(isElite?1.8:1))));
    en.setData('atk',Math.round(tmpl.atk*lvMult*(isBoss?3:(isElite?1.5:1))));
    en.setData('speed',Math.round(tmpl.speed*(isBoss?0.6:(isElite?0.8:1))));
    en.setData('xp',Math.round(tmpl.xp*lvMult*(isBoss?5:(isElite?2:1))));
    en.setData('gold',Math.round(tmpl.gold*lvMult*(isBoss?6:(isElite?2:1))));
    en.setData('zoneLv',zone.monsterLv);
    en.setData('isBoss',!!isBoss);
    en.setData('isElite',!!isElite);
    const enName=isBoss?BOSS_NAMES[Math.floor(Math.random()*BOSS_NAMES.length)]:(isElite?('精英·'+tmpl.name):tmpl.name);
    en.setData('name',enName); en.setData('dead',false);
    const lbl=this.add.text(x,y-16,enName,{
      fontSize:'11px',fontFamily:'"Segoe UI","Microsoft YaHei",sans-serif',
      color:isBoss?'#ffd866':(isElite?'#65c8ff':'#99aabb'),
      stroke:'#000',strokeThickness:2
    }).setOrigin(0.5).setDepth(15);
    en.setData('label',lbl);
    en.setData('barW',isBoss?32:24);
    return en;
  }

  onProjHit(proj,en){
    if(!proj.active||!en||en.getData('dead')) return;
    const dmg=proj.getData('damage')||10;
    const pierce=proj.getData('pierce');
    this.damageEnemy(en,dmg);
    if(!pierce) proj.destroy();
  }

  damageEnemy(en,dmg){
    if(en.getData('dead')) return;
    const hp=en.getData('hp')-dmg;
    en.setData('hp',hp);
    en.setTint(0xffffff);
    this.time.delayedCall(60,()=>{if(en.active)en.clearTint();});
    const dtxt=this.add.text(en.x+Phaser.Math.Between(-8,8),en.y-10,'-'+dmg,{
      fontSize:'13px',fontFamily:'"Segoe UI","Microsoft YaHei",sans-serif',
      color:'#ff8866',fontStyle:'bold',stroke:'#000',strokeThickness:2
    }).setDepth(20).setOrigin(0.5);
    this.tweens.add({targets:dtxt,y:dtxt.y-35,alpha:0,duration:700,onComplete:()=>dtxt.destroy()});
    if(hp<=0){
      en.setData('dead',true);
      const lbl=en.getData('label');if(lbl)lbl.destroy();
      const ex=en.x,ey=en.y;
      const name=en.getData('name')||'妖兽';
      const xp=en.getData('xp')||1;
      const gold=en.getData('gold')||1;
      const isBoss=en.getData('isBoss');
      const isElite=en.getData('isElite');
      en.destroy();
      P.xp+=xp;P.gold+=gold;P.kills++;
      while(P.xp>=P.xpToNext){
        P.xp-=P.xpToNext;P.level+=1;
        P.xpToNext=Math.round(10*Math.pow(1.15,P.level-1));
        recalcStats();
        const ss=window.setStatus;if(ss)ss('🎉 升级！当前Lv.'+P.level,2);
      }
      const zoneLv=en.getData('zoneLv')||1;
      recalcStats();
      const ss=window.setStatus;if(ss)ss('击杀 '+name+' +'+xp+'exp +'+gold+'灵石',1.5);
      if(Math.random()<(isBoss?0.9:(isElite?0.4:0.15))){
        const eq=genEquipment(zoneLv,isBoss?'legendary':null);
        if(P.inventory.length<30){P.inventory.push(eq);const sl=window.setLoot;if(sl)sl('🎁 获得 ['+RARITY_LABEL[eq.rarity]+'] '+eq.name);}
      }
      if(Math.random()<0.2&&P.inventory.length<30){
        const pTypes=['heal_pill','qi_pill','buff_pill'];
        const pType=pTypes[Math.floor(Math.random()*Math.min(3,1+Math.floor(zoneLv/5)))];
        const pNames={heal_pill:'回血丹',qi_pill:'回灵丹',buff_pill:'爆气丹'};
        const uid=Date.now()+'_'+Math.random().toString(36).slice(2,6);
        P.inventory.push({id:uid,name:pNames[pType],type:'consumable',subType:pType});
        for(let i=4;i<8;i++){const h=P.hotbar[i];if(h.kind==='consumable'&&!h.id){h.id=pType;h.uid=uid;break;}}
        if(Math.random()<0.1){const sl=window.setLoot;if(sl)sl('💊 获得 '+pNames[pType]);}
      }
      P.gold=Math.min(P.gold,99999);
      const h=window.updateHUD;if(h)h();
      const hr=window.hotbarRender;if(hr)hr();
      const sg=window.saveGame;if(sg)sg();
    }
  }

  onPickup(pk){
    if(!pk)return;
    const type=pk.getData('type');
    pk.destroy();
    if(type==='gold'){
      P.gold+=pk.getData('amount')||5;
      const ss=window.setStatus;if(ss)ss('灵石 +'+pk.getData('amount'),1);
      const h=window.updateHUD;if(h)h();
    }
  }

  onEnemyContact(en){
    if(en.getData('dead')||this.playerDead)return;
    const now=this.time.now;
    const lastHit=en.getData('lastContactTime')||0;
    if(now-lastHit<600)return;
    en.setData('lastContactTime',now);
    let atk=en.getData('atk')||5;
    const shieldMult=P.buff.shieldPct>0?(1-P.buff.shieldPct):1;
    const dmg=Math.max(1,Math.round((atk*0.5-P.def*0.3)*shieldMult));
    P.hp=Math.max(0,P.hp-dmg);
    this.damageFlash(0.25);
    if(P.hp<=0&&!this.playerDead){
      this.playerDead=true;
      this.player.setAlpha(0.3);
      this.player.setVelocity(0,0);
      this.isMoving=false;
      if(this.playerAura){this.playerAura.destroy();this.playerAura=null;}
      const lostGold=Math.round(P.gold*0.15);
      P.gold=Math.max(0,P.gold-lostGold);
      if(this.deathModal)this.deathModal.classList.remove('hidden');
      const ss=window.setStatus;if(ss)ss('💀 道殒！损失 '+lostGold+' 灵石',3);
    }
    const h=window.updateHUD;if(h)h();
  }

  damageFlash(t){
    const el=document.getElementById('damageFlash');
    if(!el)return;
    el.style.opacity='1';
    clearTimeout(el._to);
    el._to=setTimeout(()=>{el.style.opacity='0';},60);
  }

  respawnPlayer(){
    P.hp=P.maxHp;P.qi=P.maxQi;
    this.playerDead=false;
    this.player.setAlpha(1);
    this.player.setPosition(this.worldSize/2,this.worldSize/2);
    this.moveTarget.set(this.worldSize/2,this.worldSize/2);
    if(this.deathModal)this.deathModal.classList.add('hidden');
    recalcStats();
    const ss=window.setStatus;if(ss)ss('转生归来',1.5);
    const h=window.updateHUD;if(h)h();
    const sg=window.saveGame;if(sg)sg();
  }

  placeMarker(x,y){
    if(this.marker)this.marker.destroy();
    this.marker=this.add.circle(x,y,7,0xffffff,0.5).setDepth(20);
    this.time.delayedCall(1200,()=>{if(this.marker){this.marker.destroy();this.marker=null;}});
  }

  shootProjectile(skillId,angle,dmg,range){
    const tex={'fireball':'fireball','swordfly':'swordQi','divinestrike':'swordQi','spaceslash':'swordQi'}[skillId]||'arrow';
    const proj=this.projectiles.create(this.player.x,this.player.y,tex);
    if(!proj)return;
    proj.setDepth(8);
    if(proj.body)proj.body.allowGravity=false;
    this.physics.velocityFromRotation(angle,skillId==='spaceslash'?700:450,proj.body.velocity);
    proj.rotation=angle;
    const isPierce=['swordfly','divinestrike','spaceslash'].includes(skillId);
    proj.setData('damage',dmg);proj.setData('pierce',isPierce);
    this.time.delayedCall(isPierce?1500:1200,()=>{if(proj.active)proj.destroy();});
  }

  doAoeSkill(tx,ty,dmg,radius,color,texture){
    if(texture==='bolt'){
      const bolt=this.add.sprite(tx,ty,'bolt').setDepth(9).setScale(2);
      this.tweens.add({targets:bolt,alpha:0,scale:3,duration:400,onComplete:()=>bolt.destroy()});
    }
    const circle=this.add.circle(tx,ty,radius,color||0xffee44,0.15).setDepth(7);
    this.tweens.add({targets:circle,alpha:0,scale:1.4,duration:500,onComplete:()=>circle.destroy()});
    this.enemies.children.iterate((en)=>{
      if(!en||en.getData('dead'))return;
      const dx=en.x-tx,dy=en.y-ty;
      if(dx*dx+dy*dy<=radius*radius)this.damageEnemy(en,dmg);
    });
  }

  doMultiProjectile(angle,dmg,count,range,texture){
    const offsets=[];
    for(let i=0;i<count;i++)offsets.push((i/(count-1)-0.5)*0.6);
    offsets.forEach(o=>{
      const ang=angle+o;
      const proj=this.projectiles.create(this.player.x,this.player.y,texture||'swordQi');
      if(proj){
        proj.setDepth(8).setScale(0.8);
        if(proj.body)proj.body.allowGravity=false;
        this.physics.velocityFromRotation(ang,460,proj.body.velocity);
        proj.rotation=ang;
        proj.setData('damage',Math.round(dmg*0.6));
        proj.setData('pierce',false);
        this.time.delayedCall(1000,()=>{if(proj.active)proj.destroy();});
      }
    });
  }

  applyBuffVisual(color){
    const c=this.add.circle(this.player.x,this.player.y,30,color||0x66ffcc,0.2).setDepth(3);
    this.tweens.add({targets:c,alpha:0,scale:2,duration:600,onComplete:()=>c.destroy()});
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
    P.totalPlayTime+=dt;
    if(this.isMoving&&!this.playerDead){
      const dir=new Phaser.Math.Vector2(this.moveTarget.x-this.player.x,this.moveTarget.y-this.player.y);
      const dist=Math.max(0.01,dir.length());
      let spd=P.speed;
      if(P.buffTimer>0&&P.buff.speedBoost)spd*=(1+P.buff.speedBoost);
      if(dist>5){dir.scale(spd/dist);this.player.setVelocity(dir.x,dir.y);}
      else this.player.setVelocity(0,0);
    }else if(!this.playerDead) this.player.setVelocity(0,0);
    if(!this.playerDead) P.qi=Math.min(P.maxQi,P.qi+P.maxQi*0.015*dt);
    if(isCultivating&&!this.playerDead){
      const cultRate=0.02+getRealmIndex(P.realm)*0.005;
      let cp=cultProgress+cultRate*dt;
      P.qi=Math.min(P.maxQi,P.qi+P.maxQi*0.08*dt);
      if(cp>=1){
        cp=0;
        const r=getRealm(P.realm);
        if(P.stage<r.stages){
          P.stage++;recalcStats();refreshSkills();initHotbar();
          const ss=window.setStatus;if(ss)ss('🌊 '+(r.name)+' '+(P.stage)+'层！',2);
          const h=window.updateHUD;if(h)h();const hr=window.hotbarRender;if(hr)hr();const sg=window.saveGame;if(sg)sg();
        }else{const ss=window.setStatus;if(ss)ss('⚡ 境界圆满，按 C 尝试突破！',2);}
      }
      setCultProgress(cp);
      if(Math.random()<0.3){
        const px=this.player.x+Phaser.Math.Between(-20,20),py=this.player.y+Phaser.Math.Between(-20,20);
        const dot=this.add.circle(px,py,3,0x88ddff,0.6).setDepth(2);
        this.tweens.add({targets:dot,alpha:0,y:py-30,duration:600,onComplete:()=>dot.destroy()});
      }
    }
    if(P.buffTimer>0){P.buffTimer-=dt;if(P.buffTimer<=0){P.buff.speedBoost=0;P.buff.shieldPct=0;}}
    if(!this.playerDead){
      const atkInterval=Math.max(0.3,0.8-P.level*0.005);
      if(time-this.lastAutoAtk>atkInterval*1000){
        this.lastAutoAtk=time;
        let target=null,bestD2=Infinity;
        const range=180+getRealmIndex(P.realm)*10,r2=range*range;
        this.enemies.children.iterate((en)=>{
          if(!en||en.getData('dead'))return;
          const dx=en.x-this.player.x,dy=en.y-this.player.y,d2=dx*dx+dy*dy;
          if(d2<r2&&d2<bestD2){bestD2=d2;target=en;}
        });
        if(target){
          const angle=Phaser.Math.Angle.Between(this.player.x,this.player.y,target.x,target.y);
          const autoSkillId=(P.hotbar[0]&&P.hotbar[0].kind==='skill')?P.hotbar[0].id:null;
          const autoDef=autoSkillId?SKILL_DEFS.find(s=>s.id===autoSkillId):null;
          if(autoDef&&autoDef.type!=='buff'){
            const dmg=Math.round((P.atk+P.level*0.5)*autoDef.baseDmg*0.5);
            if(P.qi>=autoDef.qiCost*0.3){
              P.qi=Math.max(0,P.qi-Math.round(autoDef.qiCost*0.3));
              if(autoDef.type==='single'||autoDef.type==='pierce') this.shootProjectile(autoDef.id,angle,dmg,autoDef.range);
              else if(autoDef.type==='aoe') this.doAoeSkill(target.x,target.y,dmg,autoDef.aoeRadius||120,autoDef.color,autoDef.texture);
              else if(autoDef.type==='multi') this.doMultiProjectile(angle,dmg,Math.min(autoDef.count||5,3),autoDef.range,autoDef.texture);
            }
          } else {
            const dmg=Math.round(P.atk*(0.5+Math.random()*0.3));
            this.shootProjectile('fireball',angle,dmg,220);
          }
        }
      }
    }
    const curZone=this.getCurrentZone();
    if(curZone.id!==this.lastZoneId){this.lastZoneId=curZone.id;this.updateZoneLabel();}
    this.hpBarGfx.clear();
    this.enemies.children.iterate((en)=>{
      if(!en||en.getData('dead'))return;
      this.physics.moveToObject(en,this.player,en.getData('speed')||30);
      const lbl=en.getData('label');if(lbl)lbl.setPosition(en.x,en.y-16);
      const bw=en.getData('barW')||24, bh=3;
      const yPos=en.y-24;
      const cur=en.getData('hp')||0,full=en.getData('maxHp')||1;
      const pct=Math.max(0,Math.min(1,cur/full));
      this.hpBarGfx.fillStyle(0x333344,0.7);
      this.hpBarGfx.fillRect(en.x-bw/2,yPos,bw,bh);
      this.hpBarGfx.fillStyle(pct>0.6?0x6de27a:pct>0.3?0xffd866:0xff6a5f,1);
      this.hpBarGfx.fillRect(en.x-bw/2,yPos,Math.max(0,bw*pct),bh);
    });
    if(!this.playerDead){
      if(!this.playerAura||!this.playerAura.active){
        const colors=[0x6de27a,0x66ffcc,0x88ccff,0xffd700,0xcc66ff,0xff8866,0xaa44ff,0xffffff,0xffdd00];
        const cIdx=Math.min(getRealmIndex(P.realm),colors.length-1);
        this.playerAura=this.add.circle(this.player.x,this.player.y,22,colors[cIdx]||0x6de27a,0.15).setDepth(1);
        this.tweens.add({targets:this.playerAura,alpha:0.08,scale:1.6,duration:1200,yoyo:true,repeat:-1});
      }else this.playerAura.setPosition(this.player.x,this.player.y);
    }
    const alive=this.enemies.countActive(true);
    if(alive===0){
      if(!wavePending){setWavePending(true);setWaveTimer(0);const ss=window.setStatus;if(ss)ss('区域已清，休整中...',1.5);}
      else{
        let wt=waveTimer+dt;
        if(wt>=waveDelay){
          let wn=waveNum+1;setWaveNum(wn);
          const count=Math.min(4+wn*2,30);
          for(let i=0;i<count;i++)this.spawnEnemy();
          if(wn%5===0){
            const bos=this.spawnEnemy();
            if(bos){
              bos.setData('hp',bos.getData('hp')*3);bos.setData('atk',bos.getData('atk')*2);
              bos.setData('xp',bos.getData('xp')*5);bos.setData('isBoss',true);
              bos.setTexture('boss');bos.setScale(1.3);
              const ss=window.setStatus;if(ss)ss('👑 妖兽王降临！',2.5);
            }
          }
          setWavePending(false);wt=0;
          const ss=window.setStatus;if(ss)ss('⚔️ 第 '+wn+' 波来袭！',2);
        }
        setWaveTimer(wt);
      }
    } else if(wavePending){setWavePending(false);setWaveTimer(0);}
    if(this.enemies.countActive(true)<4&&Math.random()<0.02)this.spawnEnemy();
    let st=statusTimer;
    if(st>0){st-=dt;if(st<=0){const el=document.getElementById('status');if(el)el.classList.remove('show');}}
    setStatusTimer(st);
    let lt=lootTimer;
    if(lt>0){lt-=dt;if(lt<=0){const el=document.getElementById('loot-popup');if(el)el.classList.remove('show');}}
    setLootTimer(lt);
    let at=autoSaveTimer+dt;
    if(at>=30){at=0;const sg=window.saveGame;if(sg)sg();}
    setAutoSaveTimer(at);
    const h=window.updateHUD;if(h)h();const hr=window.hotbarRender;if(hr)hr();
  }
}
