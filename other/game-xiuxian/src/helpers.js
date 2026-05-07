import { setStatusTimer, setLootTimer } from './state.js';

export function setStatus(text, dur){
  setStatusTimer(dur||1.8);
  const el = document.getElementById('status');
  if(el){ el.textContent = text; el.classList.add('show'); }
}

export function setLoot(text){
  setLootTimer(2.5);
  const el = document.getElementById('loot-popup');
  if(el){ el.textContent = text; el.classList.add('show'); }
}
