import { bus } from './events.js';
import { setStatusTimer, setLootTimer } from './state.js';

function setStatus(text, dur) {
  setStatusTimer(dur || 2);
  const el = document.getElementById('status');
  if (el) { el.textContent = text; el.classList.add('show'); }
}

function setLoot(text) {
  setLootTimer(2.5);
  const el = document.getElementById('loot-popup');
  if (el) { el.textContent = text; el.classList.add('show'); }
}

bus.on('status', setStatus);
bus.on('loot', setLoot);
