export const REALMS = [
  { id:'mortal',name:'凡体',stages:1,hpBonus:0,atkBonus:0,defBonus:0,reqKills:0 },
  { id:'liangi',name:'炼气期',stages:7,hpBonus:30,atkBonus:5,defBonus:3,reqKills:10 },
  { id:'zhuji',name:'筑基期',stages:7,hpBonus:100,atkBonus:15,defBonus:8,reqKills:40 },
  { id:'jindan',name:'金丹期',stages:7,hpBonus:350,atkBonus:45,defBonus:25,reqKills:120 },
  { id:'yuanying',name:'元婴期',stages:7,hpBonus:1200,atkBonus:140,defBonus:80,reqKills:350 },
];
export function getRealm(rId){ return REALMS.find(r=>r.id===rId)||REALMS[0]; }
export function getRealmIndex(rId){ return REALMS.findIndex(r=>r.id===rId); }

export const SKILL_DEFS = [
  { id:'swordfly',name:'飞剑术',short:'剑',slot:'Q',baseDmg:0.7,range:300,desc:'锁定敌人，远距飞剑攻击',type:'basic',color:0x6f9eb8,texture:'swordQi',cooldown:0.65 },
  { id:'earthmove',name:'治疗',short:'疗',desc:'恢复10%最大生命值',type:'heal',healPct:0.1,cooldown:30,color:0x66d98f },
  { id:'firedomain',name:'巨剑术',short:'巨',baseDmg:1.55,range:9999,desc:'召出一把巨大的飞剑向前猛冲',type:'single',cooldown:8,color:0xffd06a,texture:'swordQi' },
  { id:'thunder',name:'雷域',short:'雷',baseDmg:0.35,range:320,desc:'以自身为中心展开5秒雷域',type:'domain',aoeRadius:300,cooldown:30,duration:5,color:0xd6a742,texture:'bolt',selfCenter:true },
  { id:'hailstorm',name:'高能射线',short:'射',baseDmg:0.35,range:9999,desc:'地面召唤红球，持续发射激光攻击敌人',type:'domain',aoeRadius:145,duration:3,cooldown:10,color:0xff2a2a,texture:'bolt' },
];

const ENEMY_HP_TIER_MULT = Object.freeze({ normal: 1, elite: 2, boss: 5 });

export const COMBAT_TUNING = Object.freeze({
  maxActiveEnemies: 14,
  spawnInterval: Object.freeze({ empty: 1.6, refill: 2.4, capped: 3.2 }),
  playerDamageScale: 70,
  enemyHpScale: 180,
  enemyHpTierMult: ENEMY_HP_TIER_MULT,
  hpBar: Object.freeze({ normalWidth: 28, bossWidth: 38, height: 5 })
});

export const EQ_TYPES = ['weapon','helmet','armor','boots','ring','amulet'];
export const EQ_NAMES = { weapon:'武器',helmet:'头盔',armor:'衣服',boots:'鞋子',ring:'戒指',amulet:'项链' };
export const RARITY_LABEL = { common:'凡品',uncommon:'下品',rare:'中品',epic:'上品',legendary:'极品',mythic:'仙品' };
export const RARITY_MULT = { common:1,uncommon:1.4,rare:2.0,epic:3.0,legendary:5.0,mythic:9.0 };
export const RARITY_COLORS = { common:'#aab',uncommon:'#6de27a',rare:'#65c8ff',epic:'#b388ff',legendary:'#ffd866',mythic:'#ff6a5f' };
export const EQ_BASES = {
  weapon:{ atk:[2,6],speed:[0,0] },
  helmet:{ def:[1,4],hp:[5,20] },
  armor:{ def:[2,6],hp:[10,30] },
  boots:{ speed:[10,30],def:[0,2] },
  ring:{ atk:[1,3],def:[0,2] },
  amulet:{ hp:[10,40],def:[1,4] }
};

export const WORLD = { width: 540, height: 960 };
export const LANES = 5;
export const LANE_WIDTH = Math.floor(WORLD.width / LANES);
export const DEFENSE_LINE_Y = WORLD.height - 180;
export const PLAYER_ZONE_TOP = WORLD.height - 240;

const MONSTER_TEXTURE_MAP = [
  'monster-rabbit', 'monster-wolf', 'monster-spider',
  'monster-golem', 'monster-ice-spirit', 'monster-fire-demon',
  'monster-serpent', 'monster-shadow', 'monster-ghost',
  'monster-sword-spirit', 'monster-sword-golem', 'monster-thunder-beast',
  'monster-thunder-spirit', 'monster-dragon'
];

const WAVE_ENEMY_TEMPLATES = [
  { name:'妖狼',   hp:40,  atk:10, speed:35, xp:8,  gold:5,  atkType:'melee' },
  { name:'石傀',   hp:55,  atk:12, speed:25, xp:10, gold:7,  atkType:'melee' },
  { name:'毒蜂',   hp:28,  atk:14, speed:42, xp:9,  gold:6,  atkType:'ranged', atkRange:200, atkCD:3, projColor:0x88cc44 },
  { name:'炎魔',   hp:80,  atk:22, speed:30, xp:18, gold:12, atkType:'ranged', atkRange:220, atkCD:3, projColor:0xff6633 },
  { name:'冰魄',   hp:70,  atk:20, speed:26, xp:16, gold:10, atkType:'ranged', atkRange:210, atkCD:3, projColor:0x88ccff },
  { name:'霜巨人', hp:120, atk:18, speed:20, xp:22, gold:15, atkType:'melee' },
  { name:'火蛟',   hp:100, atk:28, speed:46, xp:25, gold:18, atkType:'ranged', atkRange:240, atkCD:2.5, projColor:0xff4422 },
  { name:'影魔',   hp:140, atk:30, speed:36, xp:30, gold:22, atkType:'ranged', atkRange:230, atkCD:2.5, projColor:0x9944cc },
  { name:'剑灵',   hp:160, atk:36, speed:40, xp:38, gold:28, atkType:'ranged', atkRange:260, atkCD:2.5, projColor:0x88bbff },
  { name:'幽魂',   hp:200, atk:42, speed:42, xp:50, gold:35, atkType:'ranged', atkRange:250, atkCD:2.2, projColor:0x334488 },
  { name:'海妖',   hp:240, atk:48, speed:36, xp:60, gold:42, atkType:'ranged', atkRange:280, atkCD:2.5, projColor:0x224488 },
  { name:'雷兽',   hp:300, atk:55, speed:46, xp:75, gold:55, atkType:'ranged', atkRange:300, atkCD:2, projColor:0xccbb44 },
];

export function getEnemyTemplateByWave(wave) {
  const idx = Math.min(Math.floor((wave - 1) / 3), WAVE_ENEMY_TEMPLATES.length - 1);
  return WAVE_ENEMY_TEMPLATES[idx];
}

export function getEnemyTexture(tmpl) {
  const idx = WAVE_ENEMY_TEMPLATES.indexOf(tmpl);
  return MONSTER_TEXTURE_MAP[idx % MONSTER_TEXTURE_MAP.length] || 'monster-wolf';
}

export const BOSS_NAMES = ['妖兽王','雪山之主','炎帝分身','深渊魔神','万剑尊者','幽冥海皇','九霄雷帝'];

export const ACHIEVEMENTS = [
  { id:'kill_10', name:'初出茅庐', desc:'击杀10只妖兽', icon:'⚔️', check:(p)=>p.kills>=10, reward:{gold:50} },
  { id:'kill_50', name:'猎妖能手', desc:'击杀50只妖兽', icon:'🗡️', check:(p)=>p.kills>=50, reward:{gold:150} },
  { id:'kill_200', name:'百兽斩', desc:'击杀200只妖兽', icon:'💀', check:(p)=>p.kills>=200, reward:{gold:500,attrPoints:3} },
  { id:'kill_1000', name:'万妖屠', desc:'击杀1000只妖兽', icon:'👹', check:(p)=>p.kills>=1000, reward:{gold:2000,attrPoints:10} },
  { id:'level_5', name:'略有小成', desc:'达到5级', icon:'📈', check:(p)=>p.level>=5, reward:{gold:80} },
  { id:'level_10', name:'修行小成', desc:'达到10级', icon:'📊', check:(p)=>p.level>=10, reward:{gold:200,skillPoints:2} },
  { id:'level_20', name:'登堂入室', desc:'达到20级', icon:'🏆', check:(p)=>p.level>=20, reward:{gold:500,skillPoints:5} },
  { id:'realm_zhuji', name:'筑基成功', desc:'突破至筑基期', icon:'🧱', check:(p)=>getRealmIndex(p.realm)>=2, reward:{gold:300,attrPoints:5} },
  { id:'realm_jindan', name:'金丹大成', desc:'突破至金丹期', icon:'💎', check:(p)=>getRealmIndex(p.realm)>=3, reward:{gold:800,attrPoints:10} },
  { id:'realm_yuanying', name:'元婴出世', desc:'突破至元婴期', icon:'👶', check:(p)=>getRealmIndex(p.realm)>=4, reward:{gold:2000,skillPoints:10} },
  { id:'gold_500', name:'小有积蓄', desc:'累计获得500灵石', icon:'💰', check:(p)=>p.totalGoldEarned>=500, reward:{gold:100} },
  { id:'gold_5000', name:'富甲一方', desc:'累计获得5000灵石', icon:'💎', check:(p)=>p.totalGoldEarned>=5000, reward:{gold:500,attrPoints:3} },
  { id:'equip_legendary', name:'神兵利器', desc:'获得一件极品装备', icon:'✨', check:(p)=>p.legendaryFound, reward:{gold:300} },
  { id:'wave_10', name:'兽潮幸存者', desc:'撑过第10波兽潮', icon:'🌊', check:(p)=>p.maxWave>=10, reward:{gold:200,skillPoints:2} },
  { id:'playtime_1h', name:'勤修不辍', desc:'累计游戏1小时', icon:'⏰', check:(p)=>p.totalPlayTime>=3600, reward:{gold:100,attrPoints:2} },
];

export const SHOP_ITEMS = [
  { id:'eq_box_common', name:'凡品装备箱', desc:'随机获得一件凡品装备', icon:'📦', cost:30, effect:'eq_box_common' },
  { id:'eq_box_uncommon', name:'下品装备箱', desc:'随机获得一件下品装备', icon:'📦', cost:80, effect:'eq_box_uncommon' },
  { id:'eq_box_rare', name:'中品装备箱', desc:'随机获得一件中品装备', icon:'📦', cost:200, effect:'eq_box_rare' },
  { id:'eq_box_epic', name:'上品装备箱', desc:'随机获得一件上品装备', icon:'📦', cost:500, effect:'eq_box_epic' },
  { id:'attr_reset', name:'洗髓丹', desc:'重置所有属性点', icon:'💊', cost:100, effect:'attr_reset' },
  { id:'skill_reset', name:'悟道丹', desc:'重置所有技能点', icon:'💊', cost:100, effect:'skill_reset' },
  { id:'gold_bag', name:'灵石袋', desc:'获得100灵石', icon:'💰', cost:50, effect:'gold_bag' },
];

export const LEVELS = [
  { id:1, name:'古剑门', desc:'初入仙途', waves:5,  startWave:1,  icon:'🏯', x:0.5, y:0.92, realmReq:'mortal' },
  { id:2, name:'妖兽谷', desc:'妖兽出没', waves:7,  startWave:2,  icon:'🐺', x:0.5, y:0.82, realmReq:'mortal' },
  { id:3, name:'雪山',   desc:'冰天雪地', waves:9,  startWave:3,  icon:'🏔️', x:0.5, y:0.72, realmReq:'mortal' },
  { id:4, name:'火焰山', desc:'烈焰焚天', waves:11, startWave:4,  icon:'🌋', x:0.5, y:0.62, realmReq:'liangi' },
  { id:5, name:'深渊',   desc:'黑暗深渊', waves:13, startWave:5,  icon:'🕳️', x:0.5, y:0.52, realmReq:'liangi' },
  { id:6, name:'万剑峰', desc:'万剑归宗', waves:15, startWave:6,  icon:'⚔️', x:0.5, y:0.42, realmReq:'zhuji' },
  { id:7, name:'幽冥海', desc:'幽冥之海', waves:17, startWave:7,  icon:'🌊', x:0.5, y:0.32, realmReq:'zhuji' },
  { id:8, name:'九天雷域', desc:'九天神雷', waves:20, startWave:8, icon:'⚡', x:0.5, y:0.22, realmReq:'jindan' },
  { id:9, name:'仙府试炼', desc:'仙府传承', waves:25, startWave:9, icon:'🏛️', x:0.5, y:0.12, realmReq:'jindan' },
];
