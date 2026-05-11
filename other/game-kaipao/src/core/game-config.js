import { MainScene } from './main-scene.js';

export function createGameConfig(canvas) {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const gameWidth = Math.min(400, width);
  const gameHeight = height;

  return {
    type: Phaser.CANVAS,
    canvas,
    width: gameWidth,
    height: gameHeight,
    backgroundColor: '#1a1a2e',
    physics: {
      default: 'arcade',
      arcade: { gravity: { x: 0, y: 0 }, debug: false }
    },
    scene: [MainScene],
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: gameWidth,
      height: gameHeight
    }
  };
}
