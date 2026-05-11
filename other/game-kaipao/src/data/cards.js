import { SKILL_DEFS } from './skills.js';
import { G } from '../core/state.js';

export function generateCards(existingSkills) {
  const cards = [];
  const skillIds = existingSkills.map(s => s.id);

  const availableSkills = SKILL_DEFS.filter(s => !skillIds.includes(s.id));
  if (availableSkills.length > 0 && existingSkills.length < 5) {
    const newSkill = availableSkills[Math.floor(Math.random() * availableSkills.length)];
    cards.push({
      type: 'skill',
      skillId: newSkill.id,
      name: newSkill.name,
      icon: newSkill.icon,
      desc: '获得技能：' + newSkill.desc
    });
  }

  if (existingSkills.length > 0) {
    const upgradeSkill = existingSkills[Math.floor(Math.random() * existingSkills.length)];
    cards.push({
      type: 'upgrade_skill',
      skillId: upgradeSkill.id,
      name: SKILL_DEFS.find(s => s.id === upgradeSkill.id)?.name || '',
      icon: '⬆️',
      desc: '升至 Lv.' + (upgradeSkill.level + 1)
    });
  }

  const nextSwordLv = (G.swordLevel || 1) + 1;
  cards.push({
    type: 'upgrade_sword',
    name: '飞剑术',
    icon: '⚔️',
    desc: '飞剑术升至 Lv.' + nextSwordLv + ' 伤害+5 攻速+'
  });

  cards.push({
    type: 'stat_boost',
    stat: 'atk',
    name: '攻击强化',
    icon: '💪',
    desc: '永久 +3 攻击力'
  });

  cards.push({
    type: 'stat_boost',
    stat: 'maxHp',
    name: '生命强化',
    icon: '❤️',
    desc: '永久 +15 最大生命'
  });

  cards.push({
    type: 'stat_boost',
    stat: 'atkSpeed',
    name: '攻速强化',
    icon: '⏩',
    desc: '永久 +0.15 攻击速度'
  });

  const shuffled = cards.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3);
}

export function applyCard(card, G) {
  switch (card.type) {
    case 'skill':
      if (!G.skills.some(s => s.id === card.skillId)) {
        G.skills.push({ id: card.skillId, level: 1 });
      }
      break;
    case 'upgrade_skill': {
      const sk = G.skills.find(s => s.id === card.skillId);
      if (sk) sk.level++;
      break;
    }
    case 'upgrade_sword':
      G.swordLevel++;
      break;
    case 'stat_boost':
      if (card.stat === 'atk') G.atk += 3;
      if (card.stat === 'maxHp') { G.maxHp += 15; G.hp = Math.min(G.hp + 15, G.maxHp); }
      if (card.stat === 'atkSpeed') G.atkSpeed += 0.15;
      break;
  }
}
