import { setJoystickDir } from '../core/runtime.js';

export class JoystickController {
  constructor(zone, thumb) {
    this.zone = zone;
    this.thumb = thumb;
    this.touchId = null;
    this.startX = 0;
    this.startY = 0;
  }

  mount() {
    if (!this.zone || !this.thumb) return;

    this.zone.addEventListener('touchstart', (e) => this.onStart(e));
    this.zone.addEventListener('touchmove', (e) => this.onMove(e));
    this.zone.addEventListener('touchend', (e) => this.onEnd(e));
    this.zone.addEventListener('touchcancel', (e) => this.onCancel(e));
  }

  onStart(e) {
    e.preventDefault();
    const t = e.changedTouches[0];
    this.touchId = t.identifier;
    this.startX = t.clientX;
    this.startY = t.clientY;
    this.zone.classList.add('active');
  }

  onMove(e) {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier !== this.touchId) continue;

      const dx = t.clientX - this.startX;
      const dy = t.clientY - this.startY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const maxR = 45;
      const clamp = Math.min(dist, maxR);
      const nx = dist > 0.01 ? dx / dist : 0;
      const ny = dist > 0.01 ? dy / dist : 0;

      this.thumb.style.transform = `translate(calc(-50% + ${clamp * nx}px), calc(-50% + ${clamp * ny}px))`;
      setJoystickDir({ x: nx, y: ny });
    }
  }

  onEnd(e) {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === this.touchId) {
        e.preventDefault();
        this.reset();
      }
    }
  }

  onCancel(e) {
    e.preventDefault();
    this.reset();
  }

  reset() {
    this.touchId = null;
    this.thumb.style.transform = 'translate(-50%,-50%)';
    setJoystickDir(null);
    this.zone.classList.remove('active');
  }
}
