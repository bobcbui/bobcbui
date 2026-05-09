import { EQ_TYPES, EQ_BASES, RARITY_MULT, RARITY_LABEL, RARITY_COLORS } from '../data/index.js';

export function genEquipment(monsterLv, forceRarity=null){
  const rarityRoll = Math.random();
  let rarity;
  if(forceRarity) rarity = forceRarity;
  else if(monsterLv>=15 && rarityRoll<0.02) rarity = 'mythic';
  else if(monsterLv>=10 && rarityRoll<0.06) rarity = 'legendary';
  else if(monsterLv>=7 && rarityRoll<0.15) rarity = 'epic';
  else if(monsterLv>=4 && rarityRoll<0.35) rarity = 'rare';
  else if(monsterLv>=2 && rarityRoll<0.65) rarity = 'uncommon';
  else rarity = 'common';

  const type = EQ_TYPES[Math.floor(Math.random()*EQ_TYPES.length)];
  const base = EQ_BASES[type];
  const mult = RARITY_MULT[rarity];
  const stats = {};
  for(const [key,range] of Object.entries(base)){
    if(range[1]<=0) continue;
    const val = Math.max(1, Math.round((range[0] + Math.random()*(range[1]-range[0])) * mult * (0.8 + Math.random()*0.4)));
    stats[key] = val;
  }
  const prefix = { common:'粗糙的',uncommon:'普通的',rare:'精良的',epic:'卓越的',legendary:'完美的',mythic:'仙品的' }[rarity];
  const names = {
    weapon:['木剑','铁剑','灵剑','玄铁重剑','飞虹剑','承影剑'],
    helmet:['布冠','铁盔','玄铁冠','灵玉冠','星辰冠','乾坤冠'],
    armor:['布衣','皮甲','锁子甲','玄铁甲','金蚕丝甲','龙鳞甲'],
    boots:['草鞋','皮靴','玄铁靴','踏云靴','追风靴','腾空靴'],
    ring:['木戒','铁戒','灵戒','玉灵戒','乾坤戒','混沌戒'],
    amulet:['木坠','石坠','灵玉坠','玄冰坠','星辰坠','九天坠']
  };
  const nameList = names[type];
  const idx = Math.min(['common','uncommon','rare','epic','legendary','mythic'].indexOf(rarity), nameList.length-1);
  const itemName = prefix + nameList[idx];
  return { id:Date.now()+'_'+Math.random().toString(36).slice(2,6), type, name:itemName, rarity, stats };
}
