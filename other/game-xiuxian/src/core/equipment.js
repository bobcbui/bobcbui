import { EQ_TYPES, EQ_BASES, RARITY_MULT, RARITY_LABEL, RARITY_COLORS } from '../data/index.js';

const RARITY_ORDER = ['common','uncommon','rare','epic','legendary','mythic'];

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

export function getEquipmentScore(item){
  if(!item || !item.type || !item.stats) return Number.NEGATIVE_INFINITY;
  const base = EQ_BASES[item.type];
  if(!base) return Number.NEGATIVE_INFINITY;
  let score = 0;
  for(const [key, range] of Object.entries(base)){
    if(range[1] <= 0) continue;
    score += (item.stats[key] || 0) / Math.max(1, range[1]);
  }
  const rarityIdx = Math.max(0, RARITY_ORDER.indexOf(item.rarity));
  return score + rarityIdx * 0.01;
}

export function isBetterEquipment(candidate, current){
  if(!candidate) return false;
  if(!current) return true;
  if(candidate.type !== current.type) return false;
  const candidateScore = getEquipmentScore(candidate);
  const currentScore = getEquipmentScore(current);
  if(candidateScore !== currentScore) return candidateScore > currentScore;
  return String(candidate.id || '') > String(current.id || '');
}

export function autoEquipBestEquipment(playerState){
  if(!playerState) return false;
  if(!playerState.equipment) playerState.equipment = {};
  if(!Array.isArray(playerState.inventory)) playerState.inventory = [];

  const nextEquipment = { ...playerState.equipment };
  const nextInventory = [];

  for(const item of playerState.inventory){
    if(!item || !EQ_TYPES.includes(item.type)){
      nextInventory.push(item);
      continue;
    }
    const current = nextEquipment[item.type];
    if(isBetterEquipment(item, current)){
      if(current) nextInventory.push(current);
      nextEquipment[item.type] = item;
    } else {
      nextInventory.push(item);
    }
  }

  let changed = false;
  for(const slot of EQ_TYPES){
    if((playerState.equipment?.[slot]?.id || null) !== (nextEquipment[slot]?.id || null)){
      changed = true;
      break;
    }
  }
  if(!changed && playerState.inventory.length !== nextInventory.length) changed = true;

  playerState.equipment = nextEquipment;
  playerState.inventory = nextInventory;
  return changed;
}

export function acquireEquipment(playerState, item){
  if(!item || !EQ_TYPES.includes(item.type)) return { stored:false, equipped:false, changed:false };
  if(!playerState.equipment) playerState.equipment = {};
  if(!Array.isArray(playerState.inventory)) playerState.inventory = [];

  const roomInBag = playerState.inventory.length < 30;
  if(!roomInBag){
    if(!playerState.equipment[item.type]){
      playerState.equipment[item.type] = item;
      return { stored:true, equipped:true, changed:true };
    }
    return { stored:false, equipped:false, changed:false };
  }

  playerState.inventory.push(item);
  const changed = autoEquipBestEquipment(playerState);
  return {
    stored:true,
    equipped: playerState.equipment?.[item.type]?.id === item.id,
    changed
  };
}
