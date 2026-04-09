# Babylon 风格 3D FPS（Minecraft-like）

一个基于 `Babylon.js` 的浏览器 3D FPS 原型，整体视觉为方块风格，当前以程序化场景和程序化音效为主。

## 当前版本功能

- 第一人称视角，带十字准星与 HUD（生命、弹药、击杀、波次、目标数）。
- `W/A/S/D` 移动、`Space` 跳跃、`R` 装弹、左键射击。
- 敌人采用方块僵尸风格（头/躯干/四肢分段），并带行走动画。
- 武器与第一人称手脚可见，包含走路摆动、后坐力、装弹动画、落地反馈。
- 射击命中包含弹道线、击中特效、受击数字、击中音效。
- 使用波次刷怪，清空当前波后自动进入下一波。
- 输入兼容：鼠标锁定模式为主，锁定失败时自动回退到点击射击；支持触屏点击射击兜底。

## 技术说明

- 渲染引擎：`Babylon.js`，优先尝试 WebGPU，失败自动回退到 WebGL。
- UI：`babylon.gui.min.js`。
- 模型加载器：`babylonjs.loaders.min.js`。
- 声音：Web Audio 合成音效。

## 操作说明

- 点击画面进入战场并尝试锁定鼠标。
- `W/A/S/D`：移动
- `Mouse`：视角
- `Left Click`：射击
- `R`：装弹
- `Space`：跳跃
- `Esc`：退出鼠标锁定

## 快速运行

建议通过本地静态服务器运行（避免直接双击 HTML 可能出现的资源/权限问题）：

```bash
cd /home/bobcbui/Project/bobcbui
python3 -m http.server 8877
```

浏览器打开：

`http://127.0.0.1:8877/other/3D-FPS/index.html`

## 目录结构

- `index.html`：页面骨架与脚本入口。
- `src/main.js`：ESM 入口文件。
- `src/fps-game.js`：核心游戏逻辑模块。
- `lib/babylon.js`：Babylon 引擎（第三方）。
- `lib/babylon.gui.min.js`：GUI 组件（第三方）。
- `lib/babylonjs.loaders.min.js`：模型加载器（第三方）。
- `resource/model/enemy.obj`：预留敌人模型资源。
- `resource/model/knock.obj`：预留武器模型资源。

## 调试与自动化接口

`index.html` 暴露了两个测试接口，便于自动化脚本或外部调试调用：

- `window.render_game_to_text()`：返回当前简化游戏状态 JSON。
- `window.advanceTime(ms)`：按固定步长推进游戏时间（用于确定性测试）。

## 资源扩展建议

如果后续要继续扩展，建议放在 `resource/` 下，例如：

- `resource/model/`：`OBJ/GLB/GLTF` 模型
- `resource/texture/`：贴图
- `resource/audio/`：外部音效/BGM

## 已知差距（相对完整游戏）

- 暂无基地建造/资源拾取系统。
- 暂无暂停菜单（当前 `Esc` 主要用于退出鼠标锁定）。
- 暂无多枪械切换、背包或任务系统。
