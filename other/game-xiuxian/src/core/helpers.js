import { bus } from './events.js';
import { setStatusTimer, setLootTimer } from './state.js';
import * as ui from '../ui/bridge.js';

function setStatus(text, dur) {
  setStatusTimer(dur || 2);
  ui.showStatus(text, dur);
}

function setLoot(text) {
  setLootTimer(2.5);
  ui.showLoot(text);
}

bus.on('status', setStatus);
bus.on('loot', setLoot);
