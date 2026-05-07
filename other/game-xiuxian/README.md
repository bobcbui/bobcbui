# 九天仙途 — 文字修仙世界

2D 修仙题材开放世界浏览器游戏，基于 Phaser 3 + 原生 JavaScript (ES Modules)，纯前端实现，无需服务器。

## 快速运行

```bash
cd game-xiuxian
python -m http.server 8000
# 浏览器打开 http://localhost:8000
```

## 技术栈

| 层 | 技术 |
|---|---|
| 游戏引擎 | Phaser 3.60 (Canvas 渲染, Arcade 物理) |
| 语言 | 原生 JavaScript ES Modules |
| UI 层 | HTML5 + CSS3 DOM overlay |
| 持久化 | localStorage (key: `xiuxian_save`, v1) |
| 部署 | 任意静态文件服务器 |

## 项目结构

```
game-xiuxian/
├── index.html              # 入口: HTML 骨架 + 全部 CSS 样式 + DOM 面板
├── lib/phaser.min.js       # Phaser 3.60 引擎 (~1.1 MB)
├── README.md               # 本文档
└── src/
    ├── main.js             # 启动器: Phaser 配置、键盘绑定、摇杆、导航栏
    ├── state.js            # 全局状态 P + 共享变量 + 属性重算 + 技能/Hotbar 初始化
    ├── scene.js            # 主场景: 渲染、战斗、AI、波次、区域 — 核心游戏逻辑
    ├── data.js             # 静态配置: 境界/技能/敌人/区域/成就/商店/装备属性
    ├── ui.js               # 全部 DOM UI: HUD、Hotbar、角色/背包/技能/成就/商店面板
    ├── cultivation.js      # 修炼: 打坐、突破渡劫
    ├── equipment.js        # 装备: 程序化生成 6 部位 6 品质
    ├── helpers.js          # 工具: 状态消息、掉落弹窗
    └── save.js             # 存档: 30 秒自动存档 + 手动存档/读档, 版本迁移
```

## 模块依赖关系

```
                    main.js (入口, 组装一切)
                   /    |     \      \       \
              scene.js  ui.js  save.js  cultivation.js  equipment.js
              |    |     |       |          |
           state.js data.js helpers.js   state.js      data.js
```

- `main.js` — 唯一的入口模块，负责 phaser 初始化、键盘绑定、摇杆初始化、导航栏创建、window 全局注入。它 `import` 所有其他模块以确保它们的副作用（window 注册）生效。
- `state.js` — 被几乎所有模块依赖。导出全局玩家状态对象 `P`、共享计时器、以及 `recalcStats()` 等核心函数。
- `data.js` — 纯静态数据，被 `state.js` / `scene.js` / `ui.js` / `equipment.js` 依赖。
- `scene.js` — 最核心的游戏逻辑，依赖 `state.js` 获取状态、`data.js` 获取配置、`equipment.js` 生成掉落。
- `ui.js` — 不依赖 `scene.js`，通过 `window.*` 函数与游戏层通信（`window.updateHUD`, `window.hotbarRender` 等）。
- `cultivation.js` — 独立模块，操作 `P` 状态并调用 UI 更新。
- `helpers.js` — 纯工具函数，操作 DOM 元素和计时器。
- `save.js` — 序列化 `P` 对象和 `waveNum` 到 localStorage。

## 各模块职责

### `index.html`
- 游戏画布 `<canvas>`
- 全部 CSS 变量和样式定义（~180 行）
- 完整 DOM 结构：HUD、热栏、区域标签、状态消息、掉落弹窗、虚拟摇杆、5 个模态面板（角色/背包/技能/成就/商店）、突破弹窗、死亡弹窗、伤害闪光
- 引入 `phaser.min.js` 和 `src/main.js`

### `src/main.js` (89 行)
- 注册所有 `window.*` 全局函数（bridge pattern）
- 插入 `window._data` 供跨模块使用
- 检测触摸设备添加 `has-touch` class
- `load` 事件中启动 Phaser Game、渲染热栏和 HUD、创建导航栏按钮、初始化虚拟摇杆

### `src/data.js` (108 行)
- `REALMS` — 8 大境界（凡体→飞升），每境 stages/hpBonus/atkBonus/defBonus/reqKills
- `SKILL_DEFS` — 12 种技能定义（飞剑术/火球术/御剑术/落雷/盾/领域/buff），含 type/baseDmg/range/cooldown/color
- `ZONES` — 5 大区域（灵溪村→落霞山脉→幽暗密林→寒冰极域→烈焰炼狱），minDist/maxDist/monsterLv
- `BESTIARY` — 按区域划分的敌人模板（hp/atk/speed/xp/gold/atkType/atkRange）
- `BOSS_NAMES` — Boss 名称池
- `ACHIEVEMENTS` — 15 个成就，含 check 函数和奖励
- `SHOP_ITEMS` — 7 种商品（装备箱/洗髓丹/悟道丹/灵石袋）
- `EQ_TYPES` / `EQ_BASES` / `RARITY_*` — 装备系统用

### `src/state.js` (131 行)
- 导出唯一的全局玩家状态对象 `P`
- 导出共享变量：`waveNum`, `waveTimer`, `isCultivating`, `cultProgress`, `statusTimer` 等
- `recalcStats()` — 根据境界、属性点、装备重新计算 atk/def/hp/speed
- `realmText()` — 生成如"筑基期 中期"的显示文本
- `refreshSkills()` / `initHotbar()` — 初始化/刷新技能列表和快捷栏
- `checkAchievements()` — 每 2 秒检查一次成就触发
- `window.*` 注册：realmText, recalcStats, refreshSkills, initHotbar, checkAchievements

### `src/scene.js` (762 行) — 核心游戏逻辑
**类: `MainScene extends Phaser.Scene`**

- `preload()` — 程序化生成全部纹理（玩家/敌人/弹丸）
- `create()` — 初始化世界、物理、敌人组、弹丸组、弹丸对象池、输入、碰撞、快捷键
- `drawGround()` — 绘制 3500×3500 地图
- `update(time, delta)` — 主循环：
  1. 安全区检测
  2. 玩家移动（键盘+鼠标+摇杆）
  3. 修炼进度（打坐）
  4. Buff 计时器倒计时
  5. 区域切换检测
  6. **单次敌人遍历** — AI 移动/攻击 + Q 定位收集 + activeEnemies 收集 + 血条绘制
  7. 自动攻击 Q 技能
  8. 手动技能 W/E/R/T（盾/buff/领域/伤害，使用步骤6收集的数据）
  9. 兽潮波次管理
  10. 状态/掉落计时器
  11. HUD 更新（每 6 帧）
  12. 自动存档（每 30 秒）
  13. 成就检查（每 2 秒）
- `spawnEnemy()` — 在玩家附近生成敌人（普通/精英/Boss）
- `damageEnemy()` — 伤害计算：暴击、连杀、经验/金币掉落、装备掉落、升级检查
- `shootProjectile()` / `doMultiProjectile()` — 创建弹丸（使用对象池）
- `doDomainSkill()` — AOE 领域技能效果
- `onProjHit()` / `onEnemyContact()` / `onEnemyProjHit()` — 碰撞处理
- 对象池：`getPooledProj()` / `freeProj()` — 弹丸复用，避免 GC

**性能优化 (已实施)**:
- 敌人遍历：从每帧 4 次 `enemies.children.iterate()` 合并为 1 次（主循环同时完成 AI/血条/定位数据收集）
- 弹丸对象池：`getPooledProj` / `freeProj` 替代 create/destroy，按纹理分组复用

### `src/ui.js` (442 行)
- `hotbarRender()` — 渲染底部 5 格快捷键（Q+W/E/R/T）
- `updateHUD()` — 更新 HUD：境界、等级、HP/XP 血条、金币、杀敌数
- `toggleCharPanel()` — 角色面板：属性点加点、装备查看
- `toggleBagPanel()` / `renderBagPanel()` — 背包：装备/卸下/出售
- `toggleSkillPanel()` — 技能面板：升级技能、更换快捷键
- `toggleAchPanel()` — 成就面板
- `toggleShopPanel()` — 百宝阁：购买装备箱、洗髓丹、悟道丹、灵石袋
- `upgradeSkill()` — 消耗技能点升级技能
- `addAttr()` — 消耗属性点加点
- `updateHotbarCooldowns()` — 技能冷却显示
- 背包右键菜单（出售）

### `src/cultivation.js` (73 行)
- `tryBreakthrough()` — 显示突破面板（成功率 50% + 5%/境界，最高 90%）
- `doBreakthrough()` — 执行突破：消耗灵石，掷骰子，成功晋级/失败扣血
- `cancelBreakthrough()` — 关闭突破面板
- `toggleCultivate()` — 切换打坐修炼（按 SPACE）

### `src/equipment.js` (36 行)
- `genEquipment(monsterLv, forceRarity)` — 程序化生成一件装备
  - 根据怪物等级和稀有度规则决定品质
  - 随机选择部位（武器/头盔/衣服/鞋子/戒指/项链）
  - 按品质倍率生成属性值
  - 生成前缀+名字（如 "仙品的龙鳞甲"）

### `src/helpers.js` (13 行)
- `setStatus(text, dur)` — 底部状态消息
- `setLoot(text)` — 掉落弹窗

### `src/save.js` (49 行)
- `saveGame()` — 序列化 P 对象和 waveNum 到 localStorage
- `loadGame()` — 反序列化，版本检验 (v1)，补全缺失字段，恢复状态
- 兼容性处理：attrs/attrPoints/skillLevels/totalGoldEarned 等字段缺失时设置默认值

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

### 修仙境界 (8 大境界 × 9 层，飞升境 1 层)
凡体 → 炼气期 → 筑基期 → 金丹期 → 元婴期 → 化神期 → 大乘期 → 渡劫期 → 飞升境

- **晋升方式**: 杀敌积累 → 打坐(SPACE)修炼满当前层数 → 按 C 突破渡劫
- **突破成功率**: 50% + 境界×5% (最高 90%)，消耗灵石
- **失败惩罚**: 损失 30% 最大生命值
- **成功奖励**: 进阶到下一境界第一层，满血

### 战斗系统
- **自动攻击 (Q)**: 锁定范围内最近敌人发射飞剑，CD 0.7 秒，伤害公式 `(atk+level×0.5)×baseDmg×(0.72+lv×0.06)×攻速buff`
- **12 种手动技能**:
  - 伤害: 火球术 (高伤) / 御剑术 (3 弹齐射) / 落雷 (单体高伤)
  - 盾: 土盾 (30% DR) / 剑盾 (20% DR + 反弹) / 金盾 (50% DR)
  - Buff: 疾风步 (+40% 速度) / 战意 (+30% 攻速 +20% 伤害) / 鹰眼 (+50% 射程)
  - 领域 AOE: 水域术 (AOE + 迟缓) / 雷域 (AOE 高伤) / 风域 (AOE + 聚怪)
- **暴击**: 15% + 等级×0.3% 几率双倍伤害
- **连杀**: 3 秒内连续击杀，高于 5 连杀后每次 +10% 经验

### 装备系统
- 6 部位: 武器 / 头盔 / 衣服 / 鞋子 / 戒指 / 项链
- 6 品质: 凡品(×1) → 下品(×1.4) → 中品(×2) → 上品(×3) → 极品(×5) → 仙品(×9)
- 掉落率: 普通 35% / 精英 60% / Boss 100%
- 程序化生成属性值，按品质倍率缩放
- 背包 30 格上限，可装备/出售/购买装备箱

### 四维属性
| 属性 | 效果 |
|---|---|
| 筋骨 | 攻击 +2/点 |
| 体魄 | 生命 +12 + 防御 +0.8/点 |
| 神识 | 攻击 +0.8/点 |
| 身法 | 速度 +5/点 |

- 来源: 每级 +3 属性点，成就奖励
- 可购买洗髓丹重置

### 5 大区域
| 区域 | 怪物等级 | 距离中心 |
|---|---|---|
| 灵溪村 (安全) | 1 | 0-500 |
| 落霞山脉 | 3 | 500-1100 |
| 幽暗密林 | 6 | 1100-1700 |
| 寒冰极域 | 10 | 1700-2300 |
| 烈焰炼狱 | 15 | 2300-3500 |

- 中心安全区 (半径 360px) 不刷怪、不受伤
- 越远离中心怪物越强

### 兽潮系统
- 区域清空后 8 秒触发下一波
- 波次数量: `4 + 波数×2` (最大 30)
- 第 5/10/15...波有强化 Boss
- 记录最大存活波次用于成就

### 死亡系统
- 死亡后弹出重生面板，损失 15% 灵石，原地重生满血

### 成就系统 (15 个)
- 杀敌里程碑 (10/50/200/1000)
- 等级里程碑 (5/10/20)
- 境界突破 (筑基/金丹/元婴)
- 财富 (500/5000 灵石)
- 获得极品装备
- 撑过第 10 波兽潮
- 累计游戏 1 小时

### 存档系统
- 30 秒自动存档 + 手动存档按钮
- 加载时自动恢复所有状态
- 版本标记 v1，加载时补全缺失字段

## 代码执行流程

```
1. 浏览器加载 index.html
2. <script src="lib/phaser.min.js"> 加载 Phaser 引擎
3. <script type="module" src="src/main.js"> 启动:
   a. import 所有模块 → 触发各模块顶层代码 (state.js 初始化 P、刷新技能)
   b. 注册 window 全局函数 (bridge: window.setStatus, window.saveGame 等)
   c. 渲染 HUD 和热栏
   d. new Phaser.Game() → 启动 MainScene
4. MainScene.preload() → 程序化生成纹理
5. MainScene.create() → 创建世界、玩家、物理、输入绑定
6. loadGame() → 尝试读取存档
7. MainScene.update() 每帧循环:
   ├─ 检查安全区
   ├─ 处理玩家输入移动
   ├─ 修炼进度更新
   ├─ Buff 计时器
   ├─ 区域切换
   ├─ ★ 单次遍历敌人组 (AI + 血条 + 收集 close`Q 和 activeEnemies)
   ├─ Q 自动攻击 (使用 close`Q)
   ├─ 手动技能 (使用 activeEnemies)
   ├─ 兽潮管理
   ├─ 掉落/状态计时器
   ├─ HUD 刷新 (每 ~120ms)
   ├─ 自动存档 (每 30s)
   └─ 成就检查 (每 2s)
```
