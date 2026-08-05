/* Phaser 配置 */

import { MainScene } from '@/core/main-scene.js';

export function createGameConfig(canvas) {
  // 战斗页使用固定逻辑尺寸，CSS 再按 2:3 比例缩放，避免不同屏幕拉伸战场。
  const width = 600;
  const height = 900;

  return {
    type: Phaser.CANVAS,
    renderType: Phaser.CANVAS,
    canvas,
    parent: 'gameWrap',
    width,
    height,
    backgroundColor: '#efe3c0',
    physics: {
      default: 'arcade',
      arcade: { gravity: { x: 0, y: 0 }, debug: false }
    },
    scene: [MainScene],
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width,
      height
    }
  };
}
