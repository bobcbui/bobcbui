export const REALMS = [
  { id:'mortal',name:'鍑′綋',stages:1,hpBonus:0,atkBonus:0,defBonus:0,reqKills:0 },
  { id:'liangi',name:'鐐兼皵鏈?,stages:9,hpBonus:20,atkBonus:3,defBonus:2,reqKills:5 },
  { id:'zhuji',name:'绛戝熀鏈?,stages:9,hpBonus:60,atkBonus:8,defBonus:5,reqKills:20 },
  { id:'jindan',name:'閲戜腹鏈?,stages:9,hpBonus:150,atkBonus:18,defBonus:12,reqKills:60 },
  { id:'yuanying',name:'鍏冨┐鏈?,stages:9,hpBonus:400,atkBonus:40,defBonus:25,reqKills:150 },
  { id:'huashen',name:'鍖栫鏈?,stages:9,hpBonus:1000,atkBonus:90,defBonus:55,reqKills:400 },
  { id:'dacheng',name:'澶т箻鏈?,stages:9,hpBonus:2500,atkBonus:200,defBonus:120,reqKills:1000 },
  { id:'dujie',name:'娓″姭鏈?,stages:9,hpBonus:6000,atkBonus:450,defBonus:260,reqKills:2500 },
  { id:'feisheng',name:'椋炲崌澧?,stages:1,hpBonus:15000,atkBonus:1000,defBonus:600,reqKills:0 }
];
export function getRealm(rId){ return REALMS.find(r=>r.id===rId)||REALMS[0]; }
export function getRealmIndex(rId){ return REALMS.findIndex(r=>r.id===rId); }

const LEGACY_SKILL_DEFS = [
  { id:'swordfly',name:'椋炲墤鏈?,short:'鍓?,slot:'Q',baseDmg:0.7,range:280,desc:'閿佸畾鏁屼汉锛岃繙璺濋鍓?,type:'basic',color:0x6f9eb8,texture:'swordQi',cooldown:0.7 },
  { id:'fireball',name:'鐏悆鏈?,short:'鐏?,baseDmg:1.4,range:210,desc:'鐏悆缁忚繃澶勭暀涓?0绉掓畫鐒帮紝鏁屼汉韪忓叆浼氭寔缁彈浼?,type:'basic',color:0xc95f36,texture:'fireball',cooldown:1.2 },
  { id:'swordrush',name:'寰″墤鏈?,short:'寰?,baseDmg:0.7,range:200,desc:'涓夋妸椋炲墤榻愬皠',type:'multi',color:0x99ddff,texture:'swordQi',count:3,cooldown:1.5 },
  { id:'thunderbolt',name:'钀介浄',short:'闆?,baseDmg:2.0,range:200,desc:'鍗曚綋楂樹激闆峰嚮',type:'single',color:0xd6a742,texture:'bolt',cooldown:2.0 },
  { id:'earthshield',name:'鍦熺浘',short:'鍦?,desc:'鍦熺伒鐜粫锛屽惛鏀?0%浼ゅ',type:'shield',shieldPct:0.3,duration:6,cooldown:8,color:0x8b6914 },
  { id:'swordshield',name:'鍓戠浘',short:'缃?,desc:'鍓戞皵鎶や綋锛屽噺浼?0%骞跺弽寮?,type:'shield',shieldPct:0.2,reflectDmg:8,duration:5,cooldown:7,color:0x5599cc },
  { id:'goldshield',name:'閲戠浘',short:'閲?,desc:'閲戦挓缃╋紝鍑忎激50%',type:'shield',shieldPct:0.5,duration:4,cooldown:12,color:0xffd700 },
  { id:'speedbuff',name:'鐤鹃姝?,short:'鐤?,desc:'绉婚€?40%锛屾寔缁?绉?,type:'buff',speedBoost:0.4,duration:6,cooldown:10,color:0x66ffcc },
  { id:'atkbuff',name:'鎴樻剰',short:'鎴?,desc:'鏀婚€?30%锛屼激瀹?20%',type:'buff',speedBoost:0.15,atkBoost:0.2,duration:5,cooldown:12,color:0xff8866 },
  { id:'rangebuff',name:'楣扮溂',short:'鐪?,desc:'鏀诲嚮璺濈+50%锛屾寔缁?绉?,type:'buff',rangeBoost:0.5,duration:8,cooldown:10,color:0x55aadd },
  { id:'waterdomain',name:'姘村煙鏈?,short:'姘?,baseDmg:0.5,range:170,desc:'姘村煙锛屼激瀹冲苟杩熺紦鏁屼汉',type:'domain',aoeRadius:150,slow:0.4,cooldown:4,color:0x5aa6b1,texture:'water' },
  { id:'thunder',name:'闆峰煙',short:'闆?,baseDmg:0.35,range:320,desc:'浠ヨ嚜韬负涓績灞曞紑5绉掗浄鍩燂紝鑼冨洿骞夸絾浼ゅ杈冧綆',type:'domain',aoeRadius:300,cooldown:30,duration:8,color:0xd6a742,texture:'bolt',selfCenter:false },
  { id:'tornado',name:'椋庡煙',short:'椋?,baseDmg:0.6,range:190,desc:'椋庡嵎鏁屼汉锛屾媺鎵仛鎬?,type:'domain',aoeRadius:165,cooldown:4,color:0x9fb884,texture:'wind' },
];

export const SKILL_DEFS = [
  { id:'swordfly',name:'椋炲墤鏈?,short:'鍓?,slot:'Q',baseDmg:0.7,range:300,desc:'閿佸畾鏁屼汉锛岃繙璺濋鍓戞敾鍑?,type:'basic',color:0x6f9eb8,texture:'swordQi',cooldown:0.65 },
  { id:'earthmove',name:'治疗',short:'疗',desc:'立即恢复10%最大生命，冷却30秒',type:'heal',healPct:0.1,cooldown:30,color:0x66d98f },
  { id:'firedomain',name:'火球术',short:'火',baseDmg:0.55,range:9999,desc:'攻击可视区域内敌人，向6个方向发射小火球，不再生成火域',type:'ground',aoeRadius:95,duration:8,cooldown:8,color:0xc95f36,texture:'fireball' },
  { id:'thunder',name:'闆峰煙',short:'闆?,baseDmg:0.35,range:320,desc:'鍙戝皠宸ㄥぇ闆风悆鍛戒腑鍚庢墿鏁ｉ浄鍩燂紝鎸佺画8绉?,type:'domain',aoeRadius:300,cooldown:30,duration:8,color:0xd6a742,texture:'bolt',selfCenter:false },
  { id:'hailstorm',name:'高能射线',short:'射',baseDmg:0.35,range:9999,desc:'对所有敌人发射鲜红激光射线',type:'domain',aoeRadius:145,duration:8,cooldown:10,color:0xff2a2a,texture:'bolt' },
];

const ENEMY_HP_TIER_MULT = Object.freeze({ normal: 1, elite: 2, boss: 5 });

export const COMBAT_TUNING = Object.freeze({
  maxActiveEnemies: 8,
  initialEnemyCount: 4,
  spawnInterval: Object.freeze({ empty: 1.8, refill: 2.6, capped: 3.4 }),
  playerDamageScale: 70,
  enemyHpScale: 190,
  enemyHpTierMult: ENEMY_HP_TIER_MULT,
  hpBar: Object.freeze({ normalWidth: 28, bossWidth: 38, height: 5 })
});

export const EQ_TYPES = ['weapon','helmet','armor','boots','ring','amulet'];
export const EQ_NAMES = { weapon:'姝﹀櫒',helmet:'澶寸洈',armor:'琛ｆ湇',boots:'闉嬪瓙',ring:'鎴掓寚',amulet:'椤归摼' };
export const RARITY_LABEL = { common:'鍑″搧',uncommon:'涓嬪搧',rare:'涓搧',epic:'涓婂搧',legendary:'鏋佸搧',mythic:'浠欏搧' };
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
  { id:'hehuan',  name:'鍚堟瀹?,   minDist:0,    maxDist:700,  monsterLv:1,  color:0xf0e0c8, colorName:'#c9a96e' },
  { id:'yaoshou', name:'濡栧吔璋?,   minDist:700,  maxDist:1400, monsterLv:5,  color:0xb8a878, colorName:'#7a6020' },
  { id:'xueshan', name:'闆北',     minDist:1400, maxDist:2200, monsterLv:9,  color:0xb8d8e8, colorName:'#5a8a9a' },
  { id:'huoyan',  name:'鐏劙灞?,   minDist:2200, maxDist:3100, monsterLv:14, color:0xd89878, colorName:'#b84a2a' },
  { id:'shenyuan',name:'娣辨笂',     minDist:3100, maxDist:4000, monsterLv:19, color:0x8866aa, colorName:'#5a3a7a' },
  { id:'wanjian', name:'涓囧墤宄?,   minDist:4000, maxDist:4700, monsterLv:24, color:0xaabbcc, colorName:'#6a8aaa' },
  { id:'youming', name:'骞藉啣娴?,   minDist:4700, maxDist:5200, monsterLv:29, color:0x446688, colorName:'#3a5a7a' },
  { id:'jiutian', name:'涔濆ぉ闆峰煙', minDist:5200, maxDist:6000, monsterLv:34, color:0xccaa44, colorName:'#b89a2a' },
];

export const MAPS = [];

const sectZone = ZONES.find(zone => zone.id === 'hehuan');
if (sectZone) sectZone.name = '鍙ゅ墤闂?;

export const BESTIARY = {
  hehuan:[
    { name:'鐏靛厰',hp:20,atk:4,speed:35,xp:3,gold:2,atkType:'melee' },
    { name:'閲庣嫍',hp:28,atk:6,speed:45,xp:4,gold:3,atkType:'melee' },
    { name:'姣掕渹',hp:18,atk:9,speed:50,xp:4,gold:3,atkType:'ranged',atkRange:180,atkCD:3,projColor:0x88cc44 }
  ],
  yaoshou:[
    { name:'濡栫嫾',hp:40,atk:10,speed:45,xp:6,gold:4,atkType:'melee' },
    { name:'鐭冲個',hp:55,atk:12,speed:30,xp:8,gold:6,atkType:'melee' },
    { name:'姣掕潕',hp:35,atk:16,speed:50,xp:9,gold:7,atkType:'ranged',atkRange:200,atkCD:2.5,projColor:0x88cc44 }
  ],
  xueshan:[
    { name:'闆嫾',hp:70,atk:20,speed:50,xp:14,gold:10,atkType:'melee' },
    { name:'鍐伴瓌',hp:85,atk:25,speed:30,xp:16,gold:12,atkType:'ranged',atkRange:220,atkCD:3,projColor:0x88ccff },
    { name:'闇滃法浜?,hp:110,atk:22,speed:25,xp:18,gold:15,atkType:'melee' }
  ],
  huoyan:[
    { name:'鐐庨瓟',hp:140,atk:38,speed:35,xp:28,gold:20,atkType:'ranged',atkRange:240,atkCD:3,projColor:0xff6633 },
    { name:'鐏洘',hp:120,atk:45,speed:55,xp:32,gold:24,atkType:'ranged',atkRange:260,atkCD:2.8,projColor:0xff4422 },
    { name:'鐔斿博鍏?,hp:200,atk:35,speed:28,xp:35,gold:28,atkType:'melee' }
  ],
  shenyuan:[
    { name:'褰遍瓟',hp:250,atk:55,speed:40,xp:45,gold:35,atkType:'ranged',atkRange:250,atkCD:2.5,projColor:0x9944cc },
    { name:'娣辨笂棰嗕富',hp:350,atk:65,speed:30,xp:55,gold:45,atkType:'melee' },
    { name:'鍣瓊鑰?,hp:200,atk:70,speed:55,xp:50,gold:40,atkType:'ranged',atkRange:280,atkCD:2,projColor:0x6644dd }
  ],
  wanjian:[
    { name:'鍓戠伒',hp:380,atk:80,speed:45,xp:65,gold:50,atkType:'ranged',atkRange:300,atkCD:2.5,projColor:0x88bbff },
    { name:'鍓戠健',hp:450,atk:75,speed:35,xp:70,gold:55,atkType:'melee' },
    { name:'椋炲墤濡?,hp:300,atk:90,speed:60,xp:75,gold:60,atkType:'ranged',atkRange:320,atkCD:2,projColor:0x6699dd }
  ],
  youming:[
    { name:'骞介瓊',hp:500,atk:100,speed:50,xp:90,gold:70,atkType:'ranged',atkRange:280,atkCD:2.2,projColor:0x334488 },
    { name:'娴峰',hp:560,atk:110,speed:40,xp:95,gold:75,atkType:'ranged',atkRange:300,atkCD:2.5,projColor:0x224488 },
    { name:'鍐ュ吔',hp:650,atk:95,speed:35,xp:100,gold:80,atkType:'melee' }
  ],
  jiutian:[
    { name:'闆峰吔',hp:700,atk:130,speed:55,xp:120,gold:95,atkType:'ranged',atkRange:320,atkCD:2,projColor:0xccbb44 },
    { name:'澶╅浄灏?,hp:800,atk:140,speed:40,xp:130,gold:105,atkType:'ranged',atkRange:340,atkCD:2.5,projColor:0xffdd44 },
    { name:'鍔浄榫?,hp:950,atk:120,speed:30,xp:140,gold:115,atkType:'melee' }
  ]
};
export const BOSS_NAMES = ['濡栧吔鐜?,'闆北涔嬩富','鐐庡笣鍒嗚韩','娣辨笂榄旂','涓囧墤灏婅€?,'骞藉啣娴风殗','涔濋渼闆峰笣','涔濆熬澶╃嫄'];

export const ACHIEVEMENTS = [
  { id:'kill_10', name:'鍒濆嚭鑼呭簮', desc:'鍑绘潃10鍙鍏?, icon:'鈿旓笍', check:(p)=>p.kills>=10, reward:{gold:50} },
  { id:'kill_50', name:'鐚庡鑳芥墜', desc:'鍑绘潃50鍙鍏?, icon:'馃棥锔?, check:(p)=>p.kills>=50, reward:{gold:150} },
  { id:'kill_200', name:'鐧惧吔鏂?, desc:'鍑绘潃200鍙鍏?, icon:'馃拃', check:(p)=>p.kills>=200, reward:{gold:500,attrPoints:3} },
  { id:'kill_1000', name:'涓囧灞?, desc:'鍑绘潃1000鍙鍏?, icon:'馃懝', check:(p)=>p.kills>=1000, reward:{gold:2000,attrPoints:10} },
  { id:'level_5', name:'鐣ユ湁灏忔垚', desc:'杈惧埌5绾?, icon:'馃搱', check:(p)=>p.level>=5, reward:{gold:80} },
  { id:'level_10', name:'淇灏忔垚', desc:'杈惧埌10绾?, icon:'馃搳', check:(p)=>p.level>=10, reward:{gold:200,skillPoints:2} },
  { id:'level_20', name:'鐧诲爞鍏ュ', desc:'杈惧埌20绾?, icon:'馃弳', check:(p)=>p.level>=20, reward:{gold:500,skillPoints:5} },
  { id:'realm_zhuji', name:'绛戝熀鎴愬姛', desc:'绐佺牬鑷崇瓚鍩烘湡', icon:'馃П', check:(p)=>getRealmIndex(p.realm)>=2, reward:{gold:300,attrPoints:5} },
  { id:'realm_jindan', name:'閲戜腹澶ф垚', desc:'绐佺牬鑷抽噾涓规湡', icon:'馃拵', check:(p)=>getRealmIndex(p.realm)>=3, reward:{gold:800,attrPoints:10} },
  { id:'realm_yuanying', name:'鍏冨┐鍑轰笘', desc:'绐佺牬鑷冲厓濠存湡', icon:'馃懚', check:(p)=>getRealmIndex(p.realm)>=4, reward:{gold:2000,skillPoints:10} },
  { id:'gold_500', name:'灏忔湁绉搫', desc:'绱鑾峰緱500鐏电煶', icon:'馃挵', check:(p)=>p.totalGoldEarned>=500, reward:{gold:100} },
  { id:'gold_5000', name:'瀵岀敳涓€鏂?, desc:'绱鑾峰緱5000鐏电煶', icon:'馃拵', check:(p)=>p.totalGoldEarned>=5000, reward:{gold:500,attrPoints:3} },
  { id:'equip_legendary', name:'绁炲叺鍒╁櫒', desc:'鑾峰緱涓€浠舵瀬鍝佽澶?, icon:'鉁?, check:(p)=>p.legendaryFound, reward:{gold:300} },
  { id:'wave_10', name:'鍏芥疆骞稿瓨鑰?, desc:'鎾戣繃绗?0娉㈠吔娼?, icon:'馃寠', check:(p)=>p.maxWave>=10, reward:{gold:200,skillPoints:2} },
  { id:'playtime_1h', name:'鍕や慨涓嶈緧', desc:'绱娓告垙1灏忔椂', icon:'鈴?, check:(p)=>p.totalPlayTime>=3600, reward:{gold:100,attrPoints:2} },
];

export const SHOP_ITEMS = [
  { id:'eq_box_common', name:'鍑″搧瑁呭绠?, desc:'闅忔満鑾峰緱涓€浠跺嚒鍝佽澶?, icon:'馃摝', cost:30, effect:'eq_box_common' },
  { id:'eq_box_uncommon', name:'涓嬪搧瑁呭绠?, desc:'闅忔満鑾峰緱涓€浠朵笅鍝佽澶?, icon:'馃摝', cost:80, effect:'eq_box_uncommon' },
  { id:'eq_box_rare', name:'涓搧瑁呭绠?, desc:'闅忔満鑾峰緱涓€浠朵腑鍝佽澶?, icon:'馃摝', cost:200, effect:'eq_box_rare' },
  { id:'eq_box_epic', name:'涓婂搧瑁呭绠?, desc:'闅忔満鑾峰緱涓€浠朵笂鍝佽澶?, icon:'馃摝', cost:500, effect:'eq_box_epic' },
  { id:'attr_reset', name:'娲楅珦涓?, desc:'閲嶇疆鎵€鏈夊睘鎬х偣', icon:'馃拪', cost:100, effect:'attr_reset' },
  { id:'skill_reset', name:'鎮熼亾涓?, desc:'閲嶇疆鎵€鏈夋妧鑳界偣', icon:'馃拪', cost:100, effect:'skill_reset' },
  { id:'gold_bag', name:'鐏电煶琚?, desc:'鑾峰緱100鐏电煶', icon:'馃挵', cost:50, effect:'gold_bag' },
];


