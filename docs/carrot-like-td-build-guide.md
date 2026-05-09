# 保卫萝卜式 Canvas 塔防 — 搭建路线图与 Cursor 提示词汇编

本文档根据多轮对话与工程实践整理：**如何用纯 HTML + Canvas + JS，从零搭出玩法上接近「保卫萝卜」的学习 Demo**（路径行进、空地建塔、波次、生命/萝卜、多种怪物与美术接入）。玩法类比学习即可；**美术请使用自制或明确授权的素材**，勿使用正版游戏拆包资源。

更通用的「第 0～7 步」原文仍保留在：**`canvas-tower-defense-cursor-prompts.md`**。本文在其基础上补充**与本仓库 JSON / 会话扩展一致的提示词**，并给出推荐顺序。

---

## 1. 聊天记录映射出的搭建顺序（鸟瞰）

| 顺序 | 主题 | 依赖 | 典型产出文件 |
|------|------|------|----------------|
| 1 | 逻辑坐标 910×490 + 全屏等比 + DPR | 无 | `index.html`、`main.js`（变换与清屏） |
| 2 | 指针 → 逻辑坐标 + 点击验证 | 1 | `main.js`（逆变换） |
| 3 | 加载 `theme1-paths.json` + 画路 + 可建塔格 | 2 | `pathData.js`、`towerGrid.js`、`scene.js` |
| 4 | 弧长路径 + 敌人沿路移动 + 漏怪扣生命 | 3 | `pathFollow.js`、`main.js` |
| 5 | 点击放塔、占地、射程（可先不扣钱） | 4 | `towerConfig.js`、`scene.js`、`main.js` |
| 6 | 塔开火、子弹、命中扣血、击杀加钱 | 5 | `combat.js` |
| 7 | 金币、放塔扣款、多波配置 | 6 | `waveConfig.js`、`main.js` |
| 8 | HUD、胜负、重开（R / 按钮） | 7 | `scene.js`、`gameConstants.js`、`index.html` |
| 9 | （可选）多种怪物、`spawnMix` | 7 | `enemyTypes.js`、`waveConfig.js` |
| 10 | （可选）终点「萝卜」表现层 | 8 | `assets.js`、`scene.js` |
| 11 | （可选）PNG 序列帧敌人 / 背景 / 路面贴图 | 8 | `assets.js`、`scene.js` |
| 12 | （可选）第一种塔「瓶子」：`Bottle` / `PBottle` 矩阵 | 11 | `assets.js` `loadTowerBottlePack`、`towerConfig.js` |
| 13 | （可选）爆炸：`PBottle01` 受击、`PBottle02` 击杀 | 12 | `explosionFx.js`、`combat.js`、`assets.js` |
| 14 | 工程健壮性：boot 不阻塞、路径去重、全局变量声明 | 全程 | `main.js`、`pathFollow.js` |

---

## 2. 每条提示词末尾可粘贴的「通用约束」

（与 `canvas-tower-defense-cursor-prompts.md` 一致。）

- 只用**原生 Canvas 2D**（`getContext('2d')`），不要用 React / Vue / Vite / TypeScript / 游戏引擎。
- 使用 `type="module"` 时说明需**本地静态服务**（如 `npx serve .`、`python -m http.server`），避免 `file://` 下模块与 `fetch` 失败。

---

## 3. 第一阶段：画布 + 坐标（配套 Theme1 / 910×490）

**适用**：希望与 `docs/canvas-exported-coords/theme1-paths.json` 对齐。

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

## 4. 第二阶段：指针映射（配套）

```
在已有「逻辑 910×490 + translate + scale 铺满窗口」的 Canvas 项目上，请实现指针坐标转换：

- 鼠标/触摸相对于 canvas 左上角的坐标，先减去 offsetX、offsetY，再除以 scale，得到地图逻辑坐标 (gameX, gameY)。
- 在点击处在逻辑坐标系画叉验证（注意变换栈顺序与 devicePixelRatio 若存在需一致）。

仍不要用图片，只用几何图形测试。

实现方式请与 docs/canvas-exported-coords/README.md 中「自适应铺满浏览器」一节一致。
```

---

## 5. 第三阶段：路径 JSON + 路面 + 建塔格（配套）

```
继续纯 Canvas + JS。对接本仓库导出的路径数据：

1. 在运行时 fetch 同目录或指定路径下的 theme1-paths.json（若不能 fetch，请说明改为把 JSON 内嵌为 JS 常量）。
2. 使用 levels[0].roadPath（或指定 level）作为路径折线顶点；逻辑坐标仍为 910×490。
3. 绘制路径折线与顶点；用 70×70 为边长（或与 README 一致）在空白区域标出可建塔格（需说明格子与 road 的判定规则，可简化）。

路径数据单独模块或常量文件，与 Scene 绘制分离。

不要实现敌人移动。验收：更换 JSON 中关卡索引路径形状随之变化。
```

---

## 6. 第四阶段：核心玩法链（原「第 3～7 步」）

以下五段在 **`canvas-tower-defense-cursor-prompts.md`** 中已有完整原文，建议**按顺序**依次交给 Cursor（此处为摘录标题，复制时请打开该文档对应章节以免遗漏细节）。

| 步 | 标题 | 要点 |
|----|------|------|
| 3 | 敌人沿路径移动 | `buildPathMetrics` / 弧长、`getPositionAtDistance`、漏怪 |
| 4 | 点击放塔 + 占地 + 射程圈 | 格子命中、`?level=`、不可叠塔 |
| 5 | 塔攻击 + 子弹 + 扣血 | `findNearestEnemyInRange`、`spawnBullet`、`updateBullets`、`enemyTakeDamage` |
| 6 | 金币 + 放塔消耗 + 波次 | `gold`、`WAVES`、`beginWave` |
| 7 | 文字 UI + 胜负 + 重开 | `PHASE`、DOM 或纯 Canvas HUD、`#btn-restart`、按键 R |

**若不走 Theme1 配套**，也可用同文档中的 **「通用版」第 0～2 步**（手写分辨率与路径数组），再接上表第 3～7 步。

---

## 7. 第五阶段（扩展）：多种怪物与混编波次

在已有 `WAVES` 与敌人 `{ dist, hp }` 的前提下扩展：

```
塔防项目已有波次与敌人沿路移动。请增加多种怪物类型（例如 normal / swift / bulky），每种有 hp 倍率、移速倍率、击杀金币；在 waveConfig 里为后期波次配置 spawnMix（概率表并归一化）。生成敌人时写入 typeId 与 rewardGold；击杀加钱用 rewardGold；绘制时用不同颜色或半径区分。保持纯 JS、无框架；改动集中在 enemyTypes.js、waveConfig.js、main.js、combat.js、scene.js。
```

---

## 8. 第六阶段（扩展）：终点「萝卜」表现（玩法仍靠漏怪扣血）

```
在路径终点已有逻辑位置的前提下，增加萝卜装饰：用序列帧 PNG（例如按剩余生命或距离终点的威胁切换帧），或血条式缩放；漏怪时播放闪光或抖动。注意：胜负仍由现有 lives / 敌人是否到达终点判定，萝卜仅为表现层。资源放 assets/，预加载后再绘制。
```

---

## 9. 第七阶段（扩展）：PNG 替换占位图

```
当前塔、怪、子弹用几何图形绘制。我已将 PNG 放在指定目录（请列出你的路径）。请实现预加载，失败则回退几何图形；绘制时用 drawImage 中心对齐路径点，逻辑碰撞不变；用常量统一缩放。不要引入构建工具。
```

（可与 **`canvas-tower-defense-cursor-prompts.md` 附录 A.6** 合并使用。）

---

## 10. 第八阶段（扩展）：第一种塔「速射 / 瓶子」素材规则

会话中采用的命名约定（可按你的美术改常量，但需全局一致）：

- 塔身：`assets/tower-bottle/BottleXY.png`，**X、Y ∈ {1,2,3}** —— X 常对应塔等级，Y 为时间动画帧。
- 子弹：`PBottleXY.png` 同规则。
- 升级费用提示图：`Bottle00.png`、`Bottle01.png`（与 UI 或 hint 对应时再接入）。
- 塔类型 id（如 `rapid`）在 `towerConfig.js` 配置射程、射速、伤害、升级费用数组。

```
请为第一种塔类型（如 rapid）接入 tower-bottle 目录素材：预加载 Bottle11–33 与 PBottle11–33；塔绘制按等级与时间帧选图，默认瓶口朝 +x，用 lastAimRad 旋转对齐瞄准方向；子弹绘制用 PBottle 矩阵帧与 P_BOTTLE_ANIM_MS 切换；spawnBullet 传入 towerLevel、angleRad。加载失败回退色块。另提供 loadTowerBottlePack 不阻塞 boot：关卡/网格初始化必须在路径数据就绪后立即执行，瓶子图后台 Promise 填充。
```

---

## 11. 第九阶段（扩展）：爆炸特效 PBottle01 / PBottle02

约定（与子弹矩阵 Filename 不冲突时）：`PBottle01` = 较小受击爆炸，`PBottle02` = 较大击杀爆炸。

```
在 loadTowerBottlePack 中增加 explosionHit（PBottle01.png）、explosionKill（PBottle02.png）。新建 explosionFx.js：spawnBottleExplosion(x,y,'hit'|'kill')、每帧 update、在敌人逻辑坐标上绘制；命中时在扣血前根据「本次伤害后是否 hp<=0」只播 kill，否则播 hit。绘制层与敌人同一逻辑变换。不要用 PBottle01 兼作其它用途以免语义冲突。
```

---

## 12. 第十阶段（工程可靠性：对话里踩过的坑）

可将下列作为**补充约束**贴在任意一步之后：

```
1）boot：关卡 roadPath / buildPathMetrics / recomputeGrid 必须在 themeData 就绪后立即执行；可选美术包（如 tower-bottle）用 then/catch 异步加载，禁止 await 阻塞导致 grid 永不初始化。2）pathFollow：对 roadPath 做相邻重复点去重，避免 totalLen 为 0。3）任何 drawFrame 引用的异步资源包（如 towerBottlePack）在模块顶层用 let towerBottlePack = null 声明，避免 ReferenceError 跳过整帧。4）tileW/tileH 参与除法时 clamp 最小为 1。5）建议用 Git 或定期备份 js 目录，避免占位文件覆盖完整工程。
```

---

## 13. `index.html` 与入口约定（备忘）

- `<script type="module" src="js/main.js">`；需要 HTTP 服务。
- 常见 DOM：`#game` 画布、`#btn-restart` 绑定重开（与 `gameConstants.js` 中 `KEY_RESTART` 一致）。
- 路径数据默认 `docs/canvas-exported-coords/theme1-paths.json`，可用查询参数 `?paths=`、`?level=` 覆盖。

---

## 14. 文档交叉索引

| 文档 | 内容 |
|------|------|
| `canvas-tower-defense-cursor-prompts.md` | 第 0～7 步完整提示词、附录 A PNG、附录 B 路径 JSON |
| `canvas-exported-coords/README.md` | 坐标公式、`fetch` 与变换顺序 |
| `canvas-exported-coords/theme1-paths.json` | Theme1 三关 `roadPath` / 标记点 |

---

## 15. 小结：最小「保卫萝卜感」闭环

1. 一条路 + 敌人走得完 + 漏怪扣命。  
2. 空地上建塔 + 射程内打人。  
3. 钱与波次。  
4. 命没了输，波次打完且场上干净赢。  
5. 再叠萝卜贴图、多种怪、瓶子塔与爆炸——观感更接近原作，但核心仍是**路径 TD + 经济 + 波次**。

按上表顺序向 Cursor 投喂提示词，每一步验收通过后再进入下一步，工程最稳。
