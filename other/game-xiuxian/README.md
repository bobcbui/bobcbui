# 九天仙途 — 文字修仙世界

2D 修仙题材开放世界浏览器游戏，基于 Phaser 3.60 + 原生 JavaScript，纯前端实现，无构建工具、无服务器依赖。

## 快速运行

必须通过静态 HTTP 服务器访问（`data.json` 使用 fetch 加载，`file://` 下会失败）：

```bash
cd game-xiuxian
python3 -m http.server 8000
# 浏览器打开 http://localhost:8000
```

## 技术栈

| 层 | 技术 |
|---|---|
| 游戏引擎 | Phaser 3.60 (Canvas 渲染, Arcade 物理) |
| 语言 | 原生 JavaScript（ES Modules，`src/` 下分模块） |
| 静态数据 | `data.json`（JSON，无函数） |
| UI 层 | HTML5 + CSS3 DOM overlay |
| 持久化 | localStorage (key: `xiuxian_save`, v1) |
| 部署 | 任意静态文件服务器 |

## 项目结构

```text
game-xiuxian/
├── index.html          # 页面骨架：游戏画布、全部 DOM 容器、data-action 绑定
├── data.json           # 全部静态配置（境界/技能/区域/敌人/成就/商店/装备/平衡参数）
├── resources/
│   └── style.css       # 全部样式
├── src/                # 全部运行时逻辑（ES Modules）
│   ├── main.js         # 入口：调用 boot()
│   ├── app/
│   │   ├── bootstrap.js   # 启动流程：加载数据 -> 校验 -> 初始化 -> 创建 Phaser
│   │   └── loader.js      # 加载进度条
│   ├── data/
│   │   └── index.js       # data.json 加载、校验、索引（配置常量 live binding）
│   ├── core/
│   │   ├── main-scene.js  # MainScene：地图/玩家/对象池/输入/主循环
│   │   ├── state.js       # 玩家状态 P、属性重算、成就判定
│   │   ├── save.js        # 存档/读档/导入导出/v1 兼容
│   │   ├── equipment.js   # 装备生成与穿戴
│   │   ├── cultivation.js # 打坐、突破渡劫
│   │   ├── progression.js # 材料/强化/炼丹/任务/天赋/秘境/图鉴
│   │   ├── helpers.js     # 状态消息 / 掉落弹窗
│   │   ├── events.js      # 事件总线 bus
│   │   ├── dom.js         # DOM 元素缓存
│   │   ├── runtime.js     # Game/Scene/摇杆/冷却 引用
│   │   ├── game-config.js # Phaser 配置
│   │   └── textures.js    # 代码生成纹理（含内联 SVG 飞剑）
│   ├── systems/
│   │   ├── index.js          # installSceneSystems 装配
│   │   ├── combat-system.js  # 技能/弹丸/冷却/领域（伤害入口薄封装）
│   │   ├── damage.js         # 碰撞、伤害、掉落与死亡流程
│   │   ├── combat-loop-system.js / ai-system.js / spawn-system.js
│   │   ├── wave-system.js / defense-system.js / buff-system.js
│   │   ├── movement-system.js / player-status-system.js
│   │   ├── cultivation-progress-system.js / ui-tick-system.js
│   │   ├── ground-effect-system.js / scene-effects-system.js
│   │   ├── entity-animation-system.js / text-pool.js
│   ├── effects/
│   │   └── skill-effects.js  # 弹丸/领域/激光等技能特效
│   ├── ui/
│   │   ├── index.js          # HUD/热栏/各面板 DOM 渲染
│   │   ├── actions.js        # ACTIONS 动作表 + data-action 事件委托
│   │   └── nav-bar.js        # 顶部/底部导航
│   └── input/
│       └── joystick-controller.js  # 虚拟摇杆
├── data/               # 自有资源目录（图片/音频/字体；当前全为代码生成纹理，目录留空）
├── lib/phaser.min.js   # 第三方 Phaser 运行库
├── README.md           # 本文档
└── TASK.md             # 四文件收敛实施计划（历史记录）
```

纹理全部由代码生成，无外部图片/音频/字体资源。

## 模块职责

### `index.html`

- 页面骨架与游戏画布 `<canvas id="gameCanvas">`
- 全部 DOM 容器：HUD、热栏、区域标签、状态/掉落提示、虚拟摇杆、角色/背包/技能/成就/商店/玩法/设置面板、主菜单、突破/死亡/城破弹窗
- 无内联样式（统一走 `resources/style.css`）、无内联 `onclick`（统一走 `data-action` 事件委托）
- 仅加载 `lib/phaser.min.js`（经典脚本，提供全局 Phaser）和 `src/main.js`（模块入口）

### `resources/style.css`

- 页面基础 → 主菜单 → HUD → 热栏 → 面板 → 按钮 → 导航 → 突破/死亡/设置 → 摇杆 → 移动端适配
- 动态宽度/显示状态由 JS 通过 class 或内联 style 更新

### `data.json`

静态配置（`src/data/index.js` 加载后校验并建立索引）：

| 键 | 内容 |
|---|---|
| `realms` | 9 大境界：层数、属性加成、突破条件 |
| `skills` | 5 个技能：id/名称/类型/伤害/范围/冷却/颜色/描述 |
| `zones` | 8 大区域：距离范围、怪物等级、视觉参数 |
| `bestiary` | 按区域的敌人模板：hp/atk/speed/xp/gold/攻击类型 |
| `bossNames` | Boss 名称池 |
| `achievements` | 15 个成就：结构化条件（`condition.type/value`）+ 奖励 |
| `shopItems` | 商店商品、价格、效果 |
| `equipment` | 部位、基础属性、品质倍率/颜色/前缀、名称池 |
| `world` / `combatTuning` | 地图尺寸、安全区、刷怪/伤害/血量平衡参数 |
| `progression` | 材料、词条、套装、丹方、任务、天赋、技能进阶 |
| `sceneEffects` / `monsterTextures` | 区域氛围特效、怪物纹理映射 |
| `assets` | 资源 id → `data/` 路径映射（当前为空，无外部资源） |

成就/事件条件不使用函数，改为 `{ "type": "kills", "value": 50 }` 这类数据描述，由 `src/core/state.js` 解释执行。

### `src/` 模块

- **`src/data/index.js`**：配置常量为 `let` 导出（live binding），启动时由 `loadConfig()` fetch data.json、`buildDataIndexes(data)` 校验并填充；校验失败显示错误页，不让 Phaser 半初始化运行
- **`src/core/state.js`**：全局玩家状态 `P`、运行期共享变量、`recalcStats()` 属性重算、成就判定；`refreshSkills()`/`initHotbar()` 由启动流程在配置就绪后调用
- **`src/core/main-scene.js`**：MainScene —— 世界地图绘制、玩家、实体组、弹丸对象池（`getPooledProj`/`freeProj`）、输入绑定（键盘/鼠标）、主循环（单次敌人遍历性能优化）
- **`src/systems/`**：AI / 移动 / 刷怪 / 波次 / 防御 / Buff / 打坐进度 / 玩家状态 / 地面领域 / 场景氛围 / 实体动画 / 浮动文字池 / UI 节拍；`combat-system.js` 负责技能与弹丸，`damage.js` 独立承载碰撞、伤害、掉落与死亡结算
- **`src/effects/skill-effects.js`**：弹丸拖尾/闪光、命中爆点、领域球飞行、红球激光、施法光环（含移动端低特效模式）
- **`src/ui/`**：`index.js` 渲染全部面板；`actions.js` 的 `ACTIONS` 动作表 + `data-action` 全局事件委托替代 `window.*` 注入；`nav-bar.js` 顶部/底部导航
- **`src/app/bootstrap.js`**：启动顺序 —— 加载并校验数据 → 初始化状态/存档结构 → 绑定输入 → window load 后创建 Phaser Game + 摇杆 → 自动进入游戏

### `data/`

只放项目自有静态资源（图片/音频/字体），按 `data/images/`、`data/audio/`、`data/fonts/` 分子目录；当前所有纹理均为代码生成，无需资源文件。

## 玩法系统

### 操控
| 操作 | 说明 |
|---|---|
| 鼠标左键 | 按住移动到光标位置 |
| 鼠标右键 | 放置地图标记 |
| WASD / 方向键 | 键盘移动 |
| 移动端 | 虚拟摇杆（自动显示） |

### 快捷键
| 键 | 功能 |
|---|---|
| Q | 自动攻击 (飞剑术) |
| W/E/R/T | 手动技能 (快捷栏 2-5) |
| 空格 | 打坐修炼 |
| B | 角色面板 |
| C | 突破 |
| X | 百宝阁 |

### 技能（data.json `skills`）
| 技能 | 类型 | 说明 |
|---|---|---|
| 飞剑术 Q | 自动攻击 | 锁定最近敌人连射飞剑，附带成长/追踪 |
| 治疗 W | 治疗 | 恢复 10% 最大生命值，CD 30s |
| 巨剑术 E | 单体高伤 | 召唤巨型飞剑向前猛冲，CD 8s |
| 雷域 R | 领域 | 以目标为中心展开大范围雷域，CD 30s |
| 高能射线 T | 领域 | 召唤红球持续发射激光，CD 10s |

- 伤害公式 `(atk+level×0.5)×baseDmg×等级系数×攻速buff`，暴击 15%+等级×0.3% 双倍伤害
- 3 秒内连杀 5 只以上每只 +10% 经验，技能可消耗材料进阶（技能进阶面板）

### 修仙境界（9 大境界）
凡体 → 炼气期 → 筑基期 → 金丹期 → 元婴期 → 化神期 → 大乘期 → 渡劫期 → 飞升境（每境 9 层，凡体/飞升 1 层）

- **晋升方式**：杀敌积累 → 打坐(SPACE)修炼满当前层数 → 按 C 突破渡劫
- **突破成功率**：50% + 境界×5%（最高 90%），消耗灵石
- **失败惩罚**：损失 30% 最大生命值；**成功奖励**：进阶下一境界第一层并满血

### 装备系统
- 6 部位：武器/头盔/衣服/鞋子/戒指/项链；6 品质：凡品(×1)→下品(×1.4)→中品(×2)→上品(×3)→极品(×5)→仙品(×9)
- 掉落率：普通 35% / 精英 60% / Boss 100%；背包 30 格，可装备/出售/强化/洗炼
- 套装（万剑套/九霄套/玄体套）2/4/6 件触发加成

### 8 大区域
| 区域 | 怪物等级 | 距中心距离 |
|---|---|---|
| 古剑门（安全区） | 1 | 0–700 |
| 妖兽谷 | 5 | 700–1400 |
| 雪山 | 9 | 1400–2200 |
| 火焰山 | 14 | 2200–3100 |
| 深渊 | 19 | 3100–4000 |
| 万剑峰 | 24 | 4000–4700 |
| 幽冥海 | 29 | 4700–5200 |
| 九天雷域 | 34 | 5200–6000 |

中心安全区（半径 350）不刷怪、受伤自动恢复；越远离中心怪物越强，每区域有独立氛围特效。

### 波次与兽潮
- 区域清空后约 2 秒触发下一波（最多 20 只同时在场），每 5 波出现强化 Boss
- **剑气长城**（玩法面板进入）：镇守 20 波兽潮，波次间 3 秒休整

### 玩法系统（玩法面板）
- 材料掉落（玄铁矿/灵草/妖核/星尘）、炼丹（回春丹/悟道丹/战魄丹）
- 宗门任务（击杀/首领任务）、妖雾秘境（18 杀结算）、怪物图鉴（10 杀领奖）
- 境界天赋（4 个）、技能进阶（3 个）、商店（装备箱/洗髓丹/灵石袋）

### 成就（15 个）
杀敌 10/50/200/1000、等级 5/10/20、境界突破、财富 500/5000、极品装备、撑过第 10 波、累计 1 小时 —— 条件与奖励全部在 `data.json.achievements`。

### 死亡
死亡后弹出重生面板，损失 15% 灵石，回安全区满血重生。

## 存档系统

- localStorage key：`xiuxian_save`，格式版本 v1（`{ P, wave, version }`）
- 30 秒自动存档 + 手动保存 + 设置面板导入/导出 JSON + 重置
- 读档时对缺失字段/旧字段/非法数值做默认值补全，坏存档不会阻止启动
- 持久化白名单仅包含 `P` 的玩家数据与波次，不含 Phaser/DOM/计时器/对象池等临时状态

## 代码执行流程

```text
1. 浏览器加载 index.html
2. <script src="lib/phaser.min.js"> 加载 Phaser 引擎（全局 Phaser）
3. <script type="module" src="src/main.js"> 启动:
   a. src/data/index.js fetch('data.json') 加载并校验配置 → 建立索引（live binding）
   b. 初始化技能/热栏/进度结构 → 绑定 data-action 事件委托
   c. window load → 显示加载条 → 渲染 HUD/热栏
   d. new Phaser.Game() → 启动 MainScene
4. MainScene.preload() → 程序化生成全部纹理
5. MainScene.create() → 世界/玩家/物理/输入绑定 → loadGame() 读档 → 挂载导航 → 自动进入游戏
6. MainScene.update() 每帧循环:
   ├─ 安全区检测（进入/离开清怪、自动回血）
   ├─ 玩家移动（键盘 + 鼠标 + 摇杆）
   ├─ 修炼进度 / Buff 计时 / 区域氛围特效
   ├─ ★ 单次遍历敌人组（AI 移动攻击 + 血条 + 定位收集）
   ├─ Q 自动攻击 + W/E/R/T 手动技能
   ├─ 波次管理 / 防御模式（剑气长城）
   ├─ HUD 刷新（每 ~6 帧）/ 自动存档（每 30s）/ 成就检查（每 2s）
```

## 性能优化（已保留）

- 敌人遍历：每帧单次 `enemies.children.iterate()` 同时完成 AI/血条/定位数据收集
- 弹丸对象池：`getPooledProj` / `freeProj` 按纹理分组复用，避免频繁 create/destroy
- 移动端低特效模式（`lowFxMode`）：自动降粒子数量与特效密度

## 常见问题

| 问题 | 处理 |
|---|---|
| 打开白屏/提示加载失败 | 使用了 `file://` 打开 —— 必须通过 `python3 -m http.server` 等静态服务器访问 |
| 数据文件修改后未生效 | `src/data/index.js` 每次启动都重新 fetch `data.json`（no-store），刷新即可 |
| 想改游戏数值 | 全部在 `data.json`：技能/敌人/区域/境界/掉落/商店 |
| 想加新功能 | 按模块职责定位：数值进 `data.json`，玩法逻辑进 `src/core`/`src/systems`，界面进 `src/ui`，新增子模块放入对应目录 |
