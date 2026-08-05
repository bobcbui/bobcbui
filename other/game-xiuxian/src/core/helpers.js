/* 消息提示：状态消息（status）与掉落弹窗（loot），配合状态计时器 */

import { bus } from '@/core/events.js';
import { setStatusTimer, setLootTimer } from '@/core/state.js';
import { getEl } from '@/core/dom.js';

function setStatus(text, dur) {
  setStatusTimer(dur || 2);
  const el = getEl('status');
  if (el) {
    el.textContent = text;
    el.classList.add('show');
  }
}

function setLoot(text) {
  setLootTimer(2.5);
  const el = getEl('loot-popup');
  if (el) { el.textContent = text; el.classList.add('show'); }
}

bus.on('status', setStatus);
bus.on('loot', setLoot);
