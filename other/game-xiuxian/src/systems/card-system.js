/* ============================================================================
 * 抽卡系统：局内升级触发 3 选 1，技能卡/强化卡混池
 * 技能卡：加入 P.skills 自动轮转，重复抽提升技能等级；
 * 强化卡：累加到 P.mods（多重弹道/攻速/暴击/吸血等）。
 * ========================================================================== */

import { P, recalcStats } from '@/core/state.js';
import { SKILL_CARDS, UPGRADE_CARDS } from '@/data/index.js';
import { bus } from '@/core/events.js';
import { getEl } from '@/core/dom.js';
import { renderCardOptions } from '@/ui/index.js';

/** 同时最多可拥有的技能数（飞剑术为普攻，不计入） */
export const MAX_SKILLS = 4;

export class CardSystem {
  constructor(scene) {
    this.scene = scene;
  }

  /** 局内升级：暂停战斗并弹出抽卡面板（3 选 1） */
  onLevelUp() {
    this.scene.runPaused = true;
    const options = this.rollThree();
    renderCardOptions(options);
    getEl('cardPanel')?.classList.remove('hidden');
  }

  /** 随机 3 张不重复的卡（技能/强化混池；技能上限 4 个，已满则只出强化卡） */
  rollThree() {
    const pool = [];
    if (P.skills.length < MAX_SKILLS) {
      for (const c of SKILL_CARDS) pool.push({ ...c, kind: 'skill' });
    }
    for (const c of UPGRADE_CARDS) pool.push({ ...c, kind: 'upgrade' });
    const picked = [];
    const used = new Set();
    for (let i = 0; i < 3 && used.size < pool.length; i++) {
      const idx = Math.floor(Math.random() * pool.length);
      if (used.has(idx)) { i--; continue; }
      used.add(idx);
      picked.push(pool[idx]);
    }
    return picked;
  }

  /** 选择一张卡：应用效果，关闭面板并继续战斗 */
  pick(cardId) {
    const card = [...SKILL_CARDS.map(c => ({ ...c, kind: 'skill' })), ...UPGRADE_CARDS.map(c => ({ ...c, kind: 'upgrade' }))]
      .find(c => c.id === cardId);
    if (!card) return;

    if (card.kind === 'skill') {
      P.skillLevels[card.id] = (P.skillLevels[card.id] || 0) + 1;
      if (!P.skills.includes(card.id)) P.skills.push(card.id);
      bus.emit('status', '✨ 习得技能：' + card.name + (P.skillLevels[card.id] > 1 ? ' Lv.' + P.skillLevels[card.id] : ''), 2);
    } else {
      this.applyUpgrade(card);
      bus.emit('status', '✨ 获得强化：' + card.name, 1.8);
    }

    getEl('cardPanel')?.classList.add('hidden');
    this.scene.runPaused = false;
    bus.emit('hud-refresh');
    bus.emit('hotbar-refresh');
  }

  applyUpgrade(card) {
    const effect = card.effect;
    switch (effect) {
      case 'maxHp':
        P.mods.maxHpBonus = (P.mods.maxHpBonus || 0) + card.value;
        recalcStats();
        P.hp = P.maxHp;
        break;
      default:
        if (P.mods[effect] != null) P.mods[effect] += card.value;
        break;
    }
  }
}
