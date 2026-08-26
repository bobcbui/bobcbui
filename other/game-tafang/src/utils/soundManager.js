// Web Audio API procedural sound synthesizer for Defend the Saintess (保卫圣女)
// Ethereal Xianxia fantasy sound effects with zero external file dependencies

class SoundManager {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.volume = 0.35;

    try {
      const savedMute = localStorage.getItem('td_muted');
      if (savedMute !== null) {
        this.muted = savedMute === 'true';
      }
    } catch (e) {}
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    try {
      localStorage.setItem('td_muted', this.muted ? 'true' : 'false');
    } catch (e) {}
    return this.muted;
  }

  isMuted() {
    return this.muted;
  }

  playTone(freq, type, duration, startVol = 0.3, endVol = 0.001, pitchDecay = 0) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      if (pitchDecay !== 0) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq + pitchDecay), t + duration);
      }

      gain.gain.setValueAtTime(startVol * this.volume, t);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, endVol), t + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + duration);
    } catch (e) {}
  }

  playNoise(duration, startVol = 0.3, isLowpass = false, cutoff = 800) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      const bufferSize = Math.floor(this.ctx.sampleRate * duration);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(startVol * this.volume, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

      if (isLowpass) {
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(cutoff, t);
        filter.frequency.exponentialRampToValueAtTime(60, t + duration);
        noise.connect(filter);
        filter.connect(gain);
      } else {
        noise.connect(gain);
      }

      gain.connect(this.ctx.destination);
      noise.start(t);
      noise.stop(t + duration);
    } catch (e) {}
  }

  // --- Xianxia & Saintess Sound Effects ---

  // Saintess Blessing / Chime when tapped
  playSaintess() {
    const notes = [659.25, 783.99, 1046.50, 1318.51];
    notes.forEach((f, i) => {
      setTimeout(() => this.playTone(f, 'sine', 0.2, 0.3, 0.01), i * 60);
    });
  }

  // Saintess Hurt / Shield alarm
  playSaintessHurt() {
    this.playTone(400, 'triangle', 0.15, 0.35, 0.01, -200);
    this.playNoise(0.12, 0.3, true, 400);
  }

  // Target Lock (🎯 诛邪锁定)
  playLock() {
    this.playTone(987.77, 'sine', 0.06, 0.25, 0.01);
    setTimeout(() => this.playTone(1318.51, 'sine', 0.08, 0.28, 0.01), 40);
  }

  // Flying Sword Slash (🗡️ 飞剑破空)
  playSword() {
    this.playTone(850, 'triangle', 0.06, 0.22, 0.01, -400);
    this.playNoise(0.04, 0.15, true, 1200);
  }

  // Black Turtle Water/Mud Seal (🪨 玄龟镇魔)
  playTurtle() {
    this.playTone(240, 'sine', 0.12, 0.25, 0.01, 120);
    setTimeout(() => this.playTone(160, 'sine', 0.15, 0.2, 0.01, -60), 50);
  }

  // Nine Sun True Fire Wave (☀️ 九阳真火)
  playFire() {
    this.playTone(380, 'sine', 0.2, 0.3, 0.01, 400);
    this.playNoise(0.18, 0.25, true, 600);
  }

  // Tai Chi Wind Fan (🌀 乾坤宝扇)
  playFan() {
    this.playTone(750, 'triangle', 0.1, 0.22, 0.01, -350);
    this.playNoise(0.12, 0.2, false);
  }

  // Purple Thunder (🔮 五行紫雷)
  playThunder() {
    this.playTone(1200, 'sawtooth', 0.07, 0.2, 0.01, 300);
    this.playNoise(0.08, 0.25, false);
  }

  // Godfire Phoenix / Celestial Thunder Rocket (🚀 诛仙神火)
  playGodfire() {
    this.playNoise(0.28, 0.5, true, 450);
    this.playTone(160, 'sawtooth', 0.22, 0.4, 0.01, -100);
  }

  // Obstacle / Lingzhi broken (灵物破除)
  playObstacleBreak() {
    this.playTone(523.25, 'sine', 0.08, 0.3, 0.01, 200);
    setTimeout(() => this.playTone(783.99, 'sine', 0.12, 0.35, 0.01), 70);
  }

  // Ancient Mystic Chest (玄天宝匣大奖)
  playTreasureChest() {
    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
    notes.forEach((f, i) => {
      setTimeout(() => this.playTone(f, 'sine', 0.18, 0.3, 0.01), i * 50);
    });
  }

  // Hit Impact
  playHit() {
    this.playTone(300, 'triangle', 0.04, 0.18, 0.01, -150);
  }

  // Demon Dissipated (妖魔化灰)
  playEnemyDeath() {
    this.playTone(380, 'triangle', 0.08, 0.25, 0.01, -180);
  }

  // Spirit Stone Earned (获得灵石)
  playSpiritStone() {
    this.playTone(1046.50, 'sine', 0.05, 0.22, 0.01);
    setTimeout(() => this.playTone(1318.51, 'sine', 0.1, 0.25, 0.01), 45);
  }

  // Build Formation
  playBuild() {
    this.playTone(440, 'triangle', 0.08, 0.28, 0.01, 220);
    setTimeout(() => this.playTone(659.25, 'triangle', 0.1, 0.3, 0.01, 220), 60);
  }

  // Upgrade Formation
  playUpgrade() {
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 'sine', 0.1, 0.25, 0.01), i * 50);
    });
  }

  // Sell / Refine Formation
  playSell() {
    this.playTone(587.33, 'sine', 0.09, 0.2, 0.01, -200);
  }

  // Victory
  playVictory() {
    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98];
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 'sine', 0.25, 0.35, 0.01), i * 80);
    });
  }

  // Defeat
  playDefeat() {
    const notes = [440, 392, 349.23, 293.66];
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 'sawtooth', 0.25, 0.25, 0.01, -30), i * 120);
    });
  }

  playClick() {
    this.playTone(850, 'sine', 0.03, 0.15, 0.01);
  }

  playError() {
    this.playTone(220, 'sawtooth', 0.1, 0.25, 0.01, -40);
  }
}

export const soundManager = new SoundManager();
