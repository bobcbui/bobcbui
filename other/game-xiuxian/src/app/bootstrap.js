/* ============================================================================
 * 启动流程：加载并校验 data.json -> 初始化状态/存档结构 -> 绑定输入 ->
 * window load 后创建 Phaser Game + 摇杆；失败时展示错误页
 * ========================================================================== */

import { loadConfig, buildDataIndexes } from '@/data/index.js';
import { refreshSkills, initHotbar } from '@/core/state.js';
import { ensureProgressionState } from '@/core/progression.js';
import { hotbarRender, updateHUD } from '@/ui/index.js';
import { bindActions } from '@/ui/actions.js';
import { JoystickController } from '@/input/joystick-controller.js';
import { setGame } from '@/core/runtime.js';
import { createGameConfig } from '@/core/game-config.js';
import { reportLoading, showLoadingBar, setStartBtnEnabled } from '@/app/loader.js';

function markTouchDevice() {
  if (window.ontouchstart !== undefined || navigator.maxTouchPoints > 0) {
    document.body.classList.add('has-touch');
  }
}

function mountJoystick() {
  const joyZone = document.getElementById('joystick-zone');
  const joyThumb = document.getElementById('joystick-thumb');
  new JoystickController(joyZone, joyThumb).mount();
}

function startGame() {
  const canvas = document.getElementById('gameCanvas');
  const game = new Phaser.Game(createGameConfig(canvas));
  setGame(game);
}

function showFatalError(err) {
  console.error('[九天仙途] 启动失败:', err);
  const div = document.createElement('div');
  div.style.cssText = 'position:fixed;inset:0;z-index:999;background:#1a0a00;color:#ffd700;' +
    'display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;' +
    'padding:24px;text-align:center;font-family:"Segoe UI","Microsoft YaHei",sans-serif;';
  div.innerHTML =
    '<div style="font-size:24px;font-weight:900;">九天仙途 启动失败</div>' +
    '<div style="font-size:13px;color:rgba(255,215,0,0.7);max-width:480px;line-height:1.8;">' +
    '游戏配置或资源加载失败，请通过静态服务器访问（例如在项目根目录执行 ' +
    '<code>python -m http.server</code>，然后打开 http://localhost:8000）。<br>' +
    '错误详情: ' + String(err && err.message ? err.message : err) + '</div>';
  document.body.appendChild(div);
}

function startGameFlow() {
  showLoadingBar();
  setStartBtnEnabled(false);
  reportLoading(5, '启动游戏引擎...');

  hotbarRender();
  updateHUD();
  reportLoading(20, '创建游戏场景...');

  startGame();
  mountJoystick();
}

/** 启动入口：加载并校验数据 -> 初始化状态 -> 绑定 UI/输入 -> 创建 Phaser 场景 */
export async function boot() {
  let data;
  try {
    data = await loadConfig();
  } catch (err) {
    showFatalError(err);
    return;
  }

  try {
    buildDataIndexes(data);
  } catch (err) {
    showFatalError(err);
    return;
  }

  refreshSkills();
  initHotbar();
  ensureProgressionState();
  bindActions();
  markTouchDevice();

  if (document.readyState === 'loading') {
    window.addEventListener('load', startGameFlow, { once: true });
  } else {
    startGameFlow();
  }
}
