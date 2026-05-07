export const REALMS = [
  { id:'mortal',name:'凡体',stages:1,hpBonus:0,qiBonus:0,atkBonus:0,defBonus:0,reqKills:0 },
  { id:'liangi',name:'炼气期',stages:9,hpBonus:20,qiBonus:30,atkBonus:3,defBonus:2,reqKills:5 },
  { id:'zhuji',name:'筑基期',stages:9,hpBonus:60,qiBonus:80,atkBonus:8,defBonus:5,reqKills:20 },
  { id:'jindan',name:'金丹期',stages:9,hpBonus:150,qiBonus:200,atkBonus:18,defBonus:12,reqKills:60 },
  { id:'yuanying',name:'元婴期',stages:9,hpBonus:400,qiBonus:500,atkBonus:40,defBonus:25,reqKills:150 },
  { id:'huashen',name:'化神期',stages:9,hpBonus:1000,qiBonus:1200,atkBonus:90,defBonus:55,reqKills:400 },
  { id:'dacheng',name:'大乘期',stages:9,hpBonus:2500,qiBonus:3000,atkBonus:200,defBonus:120,reqKills:1000 },
  { id:'dujie',name:'渡劫期',stages:9,hpBonus:6000,qiBonus:7000,atkBonus:450,defBonus:260,reqKills:2500 },
  { id:'feisheng',name:'飞升境',stages:1,hpBonus:15000,qiBonus:20000,atkBonus:1000,defBonus:600,reqKills:0 }
];
export function getRealm(rId){ return REALMS.find(r=>r.id===rId)||REALMS[0]; }
export function getRealmIndex(rId){ return REALMS.findIndex(r=>r.id===rId); }

export const SKILL_DEFS = [
  { id:'swordfly',name:'飞剑术',key:'AUTO',qiCost:0,baseDmg:1.0,range:230,desc:'普通攻击，自动释放飞剑',realmReq:'mortal',stageReq:1,type:'basic',color:0x6f9eb8,texture:'swordQi' },
  { id:'fireball',name:'火球术',key:'Q',qiCost:8,baseDmg:1.8,range:240,desc:'单体火球',realmReq:'mortal',stageReq:1,type:'single',color:0xc95f36,texture:'fireball' },
  { id:'thunder',name:'雷法',key:'W',qiCost:16,baseDmg:2.4,range:180,desc:'范围雷击',realmReq:'mortal',stageReq:1,type:'aoe',aoeRadius:130,color:0xd6a742,texture:'bolt' },
  { id:'waterdomain',name:'水域术',key:'E',qiCost:18,baseDmg:1.2,range:170,desc:'水域伤害并迟缓敌人',realmReq:'mortal',stageReq:1,type:'water',aoeRadius:150,color:0x5aa6b1,texture:'water' },
  { id:'tornado',name:'龙卷风',key:'R',qiCost:22,baseDmg:1.7,range:190,desc:'风卷范围敌人',realmReq:'mortal',stageReq:1,type:'tornado',aoeRadius:165,color:0x9fb884,texture:'wind' },
];

export const EQ_TYPES = ['weapon','helmet','armor','boots','ring','amulet'];
export const EQ_NAMES = { weapon:'武器',helmet:'头盔',armor:'衣服',boots:'鞋子',ring:'戒指',amulet:'项链' };
export const RARITIES = ['common','uncommon','rare','epic','legendary','mythic'];
export const RARITY_LABEL = { common:'凡品',uncommon:'下品',rare:'中品',epic:'上品',legendary:'极品',mythic:'仙品' };
export const RARITY_MULT = { common:1,uncommon:1.4,rare:2.0,epic:3.0,legendary:5.0,mythic:9.0 };
export const RARITY_COLORS = { common:'#aab',uncommon:'#6de27a',rare:'#65c8ff',epic:'#b388ff',legendary:'#ffd866',mythic:'#ff6a5f' };
export const EQ_BASES = {
  weapon:{ atk:[2,6],speed:[0,0] },
  helmet:{ def:[1,4],hp:[5,20] },
  armor:{ def:[2,6],hp:[10,30] },
  boots:{ speed:[10,30],def:[0,2] },
  ring:{ atk:[1,3],qi:[5,20] },
  amulet:{ hp:[10,40],qi:[10,30] }
};

export const ZONES = [
  { id:'village',name:'灵溪村',color:0x9fbe82,minDist:0,maxDist:500,monsterLv:1,colorName:'#4f7d3f' },
  { id:'mountains',name:'落霞山脉',color:0xd1b06c,minDist:500,maxDist:1100,monsterLv:3,colorName:'#8a6329' },
  { id:'forest',name:'幽暗密林',color:0x7aa879,minDist:1100,maxDist:1700,monsterLv:6,colorName:'#3f7041' },
  { id:'ice',name:'寒冰极域',color:0x9cc9cf,minDist:1700,maxDist:2300,monsterLv:10,colorName:'#3f7e86' },
  { id:'inferno',name:'烈焰炼狱',color:0xc98263,minDist:2300,maxDist:3500,monsterLv:15,colorName:'#9a4634' }
];

export const BESTIARY = {
  village:[{ name:'灵兔',hp:20,atk:4,speed:35,xp:3,gold:2 },{ name:'山鸡',hp:18,atk:3,speed:40,xp:2,gold:1 },{ name:'野狼',hp:30,atk:6,speed:50,xp:4,gold:3 }],
  mountains:[{ name:'石傀',hp:50,atk:10,speed:25,xp:7,gold:5 },{ name:'风狼',hp:40,atk:12,speed:55,xp:8,gold:6 },{ name:'毒蝎',hp:35,atk:15,speed:45,xp:9,gold:7 }],
  forest:[{ name:'树妖',hp:80,atk:20,speed:20,xp:14,gold:10 },{ name:'暗影豹',hp:65,atk:25,speed:60,xp:16,gold:12 },{ name:'魔蛛',hp:55,atk:28,speed:50,xp:18,gold:14 }],
  ice:[{ name:'冰魄',hp:120,atk:35,speed:30,xp:25,gold:18 },{ name:'雪猿',hp:150,atk:40,speed:35,xp:28,gold:20 },{ name:'霜龙蜥',hp:100,atk:45,speed:45,xp:32,gold:24 }],
  inferno:[{ name:'炎魔',hp:200,atk:55,speed:30,xp:40,gold:30 },{ name:'火蛟',hp:180,atk:65,speed:50,xp:45,gold:35 },{ name:'熔岩巨人',hp:300,atk:50,speed:20,xp:50,gold:40 }]
};
export const BOSS_NAMES = ['妖兽头领','山魈王','暗影领主','冰霜巨龙','炎帝分身'];
