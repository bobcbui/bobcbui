// Web Audio API procedural sound synthesizer for Carrot Fantasy (保卫萝卜)
// Cute, playful cartoon sound effects with zero external file dependencies

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

  // --- Cute Cartoon Sound Effects ---

  // Carrot Squeak / Giggle when tapped or happy
  playCarrot() {
    this.playTone(880, 'sine', 0.08, 0.3, 0.01, 200);
    setTimeout(() => this.playTone(1174.66, 'sine', 0.12, 0.35, 0.01, 300), 70);
  }

  // Carrot hurt squeak
  playCarrotHurt() {
    this.playTone(520, 'triangle', 0.12, 0.35, 0.01, -250);
  }

  // Target Lock on (🎯 集火锁定)
  playLock() {
    this.playTone(1046.5, 'sine', 0.05, 0.25, 0.01);
    setTimeout(() => this.playTone(1318.5, 'sine', 0.08, 0.3, 0.01), 40);
  }

  // Bottle Cannon (🍼 瓶子炮)
  playBottle() {
    this.playTone(700, 'triangle', 0.07, 0.22, 0.01, -300);
  }

  // Poop Tower (💩 便便塔黏液)
  playPoop() {
    this.playTone(280, 'sine', 0.1, 0.25, 0.01, 150);
    setTimeout(() => this.playTone(200, 'sine', 0.12, 0.2, 0.01, -80), 50);
  }

  // Sunflower (🌻 太阳花光波)
  playSun() {
    this.playTone(440, 'sine', 0.18, 0.25, 0.01, 350);
  }

  // Fan Tower (🪭 风扇飞叶)
  playFan() {
    this.playTone(900, 'triangle', 0.09, 0.2, 0.01, -400);
  }

  // Magic Ball (🔮 魔法球)
  playMagic() {
    this.playTone(1100, 'sine', 0.06, 0.18, 0.01, 200);
  }

  // Rocket Launcher (🚀 火箭炮)
  playRocket() {
    this.playNoise(0.22, 0.45, true, 500);
    this.playTone(180, 'sawtooth', 0.2, 0.35, 0.01, -120);
  }

  // Obstacle Break / Treasure Open (🪓 道具清除)
  playObstacleBreak() {
    this.playTone(440, 'sine', 0.08, 0.3, 0.01, 250);
    setTimeout(() => this.playTone(660, 'sine', 0.1, 0.3, 0.01, 200), 60);
    setTimeout(() => this.playTone(880, 'sine', 0.15, 0.35, 0.01), 120);
  }

  // Treasure chest big reward
  playTreasure() {
    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
    notes.forEach((f, i) => {
      setTimeout(() => this.playTone(f, 'sine', 0.14, 0.28, 0.01), i * 55);
    });
  }

  // Hit Impact
  playHit() {
    this.playTone(320, 'triangle', 0.04, 0.18, 0.01, -160);
  }

  // Enemy Pop Death
  playEnemyDeath() {
    this.playTone(400, 'triangle', 0.08, 0.25, 0.01, -150);
  }

  // Coin Sound (叮当清脆金币)
  playCoin() {
    this.playTone(1046.50, 'sine', 0.06, 0.25, 0.01);
    setTimeout(() => this.playTone(1318.51, 'sine', 0.12, 0.25, 0.01), 50);
  }

  // Build Tower
  playBuild() {
    this.playTone(440, 'triangle', 0.08, 0.28, 0.01, 220);
    setTimeout(() => this.playTone(660, 'triangle', 0.1, 0.3, 0.01, 220), 60);
  }

  // Upgrade Tower
  playUpgrade() {
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 'sine', 0.1, 0.25, 0.01), i * 50);
    });
  }

  // Sell Tower
  playSell() {
    this.playTone(600, 'sine', 0.09, 0.2, 0.01, -220);
  }

  // Victory
  playVictory() {
    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 'sine', 0.22, 0.35, 0.01), i * 90);
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
    this.playTone(800, 'sine', 0.03, 0.15, 0.01);
  }

  playError() {
    this.playTone(220, 'sawtooth', 0.1, 0.25, 0.01, -40);
  }
}

export const soundManager = new SoundManager();
