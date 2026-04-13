# 3D-WORLD

`Babylon.js` 第三人称无限开放世界动作原型。

当前仓库不是完整 MMO，也不是通用引擎模板，而是一个以“世界流式生成 + 第三人称战斗探索”为核心的前端原型。

## 项目状态

当前已实现：

- 无限 `Chunk` 流式加载
- 平滑高度场地形
- 第三人称角色、相机、瞄准缩放
- 地表吸附与基础防穿模保护
- 敌人、掉落、装备、成就
- 手枪 / 步枪战斗循环

当前已移除：

- 宠物数据
- 宠物跟随逻辑
- 宠物属性加成
- 宠物 UI

## 运行

这是纯前端项目，需要本地静态服务器运行。

示例：

```bash
npx serve .
```

启动后访问本地地址即可。

## 操作

- `WASD` 移动
- `Space` 跳跃
- `Shift` 蹲下
- 鼠标移动控制镜头
- 左键射击
- 右键瞄准
- 滚轮 / `1-4` 切换槽位
- `Q` 技能
- `F` 爆发
- `R` 换弹
- `E` 背包

当前第三人称控制规则：

- 镜头朝向和角色朝向分离
- 角色朝实际移动方向转身
- 纯 `S` 为慢速后退

## 重构回归清单

每次调整核心脚本后，建议至少手工回归以下流程一次：

- 启动项目后能正常进入场景，点击画面可以锁定鼠标
- `WASD` 移动、`Space` 跳跃、`Shift` 蹲下都正常
- 鼠标移动能控制第三人称镜头，右键瞄准会缩放视角
- 左键可以正常射击，命中敌人或地形时有反馈
- 武器打空后可自动 / 手动 `R` 换弹
- `Q` 技能和 `F` 爆发能正常触发，并进入冷却
- 滚轮与 `1-4` 可以切换槽位
- `E` 可以打开 / 关闭背包，暂停与恢复状态正常
- 敌人会巡逻、发现玩家后追击并造成伤害
- 拾取物可以收集，武器 / 食物 / 装备奖励正常生效
- 死亡面板出现后可以复活，角色回到出生点
- 走出当前区域后会触发 `Chunk` 加载与远处区块卸载

## 目录

```text
index.html
README.md
lib/
src/
  data.js
  runtime.js
  main.js
  world.js
  enemy.js
  progression.js
  player.js
```

## 脚本职责

### `index.html`

- 页面结构和 DOM 容器
- HUD / 背包 / 暂停 / 死亡面板
- 脚本加载入口

### `src/data.js`

- 静态数据源
- 世界参数
- 生物群系参数
- 武器数据
- 装备模板
- 成就定义

### `src/runtime.js`

- 共享运行时配置 `CONFIG`
- 全局状态对象 `state` / `world` / `player`
- 运行时初始化辅助函数

### `src/main.js`

- Babylon 引擎与场景初始化
- 主循环 `runFrame()`
- 热栏与基础运行时工具
- 高度噪声与 `terrainHeight()`

### `src/world.js`

- 材质目录初始化
- 地形网格构建
- `Chunk` 创建 / 卸载 / 流式更新
- 树木、岩石、拾取物、出生点标记

### `src/player.js`

- 玩家碰撞体和可见模型
- 第三人称相机
- 输入处理
- 移动、跳跃、贴地、防穿模
- 武器射击、技能、爆发
- HUD / 背包 UI 更新

### `src/enemy.js`

- 敌人生成
- 巡逻 / 追击 / 攻击 / 死亡
- 敌人血条

### `src/progression.js`

- 玩家属性汇总
- 装备评分与穿戴
- 成就统计与奖励

## 脚本加载关系

当前项目仍然使用全局脚本，不是 ES Module。

这意味着：

- 文件之间通过全局变量和全局函数协作
- 加载顺序必须正确
- 修改时要注意跨文件依赖

典型依赖方向：

- `data.js` 提供静态配置
- `runtime.js` 提供共享运行时对象和配置
- `main.js` 提供场景初始化和通用函数
- `world.js` / `player.js` / `enemy.js` / `progression.js` 共同消费这些全局对象

## 核心对象

### `state`

运行时 UI 与流程状态。

典型内容：

- 是否死亡
- 是否打开背包
- 出生锁定计时
- 提示文本计时

### `player`

玩家运行时数据。

典型内容：

- `body` 碰撞体
- `facingNode` 角色朝向节点
- `yawNode` / `pitchNode` 镜头节点
- 武器与弹药状态
- 冷却时间
- 生命值与派生属性

### `world`

世界流式状态。

典型内容：

- 已加载 `Chunk`
- 当前区块坐标
- 地形与道具数量统计

### `progression`

成长系统状态。

- 等级
- 经验
- 装备栏
- 成就进度
- 统计指标

## 当前渲染与地形实现

当前地形不是传统方块堆叠，而是高度场网格：

1. `terrainHeight(x, z)` 生成高度
2. `world.js` 根据高度场拼接 chunk mesh
3. 顶点法线直接按高度差采样计算
4. 顶点色目前统一为单一绿色

树木当前策略：

- 树样式统一
- 树高随机
- 树冠尺寸随机
- 叶色轻微随机

## 当前角色与相机实现

当前玩家由两层组成：

1. 隐形碰撞盒 `player.body`
2. 可见方块人模型 `player.avatar`

朝向系统分离为：

- `facingNode`: 角色身体朝向
- `yawNode`: 镜头水平朝向
- `pitchNode`: 镜头俯仰

这样镜头旋转不会直接带动角色转身。

相机当前支持：

- 跟随视角
- 瞄准缩放
- 地形遮挡回推
- 更高的镜头观察点

## 当前地表与碰撞策略

玩家贴地不只依赖 Babylon 的 `moveWithCollisions()`。

当前组合是：

1. 玩家水平移动仍使用 `moveWithCollisions()`
2. 使用脚底 9 点采样获取局部最高地表
3. 再从上方向下发射射线获取真实 mesh 命中高度
4. 每帧执行净空修正，防止陷入地形

这套逻辑主要分布在 `src/player.js`：

- `getPlayerFootprintSurfaceHeight()`
- `getGroundContactHeight()`
- `enforceGroundClearance()`
- `snapPlayerToGround()`

## 当前战斗结构

战斗仍是原型阶段，结构偏轻量：

- 左键普攻
- 右键瞄准
- `Q` 技能
- `F` 爆发
- 装备和属性会影响数值

主要逻辑集中在：

- `src/player.js`
- `src/progression.js`
- `src/data.js`

## 当前已知限制

- 仍然使用全局脚本，模块边界较弱
- 第三人称操作手感还在调
- 陡坡和极端边缘地形仍可能需要进一步修正
- 地形碰撞仍依赖 Babylon mesh picking + 自定义高度逻辑
- 角色动画仍是程序摆动，不是真正骨骼动画

## 修改代码时的建议

### 地形相关

优先检查：

- `terrainHeight()`
- `createTerrainMesh()`
- `populateChunk()`
- `createTree()`

### 玩家控制相关

优先检查：

- `createPlayer()`
- `updatePlayerMovement()`
- `registerInput()`
- `updateViewModel()`

### 穿模相关

优先检查：

- `getGroundContactHeight()`
- `enforceGroundClearance()`
- `snapPlayerToGround()`

## 后续重构方向

建议下一阶段优先做：

1. 把全局脚本拆成模块
2. 分离渲染层和玩法层
3. 把玩家控制器做成独立模块
4. 把 chunk 管理和地形采样抽离为世界系统
5. 增加更稳定的角色动画与状态机

## 当前定位

更准确的项目描述是：

`Babylon.js 第三人称无限开放世界动作原型`
