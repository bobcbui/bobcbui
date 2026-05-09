export const REALMS = [
  { id:'mortal',name:'凡体',stages:1,hpBonus:0,atkBonus:0,defBonus:0,reqKills:0 },
  { id:'liangi',name:'炼气期',stages:9,hpBonus:20,atkBonus:3,defBonus:2,reqKills:5 },
  { id:'zhuji',name:'筑基期',stages:9,hpBonus:60,atkBonus:8,defBonus:5,reqKills:20 },
  { id:'jindan',name:'金丹期',stages:9,hpBonus:150,atkBonus:18,defBonus:12,reqKills:60 },
  { id:'yuanying',name:'元婴期',stages:9,hpBonus:400,atkBonus:40,defBonus:25,reqKills:150 },
  { id:'huashen',name:'化神期',stages:9,hpBonus:1000,atkBonus:90,defBonus:55,reqKills:400 },
  { id:'dacheng',name:'大乘期',stages:9,hpBonus:2500,atkBonus:200,defBonus:120,reqKills:1000 },
  { id:'dujie',name:'渡劫期',stages:9,hpBonus:6000,atkBonus:450,defBonus:260,reqKills:2500 },
  { id:'feisheng',name:'飞升境',stages:1,hpBonus:15000,atkBonus:1000,defBonus:600,reqKills:0 }
];
export function getRealm(rId){ return REALMS.find(r=>r.id===rId)||REALMS[0]; }
export function getRealmIndex(rId){ return REALMS.findIndex(r=>r.id===rId); }

export const SKILL_DEFS = [
  { id:'swordfly',name:'飞剑术',short:'剑',slot:'Q',baseDmg:0.7,range:280,desc:'锁定敌人，远距飞剑',type:'basic',color:0x6f9eb8,texture:'swordQi',cooldown:0.7 },
  { id:'fireball',name:'火球术',short:'火',baseDmg:1.4,range:210,desc:'大火球，伤害更高',type:'basic',color:0xc95f36,texture:'fireball',cooldown:1.2 },
  { id:'swordrush',name:'御剑术',short:'御',baseDmg:0.7,range:200,desc:'三把飞剑齐射',type:'multi',color:0x99ddff,texture:'swordQi',count:3,cooldown:1.5 },
  { id:'thunderbolt',name:'落雷',short:'雳',baseDmg:2.0,range:200,desc:'单体高伤雷击',type:'single',color:0xd6a742,texture:'bolt',cooldown:2.0 },
  { id:'earthshield',name:'土盾',short:'土',desc:'土灵环绕，吸收30%伤害',type:'shield',shieldPct:0.3,duration:6,cooldown:8,color:0x8b6914 },
  { id:'swordshield',name:'剑盾',short:'罡',desc:'剑气护体，减伤20%并反弹',type:'shield',shieldPct:0.2,reflectDmg:8,duration:5,cooldown:7,color:0x5599cc },
  { id:'goldshield',name:'金盾',short:'金',desc:'金钟罩，减伤50%',type:'shield',shieldPct:0.5,duration:4,cooldown:12,color:0xffd700 },
  { id:'speedbuff',name:'疾风步',short:'疾',desc:'移速+40%，持续6秒',type:'buff',speedBoost:0.4,duration:6,cooldown:10,color:0x66ffcc },
  { id:'atkbuff',name:'战意',short:'战',desc:'攻速+30%，伤害+20%',type:'buff',speedBoost:0.15,atkBoost:0.2,duration:5,cooldown:12,color:0xff8866 },
  { id:'rangebuff',name:'鹰眼',short:'眼',desc:'攻击距离+50%，持续8秒',type:'buff',rangeBoost:0.5,duration:8,cooldown:10,color:0x55aadd },
  { id:'waterdomain',name:'水域术',short:'水',baseDmg:0.5,range:170,desc:'水域，伤害并迟缓敌人',type:'domain',aoeRadius:150,slow:0.4,cooldown:4,color:0x5aa6b1,texture:'water' },
  { id:'thunder',name:'雷域',short:'雷',baseDmg:0.9,range:180,desc:'雷击范围敌人，伤害高',type:'domain',aoeRadius:130,cooldown:3,color:0xd6a742,texture:'bolt' },
  { id:'tornado',name:'风域',short:'风',baseDmg:0.6,range:190,desc:'风卷敌人，拉扯聚怪',type:'domain',aoeRadius:165,cooldown:4,color:0x9fb884,texture:'wind' },
];

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

export const WORLD = { size: 8000, safeRadius: 350 };

export const ZONES = [
  { id:'hehuan',  name:'合欢宗',   minDist:0,    maxDist:700,  monsterLv:1,  color:0xf0e0c8, colorName:'#c9a96e' },
  { id:'yaoshou', name:'妖兽谷',   minDist:700,  maxDist:1400, monsterLv:5,  color:0xb8a878, colorName:'#7a6020' },
  { id:'xueshan', name:'雪山',     minDist:1400, maxDist:2200, monsterLv:9,  color:0xb8d8e8, colorName:'#5a8a9a' },
  { id:'huoyan',  name:'火焰山',   minDist:2200, maxDist:3100, monsterLv:14, color:0xd89878, colorName:'#b84a2a' },
  { id:'shenyuan',name:'深渊',     minDist:3100, maxDist:4000, monsterLv:19, color:0x8866aa, colorName:'#5a3a7a' },
  { id:'wanjian', name:'万剑峰',   minDist:4000, maxDist:4700, monsterLv:24, color:0xaabbcc, colorName:'#6a8aaa' },
  { id:'youming', name:'幽冥海',   minDist:4700, maxDist:5200, monsterLv:29, color:0x446688, colorName:'#3a5a7a' },
  { id:'jiutian', name:'九天雷域', minDist:5200, maxDist:6000, monsterLv:34, color:0xccaa44, colorName:'#b89a2a' },
];

export const MAPS = [];

export const BESTIARY = {
  hehuan:[
    { name:'灵兔',hp:20,atk:4,speed:35,xp:3,gold:2,atkType:'melee' },
    { name:'野狗',hp:28,atk:6,speed:45,xp:4,gold:3,atkType:'melee' },
    { name:'毒蜂',hp:18,atk:9,speed:50,xp:4,gold:3,atkType:'ranged',atkRange:180,atkCD:3,projColor:0x88cc44 }
  ],
  yaoshou:[
    { name:'妖狼',hp:40,atk:10,speed:45,xp:6,gold:4,atkType:'melee' },
    { name:'石傀',hp:55,atk:12,speed:30,xp:8,gold:6,atkType:'melee' },
    { name:'毒蝎',hp:35,atk:16,speed:50,xp:9,gold:7,atkType:'ranged',atkRange:200,atkCD:2.5,projColor:0x88cc44 }
  ],
  xueshan:[
    { name:'雪狼',hp:70,atk:20,speed:50,xp:14,gold:10,atkType:'melee' },
    { name:'冰魄',hp:85,atk:25,speed:30,xp:16,gold:12,atkType:'ranged',atkRange:220,atkCD:3,projColor:0x88ccff },
    { name:'霜巨人',hp:110,atk:22,speed:25,xp:18,gold:15,atkType:'melee' }
  ],
  huoyan:[
    { name:'炎魔',hp:140,atk:38,speed:35,xp:28,gold:20,atkType:'ranged',atkRange:240,atkCD:3,projColor:0xff6633 },
    { name:'火蛟',hp:120,atk:45,speed:55,xp:32,gold:24,atkType:'ranged',atkRange:260,atkCD:2.8,projColor:0xff4422 },
    { name:'熔岩兽',hp:200,atk:35,speed:28,xp:35,gold:28,atkType:'melee' }
  ],
  shenyuan:[
    { name:'影魔',hp:250,atk:55,speed:40,xp:45,gold:35,atkType:'ranged',atkRange:250,atkCD:2.5,projColor:0x9944cc },
    { name:'深渊领主',hp:350,atk:65,speed:30,xp:55,gold:45,atkType:'melee' },
    { name:'噬魂者',hp:200,atk:70,speed:55,xp:50,gold:40,atkType:'ranged',atkRange:280,atkCD:2,projColor:0x6644dd }
  ],
  wanjian:[
    { name:'剑灵',hp:380,atk:80,speed:45,xp:65,gold:50,atkType:'ranged',atkRange:300,atkCD:2.5,projColor:0x88bbff },
    { name:'剑罡',hp:450,atk:75,speed:35,xp:70,gold:55,atkType:'melee' },
    { name:'飞剑妖',hp:300,atk:90,speed:60,xp:75,gold:60,atkType:'ranged',atkRange:320,atkCD:2,projColor:0x6699dd }
  ],
  youming:[
    { name:'幽魂',hp:500,atk:100,speed:50,xp:90,gold:70,atkType:'ranged',atkRange:280,atkCD:2.2,projColor:0x334488 },
    { name:'海妖',hp:560,atk:110,speed:40,xp:95,gold:75,atkType:'ranged',atkRange:300,atkCD:2.5,projColor:0x224488 },
    { name:'冥兽',hp:650,atk:95,speed:35,xp:100,gold:80,atkType:'melee' }
  ],
  jiutian:[
    { name:'雷兽',hp:700,atk:130,speed:55,xp:120,gold:95,atkType:'ranged',atkRange:320,atkCD:2,projColor:0xccbb44 },
    { name:'天雷将',hp:800,atk:140,speed:40,xp:130,gold:105,atkType:'ranged',atkRange:340,atkCD:2.5,projColor:0xffdd44 },
    { name:'劫雷龙',hp:950,atk:120,speed:30,xp:140,gold:115,atkType:'melee' }
  ]
};
export const BOSS_NAMES = ['妖兽王','雪山之主','炎帝分身','深渊魔神','万剑尊者','幽冥海皇','九霄雷帝','九尾天狐'];

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
