import { P, recalcStats } from './state.js';
import { SKILL_DEFS } from './data.js';

export function tryUseSkill(skillId){
  const scene = window.scene;
  if(!scene || !scene.player) return;
  if(scene.playerDead){ const s=window.setStatus; if(s)s('已殒落，无法使用技能',1.2); return; }
  const def = SKILL_DEFS.find(s=>s.id===skillId);
  if(!def){ const s=window.setStatus; if(s)s('未知技能',1); return; }
  if(P.qi < def.qiCost){ const s=window.setStatus; if(s)s('灵力不足 ('+def.qiCost+')',1.2); return; }
  P.qi -= def.qiCost;
  if(def.type==='buff'){
    if(def.speedBoost) P.buff.speedBoost = def.speedBoost;
    if(def.id==='goldshield') P.buff.shieldPct = 0.6;
    P.buffTimer = def.duration||4;
    const s=window.setStatus; if(s)s(def.name+' 已激活',1.2);
    if(scene.applyBuffVisual) scene.applyBuffVisual(def.color||0x66ffcc);
    const h=window.updateHUD; if(h)h(); return;
  }
  const player = scene.player;
  let tx = player.x+80, ty = player.y;
  const ptr = scene.input.activePointer;
  if(ptr && ptr.worldX) { tx = ptr.worldX; ty = ptr.worldY; }
  const angle = Phaser.Math.Angle.Between(player.x, player.y, tx, ty);
  const dmg = Math.round((P.atk + (P.level*0.5)) * def.baseDmg);
  const s=window.setStatus; if(s)s(def.name+'!',1);
  switch(def.type){
    case 'single':
    case 'pierce':
      if(scene.shootProjectile) scene.shootProjectile(def.id, angle, dmg, def.range);
      break;
    case 'aoe':
      if(scene.doAoeSkill) scene.doAoeSkill(tx, ty, dmg, def.aoeRadius||120, def.color||0xffee44, def.texture);
      break;
    case 'multi':
      if(scene.doMultiProjectile) scene.doMultiProjectile(angle, dmg, def.count||5, def.range, def.texture);
      break;
  }
  const h=window.updateHUD; if(h)h();
}

window.tryUseSkill = tryUseSkill;
