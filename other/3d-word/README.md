# 3D-WORLD

`Babylon.js` 第三人称无限开放世界动作原型，类似激战2 的操作方式，包含基础的地形、角色控制、战斗和成长系统。

## 项目目标：

- 无限 `Chunk` 流式加载
- 平滑的地形坡度
- 第三人称，操作方式类似激战2
- 地表吸附与基础防穿模保护
- 敌人、Boss、掉落、装备、任务成长
- 弓箭、近战武器、技能、药剂
- 技能系统、技能书升级
- 恢复药剂与增益药剂
- 背包与设置面板

## 运行

纯前端项目，需要本地静态服务器：

```bash
npx serve .
```

启动后在浏览器打开本地地址即可。

## 操作

| 按键 | 功能 |
|---|---|
| `WASD` | 移动 |
| `Space` | 跳跃 |
| `Shift` | 蹲下 |
| 鼠标移动 | 控制镜头 |
| 左键 | 射击 |
| 右键 | 瞄准（缩放视角） |
| 滚轮 / `1-4` | 切换热栏槽位 |
| `Alt + 滚轮` | 调整第三人称镜头距离 |
| `R` | 换弹 |
| `Q` | Shockwave 震荡波技能 |
| `F` | Overdrive 强化技能 |
| `Z` | 使用恢复药剂 |
| `X` | 使用增益药剂 |
| `E` | 打开背包 |
| `O` | 打开设置 |

第三人称控制规则：

- 镜头朝向和角色朝向分离
- 角色朝实际移动方向转身
- 纯 `S` 为慢速后退

## 目录结构

```text
index.html            页面结构 / HUD / 热栏 / 暂停与死亡面板 / 脚本加载
README.md
lib/
  babylon.js          Babylon.js 引擎
  babylon.gui.min.js
  babylonjs.loaders.min.js
model/                3D 模型资源（architecture / role / weapon）
src/
  data.js             静态数据：世界参数、生物群系、武器、装备、技能、药剂
  runtime.js          共享运行时对象：CONFIG / state / world / player
  main.js             引擎初始化、主循环、噪声函数、热栏逻辑
  world.js            材质、地形网格、Chunk 流式加载/卸载、树木岩石拾取物
  enemy.js            敌人生成、巡逻/追击/攻击/死亡 AI、血条
  progression.js      等级经验、装备掉落穿戴、技能升级、任务、药剂增益
  player.js           碰撞体/模型、相机、输入、移动贴地防穿模、战斗、HUD
```

## 脚本加载顺序与依赖

项目使用全局脚本（非 ES Module），加载顺序：

```
lib/babylon.js → data.js → runtime.js → main.js → progression.js → world.js → enemy.js → player.js
```

依赖方向：

- `data.js` 提供 `GAME_DATA` 静态配置
- `runtime.js` 提供 `CONFIG`、`state`、`world`、`player` 全局运行时对象
- `main.js` 初始化引擎/场景，提供 `terrainHeight()`、`vec3()`、`clamp()` 等工具函数
- `world.js` / `player.js` / `enemy.js` / `progression.js` 共同消费上述全局变量

修改时注意跨文件依赖和加载顺序。

## 核心全局对象

### `GAME_DATA`

静态数据源，定义在 `data.js`，包含：

- `world`：Chunk 尺寸、高度范围、水面高度
- `biomes`：四种生物群系（Meadow / Forest / Desert / Snow）的颜色、树木与岩石概率、敌人缩放
- `weapons`：Rune Pistol（半自动手枪）、Storm Rifle（全自动步枪）
- `skills`：Shockwave（近身范围）、Overdrive（短时强化）
- `potions`：Recovery Potion（恢复）、Battle Tonic（增益）
- `equipment`：四个装备槽（helmet / armor / boots / relic），四级稀有度

### `CONFIG`

运行时常量，定义在 `runtime.js`，包含：

- 地形参数：种子、Chunk 尺寸/分辨率、加载/卸载半径
- 玩家参数：碰撞盒尺寸、速度、跳跃、重力
- 相机参数：灵敏度、枢轴高度、跟随距离、瞄准距离、距离范围
- 敌人参数：视野距离、攻击范围

### `state`

UI 与流程状态：

- 死亡标志、伤害闪屏计时、出生锁定计时
- 提示文本与计时、背包/设置面板开关
- 当前视角模式（`"third"`）

### `player`

玩家运行时数据：

- `body`：碰撞体
- `facingNode` / `yawNode` / `pitchNode`：朝向与镜头节点
- `camera` / `cameraRoot` / `cameraFocus`：相机系统
- 武器弹药 `ammo`、冷却、换弹状态
- 生命值、出生点、接地状态

### `world`

世界流式状态：

- `chunks`：已加载 Chunk（Map）
- 当前区块坐标与生物群系 ID
- 地形/道具计数、敌人序号

### `progression`

成长系统状态：

- 等级、经验、金币、技能书
- 装备栏与背包、装备序号
- 技能等级与冷却
- 三条任务线（Bounty Hunt / Field Supplies / Frontier Cartography）
- 药剂库存与临时增益
- 统计指标（击杀、拾取、距离、区块探索）

## 地形实现

高度场网格，不是方块堆叠：

1. `terrainHeight(x, z)` 基于多层噪声叠加与生物群系混合输出高度
2. `getBiomeBlend(x, z)` 按坐标哈希计算四种群系权重
3. `createTerrainMesh()` 逐顶点采样高度，计算法线与顶点色
4. 顶点色根据群系混合、高度和法线着色，支持坡面棕色渐变
5. 存在水面层 `createWaterMesh()`，高度为 `waterLevel`

树木/岩石根据群系概率随机散布，树高和树冠尺寸随机，叶色按群系变化。

## 角色与相机

玩家由两层组成：

1. 隐形碰撞盒 `player.body`（`moveWithCollisions()` 驱动）
2. 可见方块人模型 `player.avatar`（头、躯干、四肢，程序摆动动画）

朝向系统：

- `facingNode`：角色身体朝向（朝移动方向转身）
- `yawNode` / `pitchNode`：镜头水平/俯仰（独立于角色）

相机支持：

- 第三人称跟随（肩部偏移）
- 瞄准缩放（右键拉近）
- 地形遮挡回推
- `Alt + 滚轮` 调整远近

## 地表碰撞与防穿模

不只依赖 `moveWithCollisions()`，组合策略：

1. 水平移动用 `moveWithCollisions()`
2. `getPlayerFootprintSurfaceHeight()`：脚底 9 点采样获取局部最高地表
3. `getGroundContactHeight()`：从上方向下发射射线获取 mesh 命中高度
4. `enforceGroundClearance()`：每帧净空修正，防止陷入地形
5. `snapPlayerToGround()`：强制贴地

## 战斗系统

- 左键普攻（射线检测命中）
- 右键瞄准（视角缩放）
- 自动/手动换弹
- `Q` Shockwave：近身范围 AOE，带冷却
- `F` Overdrive：短时强化，带冷却
- 装备属性影响攻击力和防御力
- 命中产生弹道示踪（tracer）和粒子爆发
- 音效通过 Web Audio API 合成

## 敌人 AI

- 每个 Chunk 生成敌人，可标记为 Boss（放大模型）
- 三状态：巡逻 → 追击 → 攻击
- 视野距离内检测玩家，有视线判定 `enemyHasLineOfSight()`
- 死亡后延迟重生，Boss 有概率掉落技能书
- 血条面板（billboard 朝向玩家）

## 成长系统

- 击杀/拾取/探索积累经验，升级提升基础属性
- 四装备槽，随机掉落装备带稀有度和随机属性
- 两个主动技能可用技能书升级（降低冷却/增强效果）
- 三条可循环任务（击杀 / 收集 / 探索），完成后升级目标量
- 恢复药剂回血，增益药剂临时提升攻击/防御/移速等

## 回归测试清单

每次改动后建议手工验证：

- [ ] 启动后正常进入场景，点击画面锁定鼠标
- [ ] `WASD` 移动、`Space` 跳跃、`Shift` 蹲下
- [ ] 鼠标控制镜头，右键瞄准缩放
- [ ] 左键射击，命中敌人/地形有反馈
- [ ] 弹尽自动/手动 `R` 换弹
- [ ] 滚轮与 `1-4` 切换槽位
- [ ] `Alt + 滚轮` 调整镜头远近
- [ ] `Q` / `F` 技能释放并进入冷却
- [ ] `Z` / `X` 药剂消耗生效
- [ ] `E` 背包管理装备、技能升级、任务进度
- [ ] `O` 设置切换视角与鼠标灵敏度
- [ ] 敌人巡逻 → 追击 → 攻击
- [ ] Boss 掉落技能书，技能书可升级技能
- [ ] 拾取物正常收集，奖励生效
- [ ] 死亡面板 → 复活 → 回到出生点
- [ ] 走出区域触发 Chunk 加载/卸载

## 关键函数索引

### 地形

| 函数 | 文件 | 作用 |
|---|---|---|
| `terrainHeight()` | `main.js` | 噪声叠加生成高度 |
| `getBiomeBlend()` | `main.js` | 计算群系权重 |
| `createTerrainMesh()` | `world.js` | 构建 Chunk 地形网格 |
| `createWaterMesh()` | `world.js` | 构建水面 |
| `populateChunk()` | `world.js` | 散布树木/岩石/拾取物 |
| `createTree()` | `world.js` | 创建树木 |

### 玩家

| 函数 | 文件 | 作用 |
|---|---|---|
| `createPlayer()` | `player.js` | 初始化碰撞体与相机 |
| `createPlayerAvatar()` | `player.js` | 构建方块人模型 |
| `updatePlayerMovement()` | `player.js` | 每帧移动与贴地 |
| `registerInput()` | `player.js` | 绑定键鼠事件 |
| `updateViewModel()` | `player.js` | 更新武器视图模型 |
| `fireWeapon()` | `player.js` | 射击与命中检测 |

### 碰撞

| 函数 | 文件 | 作用 |
|---|---|---|
| `getPlayerFootprintSurfaceHeight()` | `player.js` | 9 点采样地表高度 |
| `getGroundContactHeight()` | `player.js` | 射线检测 mesh 高度 |
| `enforceGroundClearance()` | `player.js` | 每帧净空修正 |
| `snapPlayerToGround()` | `player.js` | 强制贴地 |

### 成长

| 函数 | 文件 | 作用 |
|---|---|---|
| `resolvePlayerStats()` | `progression.js` | 汇总玩家属性 |
| `createRandomEquipment()` | `progression.js` | 随机生成装备 |
| `upgradeSkill()` | `progression.js` | 技能书升级技能 |
| `advanceQuest()` | `progression.js` | 推进任务进度 |
| `useHealingPotion()` | `progression.js` | 使用恢复药剂 |
| `useBuffPotion()` | `progression.js` | 使用增益药剂 |

## 已知限制

- 全局脚本架构，模块边界弱
- 第三人称操作手感仍在调整
- 陡坡和极端地形边缘仍可能穿模
- 地形碰撞依赖 Babylon mesh picking + 自定义高度逻辑
- 角色动画为程序摆动，非骨骼动画
- 音效为 Web Audio 合成，无真实音频资源

## 后续重构方向

1. 全局脚本迁移至 ES Module
2. 分离渲染层与玩法层
3. 玩家控制器独立模块化
4. Chunk 管理与地形采样抽离为世界系统
5. 引入骨骼动画与状态机
