# 纯 HTML + JavaScript + Canvas 塔防学习 Demo — Cursor 分步提示词

面向零基础、学习用途；不使用 TypeScript、Vite 或前端框架，仅用原生 Canvas 2D。

---

## 推荐文件结构（可选）

```
项目文件夹/
  index.html          ← canvas + 引用脚本
  js/
    main.js           ← 入口：初始化 canvas、启动循环
    game.js           ← 状态：金币、生命、波次
    map.js            ← 路径点、网格、坐标换算（可选）
    enemy.js          ← 敌人移动与绘制
    tower.js          ← 塔、射程、发射逻辑（可后合并）
  style.css           ← 可选，画布居中
```

零基础可先单文件，跑通后再拆文件。

脚本可用 `<script type="module" src="js/main.js"></script>`；若不用 module，合并为一个大 `game.js` 亦可。

---

## 通用约束（可粘贴到每条提示词末尾）

- 只用**原生 Canvas 2D API**（`getContext('2d')`），不要用 React / Vue / Vite / TypeScript。
- 本地预览：若使用 `type="module"`，说明是否需要本地静态服务器（如 VS Code Live Server、`python -m http.server`），避免 `file://` 限制。

---

## （可选）与 `docs/canvas-exported-coords` 配套开发

**不一定要用。** 若你希望 Canvas Demo **与本仓库 Theme1 地图、路径 JSON 对齐**，建议在通用约束之外遵守：

| 约定 | 说明 |
|------|------|
| 逻辑地图尺寸 | **910 × 490**（与 `theme1-paths.json` 中 `mapPixelSize` 一致） |
| 路径数据 | 使用仓库内 `docs/canvas-exported-coords/theme1-paths.json` 某关的 `roadPath`，或复制其中的 `[{x,y},…]` 到项目 |
| 自适应窗口 | 画布 CSS 铺满浏览器时，用 `translate(offsetX, offsetY) + scale(scale)` 把逻辑坐标映射到屏幕；公式与指针逆变换见 **`docs/canvas-exported-coords/README.md`** |
| 网格边长 | Theme1 TMX 中 **tile 为 70**，建塔格若按格对齐可作为参考 |

**步骤与提示词怎么选：**

- **通用路线**：继续用下面「第 0～7 步」原文（手写分辨率与路径即可）。
- **配套路线**：第 0～2 步改用本节 **「配套版提示词」**；第 3～7 步仍可沿用原文（玩法逻辑始终在 **910×490 逻辑坐标**内；若已做自适应，绘制前变换矩阵已包含缩放）。

---

### 第 0 步（配套版）：全屏自适应 + 逻辑地图 910×490

```
我在做纯 HTML + JavaScript + Canvas 塔防学习 Demo，希望与一份固定逻辑尺寸的地图数据对齐：逻辑宽 910、逻辑高 490（路径 JSON 使用该坐标系）。

请生成：
1. index.html + CSS：canvas 用 CSS 铺满浏览器可视区域（宽或高等比铺满、不变形留边），body 无多余滚动条。
2. 游戏循环与绘制：内部统一在「地图逻辑坐标」910×490 内绘制（可先画背景矩形占满该逻辑区域）。
3. 根据 canvas 的 clientWidth/clientHeight 计算 scale = min(clientW/910, clientH/490)，以及居中偏移 offsetX、offsetY；每帧 ctx.translate(offsetX,offsetY); ctx.scale(scale,scale) 之后再画逻辑内容。
4. 可选：devicePixelRatio 处理高清屏。

不要用 TypeScript / Vite / 框架。说明 resize 时如何更新 scale 与 offset。

不要写塔防玩法，只要循环 + 变换 + 清屏 + 逻辑矩形验证画面。
```

---

### 第 1 步（配套版）：指针映射到逻辑坐标（含自适应）

```
在已有「逻辑 910×490 + translate + scale 铺满窗口」的 Canvas 项目上，请实现指针坐标转换：

- 鼠标/触摸相对于 canvas 左上角的坐标，先减去 offsetX、offsetY，再除以 scale，得到地图逻辑坐标 (gameX, gameY)。
- 在点击处在逻辑坐标系画叉验证（注意变换栈顺序与 devicePixelRatio 若存在需一致）。

仍不要用图片，只用几何图形测试。

实现方式请与 docs/canvas-exported-coords/README.md 中「自适应铺满浏览器」一节一致。
```

---

### 第 2 步（配套版）：加载 theme1-paths.json + 画路与建塔格

```
继续纯 Canvas + JS。对接本仓库导出的路径数据：

1. 在运行时 fetch 同目录或指定路径下的 theme1-paths.json（若不能 fetch，请说明改为把 JSON 内嵌为 JS 常量）。
2. 使用 levels[0].roadPath（或指定 level）作为路径折线顶点；逻辑坐标仍为 910×490。
3. 绘制路径折线与顶点；用 70×70 为边长（或与 README 一致）在空白区域标出可建塔格（需说明格子与 road 的判定规则，可简化）。

路径数据单独模块或常量文件，与 Scene 绘制分离。

不要实现敌人移动。验收：更换 JSON 中关卡索引路径形状随之变化。
```

---

## 第 0 步：空白页面 + 画布循环

```
我想用纯 HTML + JavaScript + Canvas 写游戏，不用 TypeScript、不用 Vite、不用任何框架。

请生成：
1. index.html：全屏或居中放一个 canvas，设置合适宽高（例如 960x540）
2. main.js（或单个 game.js）：用 requestAnimationFrame 做游戏循环；每一帧清空画布并画背景色和一块彩色矩形表示「地图区域」

要求代码能在浏览器直接打开运行（若用 type="module"，请说明是否需要本地静态服务器）。

不要写塔防逻辑，只要可运行的循环和绘制。
```

---

## 第 1 步：坐标与缩放（点击映射）

```
在现有 HTML + Canvas 项目上，请增加简单坐标说明：
- 使用固定逻辑分辨率（如 960x540），canvas 用 CSS 拉伸适配窗口时，把鼠标点击坐标转换为画布逻辑坐标（考虑 canvas 在页面上的显示尺寸与内部 width/height 的比例）

只实现坐标转换函数和测试：点击画布时在点击位置画一个小叉，验证坐标正确。

仍不使用图片资源，只用几何图形。
```

---

## 第 2 步：路径数据 + 画路与建塔格

```
继续用纯 Canvas + JS。请增加：
1. 用数组保存一条路的路径点 [{x,y}, ...]（像素坐标，与画布逻辑分辨率一致）
2. 每帧绘制：背景、路径折线（stroke）、路径上的点；用网格划分地图，标出「路边空白可建塔」的格子（如半透明绿色矩形）

把路径数据放在一个单独对象或文件里，与绘制代码分开。

不要实现敌人移动，只画静态路径和格子。
验收：我改路径数组，路的形状会变。
```

---

## 第 3 步：敌人沿路径移动

```
在现有 Canvas 项目上实现敌人沿路径移动：
- 敌人用圆形表示，从第一个路径点出现
- 以恒定速度沿折线走向下一个点，到达终点后记录「漏怪」（减少 lives 变量）并移除该敌人
- 支持多个敌人，用数组保存；每帧 update 位置再 draw

不要用任何游戏引擎，只用 requestAnimationFrame + 数学计算。

先不接塔和子弹。
```

---

## 第 4 步：点击放塔 + 占地 + 射程圈

```
在现有项目上增加「建塔」：
- 点击落在「可建塔且空闲」的格中心则放置一座塔（用方形或三角形表示），该格标记为已占用
- 塔周围画出圆形攻击范围（arc stroke）
- 用常量定义塔造价 towerCost、射程 towerRange；先不要求扣金币，下一步再做经济

实现屏幕坐标到逻辑坐标的点击检测（若已有转换函数则复用）。

不要实现发射子弹。
```

---

## 第 5 步：塔攻击 — 最近敌人 + 子弹 + 扣血

```
用纯 Canvas + JS 实现塔防攻击：
- 每座塔每隔固定时间（如 500ms）在射程内找距离最近的敌人；没有则不发弹
- 子弹用小圆从塔移向目标；用距离判定命中；命中后敌人 hp 减少；hp<=0 则移除敌人并增加金币
- 用简单常量表示子弹伤害、飞行速度

请将逻辑拆成清晰函数：findNearestEnemyInRange、spawnBullet、updateBullets、enemyTakeDamage。

不要用 TypeScript 或外部库。
```

---

## 第 6 步：金币与放塔消耗 + 波次

```
在现有 Canvas 塔防 Demo 上加入经济与波次：
- 全局 gold、lives、currentWave
- 点击放塔时若 gold < towerCost 则不放并可在控制台或画布角落打印提示；成功则扣钱
- 用数组配置多波：每波怪物数量、生成间隔、血量倍数；按波生成敌人到路径起点

仍只用原生 JS，不要引入框架。
验收：钱不够不能造塔；杀怪加钱；波次递增。
```

---

## 第 7 步：文字 UI + 胜负 + 重开

```
请完成游戏流程：
- 用 canvas fillText 或简单 DOM 覆盖显示 gold、lives、wave
- lives<=0 判定失败；所有波结束且场上无敌人可判定胜利（规则写清楚）
- 提供键盘按键（如 R）或页面按钮「重开」：重置所有状态、清空塔、子弹、敌人

保持单项目无构建工具。代码里用常量集中放置数值方便我改平衡。
```

---

## 本地预览说明（备忘）

| 方式 | 说明 |
|------|------|
| 双击 `index.html` | 无 `module`、无跨文件请求时往往可用 |
| VS Code Live Server | 适合 `type="module"` 或多文件 |
| `python -m http.server` | 在项目根目录启动后浏览器访问 `http://localhost:8000` |

---

## 与「保卫萝卜」的关系

玩法层面：路径行进、空地建塔、波次与生命（萝卜）即可类比学习。**美术与音效**请使用自制几何图形、占位图或明确授权的可商用素材；学习 Demo 勿使用正版游戏拆包资源。

---

## 附录 A：将占位图形替换为本项目中的 PNG 图片

以下说明如何在 **纯 HTML + Canvas** 工程里，用磁盘上的 `.png` 替换原来的圆形、矩形占位符；若你从本仓库（保卫萝卜 Cocos 学习项目）拷贝素材，路径仅供参考。

### A.1 在本仓库里找到 PNG

- 玩法相关图：`assets/resources/GamePlay/` 下各子目录（如 `Object`、`Theme*`、`UI` 等）中的 `.png`。
- 选关/地图等：`assets/ChooseLevel/` 等。

在资源管理器中搜索 `*.png`，将需要的文件**复制**到你的 Canvas 项目（不要依赖 `.meta` 文件）。

### A.2 在你自己的前端项目中的目录建议

```
你的canvas项目/
  index.html
  js/
  images/
    tower.png
    monster.png
    bullet.png
    ...
```

### A.3 技术要点（预加载 + 绘制）

1. 使用 `new Image()`，`src` 指向相对 `index.html` 的路径（如 `images/tower.png`）。
2. **等所有图片 `onload` 完成后再进入主循环**，避免首帧空白或闪烁。
3. 绘制用 `ctx.drawImage(img, dx, dy)` 或带目标宽高 `drawImage(img, dx, dy, dw, dh)`。
4. 本地开发建议用 **HTTP 静态服务**（Live Server、`python -m http.server`）打开，避免 `file://` 下的加载问题。

### A.4 路径坐标换图后「位置怎么定」

- **逻辑路径点 `{x,y}` 不必改**，仍表示怪物/单位的逻辑位置（常见约定：**路径点对齐精灵中心**，与以前圆心一致）。
- 换 PNG 后只做 **显示偏移**：例如中心对齐时  
  `drawImage(img, px - w/2, py - h/2)`；若美术以「脚底」对准道路，再给 `y` 加常量微调。
- 若贴图四周透明留白多，视觉上会偏，可用 **锚点偏移常量** `(offsetX, offsetY)` 逐项微调，或在图上画十字调试路径点。

### A.5 常见问题

| 现象 | 处理 |
|------|------|
| 图片不显示 | 用本地服务器打开；检查路径与控制台网络错误 |
| 闪一下或先空白 | 预加载完成后再 `requestAnimationFrame` 主循环 |
| 太大/太小 | `drawImage` 指定显示宽高，或与格子尺寸统一 |
| 精灵表（一张图多帧） | 使用九参数 `drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh)` 裁切 |

### A.6 给 Cursor 用的提示词（替换占位图为 PNG）

```
我的游戏目前用 fillRect / arc 绘制塔、怪物、子弹。我已把 png 放在项目根目录的 images/ 下，文件名示例：tower.png、monster.png、bullet.png（可按实际文件名修改）。

请帮我：
1. 增加图片预加载函数，全部加载成功后再启动游戏主循环；加载失败时在控制台警告并对该种类回退为原来的几何占位绘制。
2. 在原有绘制逻辑处改为 ctx.drawImage，保持原来的逻辑坐标与碰撞判定不变；显示尺寸可用常量统一缩放。
3. 怪物与塔若使用「路径点或格子中心」作为逻辑坐标，请用中心对齐方式计算 drawImage 的左上角（必要时留出 anchorOffsetX/Y 常量方便我微调）。
4. 不要引入 Vite、Webpack、TypeScript 或游戏引擎，保持纯 HTML + JavaScript + Canvas。

请先列出要修改的文件与函数，再给出完整改动。
```

可将本节 **A.6** 整段复制到 Cursor Composer，并根据你的实际文件名、目录微调第一句。

---

## 附录 B：从本仓库 TMX 导出的路径坐标（已生成文件）

若希望 **与 Cocos 项目同一张地图对齐**，可使用已根据 `gamePlay.ts` 与 `Level*.tmx` 计算好的数据：

- `docs/canvas-exported-coords/README.md` — 公式说明（`road` 与 `start_end`）、**自适应铺满浏览器**、等比例缩放
- `docs/canvas-exported-coords/theme1-paths.json` — Theme1 第 1～3 关路径中心点、起点/终点标记坐标

在你的 Canvas 工程里可复制 JSON 中的 `roadPath` 数组作为怪物路径；贴图时用这些 `x,y` 做逻辑位置并对齐 `drawImage` 锚点。

**与正文提示词的关系**：若采用本附录数据，请优先使用上文 **「（可选）与 docs/canvas-exported-coords 配套开发」** 中的 **第 0～2 步（配套版）提示词**，再衔接第 3～7 步通用提示词；或将配套版中的约束 **粘贴进对应步骤提示词末尾** 作为补充。
