# 从本仓库导出的地图坐标（供纯 Canvas / 前端对齐用）

## 数据来源

- **TMX**：`assets/resources/GamePlay/Theme/Theme1/BG{n}/Level{n}.tmx`
- **计算方式**与 `assets/Scripts/gamePlay.ts` 中 `initRoads()`、`initStartPoint()`、`initEndPoint()` 一致：
  - **路径点（怪物行走）**：对象层 `road` 中的每个 object，按 **`id` 升序**排序后，对每个点的左上角坐标 `(object.x, object.y)` 做：

    ```text
    centerX = object.x + tilewidth / 2
    centerY = object.y + tileheight / 2
    ```

    其中 `tilewidth`、`tileheight` 来自 TMX 的 `<map tilewidth="70" tileheight="70">`。

  - **起点 / 萝卜 UI 节点**（仅当你要在 Canvas 里对齐 Cocos 场景里「起点」「萝卜」图标位置时）：对象层 `start_end` 内 **前两个 object** 依次为起点、终点，公式为：

    ```text
    posX = object.x + tilewidth / 2 + groupOffsetX   // 本仓库 TMX 中一般为 0
    posY = object.y + tileheight / 2 + groupOffsetY + 20
    ```

    `+20` 与脚本中对 `Canvas/map/start`、`Canvas/map/carrot` 的调整一致。**怪物出生位置仍以 `road` 路径第一点为准**，通常与起点标记相差约 20 像素的 y（见 JSON 内说明）。

## 文件说明

| 文件 | 内容 |
|------|------|
| `theme1-paths.json` | Theme1 下 Level 1～3 的路径中心点、`start_end` 换算结果、地图像素尺寸 |

在你的 HTML Canvas 里可直接 `fetch('theme1-paths.json')` 或复制数组使用；_sprite 对齐时用 `roadPath` 中的点作为逻辑位置（中心对齐 `drawImage`）。

## 更新方式

若你改了 TMX，可用编辑器导出坐标，或在本仓库用同一公式重新生成 JSON。其他 Theme 需解析对应目录下的 `Level*.tmx`。

---

## 与「从零搭建 Canvas 塔防」教程的关系

- **不会推翻前面的步骤**：第 0～7 步仍然是「先做出能跑的占位符版本」。
- **JSON 只是在第 2、3 步里替换「路径数据来源」**：原先手写 `[{x,y}, …]`，可改成 **加载 `theme1-paths.json` 里某一关的 `roadPath`**（或复制粘贴数组）。怪物移动、塔检测、子弹逻辑不变。
- **若你不打算对齐本仓库地图**：可以完全不用这些坐标，继续用自己编的数组，搭建过程不受影响。

---

## 需要做哪些关联改动（用了本坐标之后）

所有参与「位置」的系统必须用 **同一套逻辑坐标系**，否则会错位：

| 模块 | 关联说明 |
|------|----------|
| **画布逻辑尺寸** | 建议先定：要么 **910×490**（与 JSON / TMX 地图 1:1），要么下面统一缩放。 |
| **路径 / 怪物** | 使用 `roadPath` 中的 `x,y`（或缩放后的值）。 |
| **背景图** | 若使用 `1.png` / `2.png` 等整张 **910×490** 背景，应与坐标 **同一缩放**，同一原点（左上）。 |
| **建塔格子** | 若格子仍按 70×70 _TILE 划分，格子中心要与缩放后的地图一致；点击映射（教程第 1 步）要把屏幕坐标转换到 **同一逻辑空间**。 |
| **塔射程、子弹碰撞** | 距离阈值若按像素写死（如 140），缩放地图后通常要对 **射程×scale**，否则会相对变小或变大。 |
| **起点 / 萝卜装饰** | 仅当你贴 UI 图标时用 `startEndMarkers`；玩法仍以 `roadPath` 首尾为准即可。 |

---

## 等比例缩放（可以）

这些坐标本质是 **地图像素坐标**，可以整体缩放，只要 **所有东西用同一比例**：

- 地图逻辑宽 `W0 = 910`，高 `H0 = 490`（见 JSON `coordinateSystem.mapPixelSize`）。
- 你希望画布逻辑尺寸为 `canvasW × canvasH`，且 **保持纵横比、不变形**，常用两种做法：

**做法 A：统一比例（推荐）**

```text
scale = min(canvasW / W0, canvasH / H0)
```

显示时（或存入变量时）对每个点：

```text
x' = x * scale
y' = y * scale
```

背景图、路径点、塔位置都用 **同一 `scale`**；画布四周可留黑边（letterbox）。

**做法 B：铺满画布（非等比例）**

分别 `sx = canvasW/W0`、`sy = canvasH/H0`，则 `x' = x * sx`、`y' = y * sy`。路的几何形状会 **略微拉伸**，一般不推荐 unless 你刻意要铺满。

**注意**：玩法逻辑（射程、速度）全部放在 **未缩放的地图坐标系**（910×490）里计算最省事；绘制前只做一层「相机」变换，就不必把每个常量再乘 `scale`。

---

## 自适应铺满浏览器（一边贴齐窗口宽或高）

目标：**在不变形的前提下**，让整块地图尽量大——宽度或高度之一 **铺满可视区域**，另一侧留白（黑边 / 背景色）。这正是：

```text
scale = min(viewportWidth / W0, viewportHeight / H0)
```

- `viewportWidth / viewportHeight`：画布 **在页面上实际占用的 CSS 像素宽高**（通常为窗口客户区或 `#game` 容器）。
- `W0 = 910`，`H0 = 490`。  
  `scale` 取较小值 ⇒ 地图完整落在视口内；**总有一条边贴齐窗口对应边**，另一条边方向居中留白。

**绘制顺序（推荐：逻辑坐标不改，只叠加变换）**

1. 把 canvas 的 **CSS 尺寸**设成占满父级或 `100vw × 100vh`（注意别被全局 margin 顶出滚动条，可给 `body { margin:0; overflow:hidden; }`）。
2. 每帧或 `resize` 时根据 **canvas 的 `clientWidth` / `clientHeight`** 计算：

   ```text
   scale  = min(clientWidth / 910, clientHeight / 490)
   offsetX = (clientWidth  - 910 * scale) / 2
   offsetY = (clientHeight - 490 * scale) / 2
   ```

3. 绘制时：

   ```text
   ctx.setTransform(1, 0, 0, 1, 0, 0)   // 先清单位矩阵
   ctx.clearRect(0, 0, clientWidth, clientHeight)
   ctx.fillRect(0, 0, clientWidth, clientHeight)  // 可选：整页底色（黑边颜色）

   ctx.translate(offsetX, offsetY)
   ctx.scale(scale, scale)

   // 以下全部仍在「地图逻辑坐标」910×490 内绘制（roadPath、塔、子弹……）
   ```

4. **鼠标 / 触摸** 从屏幕回到地图坐标（用于建塔、调试）：

   ```text
   取指针相对于 canvas 左上角的 CSS 像素 (px, py)

   gameX = (px - offsetX) / scale
   gameY = (py - offsetY) / scale
   ```

   再判断 `gameX/gameY` 是否在 `[0,910]×[0,490]` 内（可加少量容错）。

**高清屏**：若希望边缘更清晰，可把 `canvas.width = clientWidth * devicePixelRatio`，`canvas.height = clientHeight * devicePixelRatio`，并在最开始 `ctx.scale(dpr, dpr)`，后面的 `offsetX/Y` 与 `scale` 仍按 **CSS 像素**算即可。

**与 JSON 的关系**：`theme1-paths.json` 里的 `roadPath` **无需改写**；始终在 910×490 逻辑空间里使用，由上面的 **`translate + scale`** 负责铺满浏览器。

---

## 小结

- **不影响**「必须先完成 0～7 步」的顺序；JSON **可选**，用于省去手写路径、并与本仓库地图对齐。
- **要做关联**：路径、背景、点击、射程/速度在 **同一逻辑坐标系**；自适应时只做一层 **offset + scale** 变换。
- **等比例铺满**：`scale = min(视口宽/910, 视口高/490)`，一侧贴齐窗口、另一侧居中留白；指针用逆变换回到地图坐标。
