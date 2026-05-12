import { MapMenuScene } from './map-menu-scene.js';
import { MainScene } from './main-scene.js';
import { WORLD } from '../data/index.js';

export function createGameConfig(canvas) {
  return {
    type: Phaser.CANVAS,
    renderType: Phaser.CANVAS,
    canvas,
    width: WORLD.width,
    height: WORLD.height,
    backgroundColor: '#1a0a00',
    physics: {
      default: 'arcade',
      arcade: { gravity: { x: 0, y: 0 }, debug: false }
    },
    scene: [MapMenuScene, MainScene],
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: WORLD.width,
      height: WORLD.height
    }
  };
}
