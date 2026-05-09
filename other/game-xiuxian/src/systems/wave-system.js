import { P, waveNum, waveTimer, wavePending, waveDelay,
  setWaveNum, setWaveTimer, setWavePending } from '../core/state.js';
import { bus } from '../core/events.js';

export class WaveSystem {
  constructor(scene) {
    this.scene = scene;
  }

  update(dt) {
    const { scene } = this;
    const alive = scene.enemies.countActive(true);
    if (!scene._inSafeZone() && alive === 0) {
      if (!wavePending) {
        setWavePending(true);
        setWaveTimer(0);
        scene.showWorldNotice?.('区域已清，休整中...', '#dff7ff');
      } else {
        let wt = waveTimer + dt;
        if (wt >= 2) {
          let wn = waveNum + 1;
          setWaveNum(wn);
          if (wn > P.maxWave) P.maxWave = wn;
          const count = Math.min(4 + wn * 2, 30);
          for (let i = 0; i < count; i++) scene.spawnSystem.spawnEnemy();
          if (wn % 5 === 0) {
            const bos = scene.spawnSystem.spawnEnemy();
            if (bos) {
              bos.setData('hp', bos.getData('hp') * 3);
              bos.setData('atk', bos.getData('atk') * 2);
              bos.setData('xp', bos.getData('xp') * 5);
              bos.setData('isBoss', true);
              bos.setTexture('monster-boss');
              bos.setScale(1.3);
              bos.setData('baseScale', 1.3);
              bus.emit('status', '👑 妖兽王降临！', 2.5);
            }
          }
          setWavePending(false);
          wt = 0;
          bus.emit('status', '⚔️ 第 ' + wn + ' 波来袭！', 2);
        }
        setWaveTimer(wt);
      }
    } else if (wavePending) {
      setWavePending(false);
      setWaveTimer(0);
    }
  }
}
