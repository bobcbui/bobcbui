import { MainScene } from './main-scene.js';

export function createGameConfig(canvas) {
  const width = window.innerWidth;
  const height = window.innerHeight;

  return {
    type: Phaser.CANVAS,
    canvas,
    width,
    height,
    backgroundColor: '#1a1a2e',
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
