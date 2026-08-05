# 百世修仙 — 文字修仙世界

2D 修仙题材单屏塔防浏览器游戏，基于 Phaser 3.60 + 原生 JavaScript（ES Modules），纯前端实现，无构建工具、无服务器依赖。

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
| UI 层 | HTML5 + CSS3 DOM overlay（`data-action` 事件委托） |
| 持久化 | localStorage (key: `xiuxian_save`, v2) |
| 部署 | 任意静态文件服务器 |

## 项目结构

```text
game-xiuxian/
├── index.html          # 页面骨架：画布、主页/局内 HUD/抽卡/结算/设置 DOM
├── data.json           # 全部静态配置（卡池/敌人/关卡平衡/成就）
├── resources/
│   └── style.css       # 全部样式
├── src/                # 全部运行时逻辑（ES Modules，`@/` 别名）
│   ├── main.js         # 入口：调用 boot()
│   ├── app/
│   │   ├── bootstrap.js   # 启动流程：加载数据 -> 校验 -> 初始化 -> 创建 Phaser
│   │   └── loader.js      # 加载进度条
│   ├── data/
│   │   └── index.js       # data.json 加载、校验、索引（配置常量 live binding）
│   ├── core/
│   │   ├── main-scene.js  # MainScene：单屏战场、玩家固定、对象池、主循环
│   │   ├── state.js       # 玩家状态、局内/总等级、成就判定
│   │   ├── save.js        # 存档 v2（总等级/关卡进度），v1 迁移
│   │   ├── progression.js # 进度结构防御性初始化
│   │   ├── helpers.js     # 状态消息 / 掉落弹窗
│   │   ├── events.js      # 事件总线 bus
│   │   ├── dom.js         # DOM 元素缓存
│   │   ├── runtime.js     # Game/Scene/冷却 引用
│   │   ├── game-config.js # Phaser 配置
│   │   └── textures.js    # 代码生成纹理（含内联 SVG 飞剑）
│   ├── systems/
│   │   ├── index.js          # installSceneSystems 装配
│   │   ├── stage-system.js   # 关卡流程：波次/通关/战败/结算/回主页
│   │   ├── card-system.js    # 抽卡：3 选 1、技能/强化卡应用
│   │   ├── combat-system.js  # 普攻飞剑 + 抽卡技能自动轮转（伤害入口薄封装）
│   │   ├── damage.js         # 碰撞、伤害、经验结算与战败流程
│   │   ├── combat-loop-system.js / ai-system.js / spawn-system.js
│   │   ├── buff-system.js / ui-tick-system.js
│   │   ├── ground-effect-system.js / entity-animation-system.js / text-pool.js
│   ├── effects/
│   │   └── skill-effects.js  # 弹丸/领域/激光等技能特效
│   └── ui/
│       ├── index.js          # 主页/局内 HUD/抽卡面板/结算面板渲染
│       └── actions.js        # ACTIONS 动作表 + data-action 事件委托
├── lib/phaser.min.js   # 第三方 Phaser 运行库
├── jsconfig.json       # 编辑器路径映射：@/* -> ./src/*
├── README.md           # 本文档
└── TASK.md             # 历史实施计划（已过时，仅供参考）
```

**路径别名**：`index.html` 通过 `<script type="importmap">` 把 `@/` 映射到 `./src/`，所有模块导入统一使用 `@/core/state.js` 这类别名；`jsconfig.json` 为编辑器提供相同映射。

纹理全部由代码生成，无外部图片/音频/字体资源。

## 玩法系统

### 核心循环

```
主页（局外）──进入关卡──▶ 单屏战场（角色固定底部，自动攻击）
                              │
                 击杀敌人 → 获得局内经验 → 升级 → 抽卡（3 选 1）
                              │
                     第 5 波 Boss 死亡 = 通关
                 通关 / 战败 → 结算总经验 → 返回主页
                              │
                 主页 → 进入下一关（局内等级重新从 1 级开始）
```

### 局内（关卡内）

- **角色完全固定**在屏幕底部中央，不可移动；普攻飞剑自动索敌连射
- 敌人从顶部生成向下涌来，接触玩家扣血，血量归零 → 战败
- **局内等级** Lv.1 起：经验曲线 `5 + 等级×3`，升级弹出抽卡面板（**3 选 1**）并暂停战斗
- 每关 **5 波**：波次怪物数 `8 + 关卡×2 + 波次×3`，第 5 波为 Boss 波；怪物属性随关卡等级 ×`(1 + (关卡-1)×0.35)`
- 局内属性 = 总等级永久加成 + 局内等级加成（+2 攻/级）+ 卡牌加成

### 抽卡（data.json `cards`）

- **飞剑术是普通攻击**（不占用技能位，自动索敌连射，弹道/攻速/伤害/飞行速度可被强化卡增强）
- **技能上限 4 个**：习得后自动轮转施放，重复抽提升技能等级（每级 +18% 伤害）；已有 4 个技能后，抽卡只出强化卡

**技能卡**（6 选 ≤4）：

| 卡 | 效果 |
|---|---|
| 巨剑术 🗡️ | 召唤巨剑向前猛冲，高额伤害 |
| 火球术 🔥 | 追踪火球，命中后持续灼烧 |
| 雷域 ⚡ | 雷电领域持续轰击 |
| 高能射线 🔴 | 红球持续发射激光 |
| 冰霜领域 ❄️ | 减速并持续伤害 |
| 回春术 💚 | 立即恢复 30% 生命 |

**强化卡**（可叠层）：追风（飞剑速度+80）、剑意（飞剑伤害+25%）、疾风（攻速+15%）、分身（弹道+1）、会心（暴击+8%）、鹰眼（射程+15%）、吸血（吸血5%）、玄体（生命上限+30 并回满）、悟性（经验+15%）

### 局外（主页）

- 显示**游戏总等级**、总经验条、永久属性加成（每总等级 +3 攻 / +10 生命）、最高通关关卡
- 点击「进入第 N 关」开始一局；通关解锁下一关，战败可重试当前关
- 每局结算总经验：通关 `100 + 关卡×40`；战败 `击杀×2 + 波次×15`

### 存档（v2）

- `xiuxian_save` v2：`{ totalLevel, totalXp, maxClearedStage, totalKills, totalPlayTime, achievements }`
- 局内状态（等级/抽卡/波次）不入存档，每关重置
- v1 旧存档自动迁移：保留成就与累计击杀，其余按 v2 默认初始化
- 30 秒自动存档 + 手动保存 + 导入/导出 JSON + 重置

### 成就（data.json `achievements`，10 个）

累计击杀 50/200/1000、游戏总等级 5/10/20、通关第 3/6/10 关、累计游戏 1 小时 —— 奖励为游戏总经验。

## data.json 结构

| 键 | 内容 |
|---|---|
| `world` | 战场尺寸与玩家固定坐标 |
| `cards.skill` / `cards.upgrade` | 技能卡 / 强化卡池（id/名称/效果/数值） |
| `bestiary` | 敌人模板列表（hp/atk/speed/xp/攻击类型） |
| `bossNames` | Boss 名称池 |
| `achievements` | 10 个成就：结构化条件（`condition.type/value`）+ 经验奖励 |
| `combatTuning` | 敌人缩放、伤害/血量平衡参数 |
| `progression` | 经验曲线、永久加成、波次配置、结算公式 |
| `assets` | 资源映射（当前为空） |

## 模块职责速览

- **`src/systems/stage-system.js`**：关卡流程 —— `start()` 开局（局内重置+生成第 1 波）、`update()` 波次推进（敌清空 2 秒后下一波）、`completeStage()`/`failStage()` 结算并显示结算面板、`backToMenu()` 回主页
- **`src/systems/card-system.js`**：抽卡 —— `onLevelUp()` 暂停战斗并弹出 3 选 1、`pick()` 应用技能/强化
- **`src/systems/combat-system.js`**：普攻飞剑（弹道数受「分身」卡加成）与抽卡技能自动轮转（CD 到且有目标就放）
- **`src/systems/damage.js`**：伤害、经验结算、局内升级（触发抽卡）、战败判定
- **`src/core/state.js`**：`P` 状态（局内/总等级双轨）、`startRun()` 局内重置、`addTotalXp()` 总等级升级、成就判定
- **`src/core/save.js`**：v2 存档与 v1 迁移
- **`src/ui/`**：主页/局内 HUD/抽卡/结算渲染 + `data-action` 事件委托

## 代码执行流程

```text
1. index.html：lib/phaser.min.js（全局 Phaser）→ importmap（@/ → ./src/）→ src/main.js
2. src/data/index.js fetch('data.json') 加载并校验 → 建立索引（live binding）
3. src/app/bootstrap.js：初始化状态 → 绑定 data-action 委托 → window load 后创建 Phaser Game
4. MainScene.create()：单屏战场、玩家固定底部、对象池、系统装配 → 读档 → 显示主页
5. 主页「进入第 N 关」→ StageSystem.start() → 每帧循环：
   ├─ 敌人 AI 追踪（从顶部向玩家涌来）+ 血条
   ├─ 普攻飞剑自动索敌 + 抽卡技能自动轮转
   ├─ 击杀 → 局内经验 → 升级 → 抽卡面板（暂停）
   ├─ 波次推进（5 波 + Boss）→ 通关结算
   └─ HUD 刷新（每 ~6 帧）/ 自动存档（每 30s）/ 成就检查（每 2s）
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
| 想改卡池/数值 | 全部在 `data.json`：`cards`（卡牌）、`progression`（经验/波次/结算）、`combatTuning`、`bestiary` |
| 想加新功能 | 按模块职责定位：数值进 `data.json`，玩法逻辑进 `src/systems`，界面进 `src/ui` |
