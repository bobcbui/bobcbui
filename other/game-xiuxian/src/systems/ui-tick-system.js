import {
  autoSaveTimer,
  lootTimer,
  setAutoSaveTimer,
  setLootTimer,
  setStatusTimer,
  statusTimer
} from '../core/state.js';
import { bus } from '../core/events.js';
import { getEl } from '../core/dom.js';
import { updateHotbarCooldowns } from '../ui/index.js';

export class UiTickSystem {
  constructor(scene) {
    this.scene = scene;
    this.hudTick = 0;
  }

  update(dt, time) {
    this.updateMessageTimers(dt);
    this.updateAutoSave(dt);
    this.updateHud();
    this.updateAchievements(time, dt);
  }

  updateMessageTimers(dt) {
    let st = statusTimer;
    if (st > 0) {
      st -= dt;
      if (st <= 0) getEl('status')?.classList.remove('show');
    }
    setStatusTimer(st);

    let lt = lootTimer;
    if (lt > 0) {
      lt -= dt;
      if (lt <= 0) getEl('loot-popup')?.classList.remove('show');
    }
    setLootTimer(lt);
  }

  updateAutoSave(dt) {
    let at = autoSaveTimer + dt;
    if (at >= 30) {
      at = 0;
      bus.emit('save');
    }
    setAutoSaveTimer(at);
  }

  updateHud() {
    this.hudTick++;
    if (this.hudTick <= 6) return;
    this.hudTick = 0;
    bus.emit('hud-refresh');
    bus.emit('hotbar-refresh');
    updateHotbarCooldowns();
    this.scene.updateZoneLabel();
  }

  updateAchievements(time, dt) {
    if (time % 2000 < dt * 1000 * 1.5) {
      bus.emit('check-achievements');
    }
  }
}
