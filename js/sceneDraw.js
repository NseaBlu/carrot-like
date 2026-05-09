/**
 * 场景绘制：路径折线、顶点、可建塔格、敌人描画。不含资源加载（见 pathData.js）与布局变换（见 main.js）。
 */

import { getEnemyPosition, ENEMY_RADIUS } from "./enemies.js";
import { BULLET_RADIUS } from "./combat.js";
import { TILE } from "./gridLogic.js";

/**
 * 终点萝卜（脚底对齐 xy，素材未加载时跳过）。
 * @param {CanvasRenderingContext2D} ctx
 * @param {HTMLImageElement | undefined} img
 * @param {number} cx
 * @param {number} cy — 锚点为脚底中心
 */
export function drawDefenseCarrot(ctx, img, cx, cy) {
  if (!img || !img.complete || img.naturalWidth <= 0) return;
  const maxH = TILE * 2.2;
  const nh = img.naturalHeight;
  const nw = img.naturalWidth;
  const sc = Math.min(1, maxH / nh);
  const w = nw * sc;
  const h = nh * sc;
  ctx.drawImage(img, cx - w / 2, cy - h, w, h);
}

/**
 * @param {CanvasRenderingContext2D} ctx — 已处于地图逻辑坐标（translate+scale 之后）
 * @param {{ cols: number, rows: number, tile: number, buildable: boolean[][] }} grid
 * @param {number} scale — 当前视图 scale，用于线宽换算
 */
export function drawBuildableTowerCells(ctx, grid, scale) {
  const { cols, rows, tile, buildable } = grid;
  const lw = 1.2 / scale;
  ctx.lineWidth = lw;
  ctx.strokeStyle = "rgba(200, 220, 255, 0.35)";
  ctx.fillStyle = "rgba(120, 160, 255, 0.08)";
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!buildable[r][c]) continue;
      const x = c * tile;
      const y = r * tile;
      ctx.fillRect(x, y, tile, tile);
      ctx.strokeRect(x + lw * 0.5, y + lw * 0.5, tile - lw, tile - lw);
    }
  }
}

/**
 * 沿 roadPath 折线平铺冰格贴图，缩放为 TILE×TILE（与地图格一致）。
 * @param {HTMLImageElement} pathTileImg
 */
export function drawPathIceTiles(ctx, roadPath, pathTileImg) {
  if (!roadPath || roadPath.length < 2 || !pathTileImg || !pathTileImg.complete || pathTileImg.naturalWidth <= 0) {
    return;
  }
  const ts = TILE;
  for (let i = 0; i < roadPath.length - 1; i++) {
    const ax = roadPath[i].x;
    const ay = roadPath[i].y;
    const bx = roadPath[i + 1].x;
    const by = roadPath[i + 1].y;
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy);
    if (len < 0.001) continue;
    const ux = dx / len;
    const uy = dy / len;
    const angle = Math.atan2(dy, dx);
    let traveled = 0;
    while (traveled < len - 1e-6) {
      const piece = Math.min(ts, len - traveled);
      const cx = ax + ux * (traveled + piece / 2);
      const cy = ay + uy * (traveled + piece / 2);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);
      ctx.drawImage(pathTileImg, -piece / 2, -ts / 2, piece, ts);
      ctx.restore();
      traveled += piece;
    }
  }
  for (let i = 1; i < roadPath.length - 1; i++) {
    const px = roadPath[i].x;
    const py = roadPath[i].y;
    ctx.drawImage(pathTileImg, px - ts / 2, py - ts / 2, ts, ts);
  }
}

/**
 * @param {{ x: number, y: number }[]} roadPath
 */
export function drawRoadPolyline(ctx, roadPath, scale) {
  if (!roadPath || roadPath.length === 0) return;
  ctx.strokeStyle = "rgba(255, 200, 80, 0.95)";
  ctx.lineWidth = 5 / scale;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(roadPath[0].x, roadPath[0].y);
  for (let i = 1; i < roadPath.length; i++) {
    ctx.lineTo(roadPath[i].x, roadPath[i].y);
  }
  ctx.stroke();
}

const VERTEX_R = 6;

export function drawPathVertices(ctx, roadPath, scale) {
  if (!roadPath || roadPath.length === 0) return;
  ctx.fillStyle = "rgba(255, 120, 60, 0.95)";
  ctx.strokeStyle = "rgba(40, 20, 0, 0.6)";
  ctx.lineWidth = 1.5 / scale;
  for (let i = 0; i < roadPath.length; i++) {
    const p = roadPath[i];
    ctx.beginPath();
    ctx.arc(p.x, p.y, VERTEX_R, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}

/**
 * @param {Array<{ col: number, row: number }>} towers
 * @param {(t: object) => number} getRangePx
 * @param {number} [selectedIndex] — 选中塔高亮射程；-1 表示无
 */
export function drawTowerRanges(ctx, towers, tile, getRangePx, scale, selectedIndex) {
  if (towers.length === 0) return;
  const lw = 2.25 / scale;
  for (let i = 0; i < towers.length; i++) {
    const t = towers[i];
    const rangePx = getRangePx(t);
    const cx = t.col * tile + tile / 2;
    const cy = t.row * tile + tile / 2;
    const sel = selectedIndex === i;
    ctx.save();
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(cx, cy, rangePx, 0, Math.PI * 2, false);
    ctx.setLineDash([]);
    ctx.strokeStyle = sel ? "rgba(255, 200, 80, 0.95)" : "rgba(12, 35, 55, 0.88)";
    ctx.lineWidth = lw + 3 / scale;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, rangePx, 0, Math.PI * 2, false);
    ctx.setLineDash([10 / scale, 7 / scale]);
    ctx.strokeStyle = sel
      ? "rgba(255, 248, 200, 0.98)"
      : "rgba(175, 248, 255, 0.98)";
    ctx.lineWidth = lw;
    ctx.stroke();
    ctx.restore();
  }
}

const TOWER_BOTTLE_ANIM_MS = 260;
const TOWER_UPGRADE_HINT_ALT_MS = 420;
const TOWER_BOTTLE_MAX_DIM = TILE * 0.9;
const TOWER_HINT_ICON_MAX = TILE * 0.4;

/**
 * 塔：BottleXY 贴图（X=等级，Y=1～3 动态帧）；选中且可升级时交替 Bottle00/01。
 * @param {number} [selectedIndex] — -1 表示无选中
 * @param {{ hintUpgrade: HTMLImageElement[], bottle: HTMLImageElement[][] }} towerAssets
 * @param {boolean} [showUpgradeHint] — 金币足够下一档升级时显示花费提示图
 */
export function drawTowers(
  ctx,
  towers,
  tile,
  scale,
  selectedIndex,
  towerAssets,
  now,
  showUpgradeHint
) {
  ctx.lineJoin = "round";
  const hintUp = towerAssets && towerAssets.hintUpgrade;
  const bottleM = towerAssets && towerAssets.bottle;

  for (let i = 0; i < towers.length; i++) {
    const t = towers[i];
    const cx = t.col * tile + tile / 2;
    const cy = t.row * tile + tile / 2;
    const sel = selectedIndex === i;
    const lv = Math.min(Math.max(t.level ?? 1, 1), 3);
    const anim =
      (Math.floor(now / TOWER_BOTTLE_ANIM_MS) + t.col + t.row) % 3;
    const state = anim + 1;
    const img =
      bottleM && bottleM[lv] && bottleM[lv][state]
        ? bottleM[lv][state]
        : null;

    if (sel) {
      ctx.strokeStyle = "rgba(255, 210, 90, 0.98)";
      ctx.lineWidth = 3.5 / scale;
      ctx.strokeRect(
        t.col * tile + 1.5 / scale,
        t.row * tile + 1.5 / scale,
        tile - 3 / scale,
        tile - 3 / scale
      );
    }

    if (img && img.complete && img.naturalWidth > 0) {
      const nw = img.naturalWidth;
      const nh = img.naturalHeight;
      const sc = Math.min(TOWER_BOTTLE_MAX_DIM / nw, TOWER_BOTTLE_MAX_DIM / nh);
      const w = nw * sc;
      const h = nh * sc;
      const ang = t.aimAngle ?? 0;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(ang);
      ctx.drawImage(img, -w / 2, -h / 2, w, h);
      ctx.restore();
    } else {
      const triR = tile * 0.26;
      const ang = t.aimAngle ?? 0;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(ang);
      ctx.fillStyle = sel
        ? "rgba(110, 165, 245, 0.96)"
        : "rgba(85, 130, 215, 0.95)";
      ctx.strokeStyle = sel
        ? "rgba(255, 230, 160, 0.95)"
        : "rgba(25, 45, 95, 0.92)";
      ctx.lineWidth = 2 / scale;
      ctx.beginPath();
      ctx.moveTo(0, -triR * 1.35);
      ctx.lineTo(-triR, triR * 0.85);
      ctx.lineTo(triR, triR * 0.85);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "rgba(255, 255, 255, 0.96)";
      ctx.font = `${Math.max(11, 13)}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillText("Lv." + lv, 0, triR * 1.25);
      ctx.restore();
    }

    if (
      sel &&
      showUpgradeHint &&
      hintUp &&
      hintUp.length >= 2 &&
      hintUp[0].complete &&
      hintUp[0].naturalWidth > 0
    ) {
      const hi =
        Math.floor(now / TOWER_UPGRADE_HINT_ALT_MS) % 2 === 0
          ? hintUp[0]
          : hintUp[1];
      if (hi.complete && hi.naturalWidth > 0) {
        const mw = hi.naturalWidth;
        const mh = hi.naturalHeight;
        const hs = Math.min(
          TOWER_HINT_ICON_MAX / mw,
          TOWER_HINT_ICON_MAX / mh
        );
        const hw = mw * hs;
        const hh = mh * hs;
        const hx = cx + tile * 0.34;
        const hy = cy - tile * 0.52;
        ctx.drawImage(hi, hx - hw / 2, hy - hh / 2, hw, hh);
      }
    }
  }
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
}

/** @type {Record<string, { fill: string, stroke: string }>} */
const ENEMY_STYLE = {
  N: { fill: "rgba(220, 90, 130, 0.94)", stroke: "rgba(70, 15, 40, 0.88)" },
  R: { fill: "rgba(255, 200, 90, 0.95)", stroke: "rgba(120, 70, 10, 0.9)" },
  T: { fill: "rgba(110, 85, 200, 0.94)", stroke: "rgba(40, 25, 90, 0.9)" },
};

/** 沿路径每前进多少逻辑像素换一帧 walk */
const ENEMY_WALK_PHASE_PX = 42;
/** 贴图最大边长：相对碰撞半径；并与 TILE 取较大值，避免 R 类半径小仍显得过矮 */
const ENEMY_SPRITE_SCALE_R = 4.35;
const ENEMY_SPRITE_MIN_MAX_DIM = TILE * 0.82;

/**
 * @param {Array<{ distAlongPath: number, type?: string, radius?: number }>} enemies
 * @param {Record<string, HTMLImageElement[]> | null | undefined} monsterFrames — N/R/T 各 3 张；缺省或未完成加载时用圆形回退
 */
export function drawEnemies(ctx, enemies, metrics, scale, monsterFrames) {
  if (!metrics || enemies.length === 0) return;
  ctx.lineWidth = 2 / scale;
  ctx.lineJoin = "round";
  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i];
    const p = getEnemyPosition(e, metrics);
    const r = e.radius ?? ENEMY_RADIUS;
    const typ = e.type && monsterFrames && monsterFrames[e.type] ? e.type : "N";
    const frames =
      monsterFrames && monsterFrames[typ] && monsterFrames[typ].length
        ? monsterFrames[typ]
        : null;
    let fi = Math.floor(e.distAlongPath / ENEMY_WALK_PHASE_PX) % 3;
    if (frames && frames.length) fi = fi % frames.length;
    const img = frames ? frames[fi] : null;

    if (img && img.complete && img.naturalWidth > 0) {
      const nw = img.naturalWidth;
      const nh = img.naturalHeight;
      const maxDim = Math.max(r * ENEMY_SPRITE_SCALE_R, ENEMY_SPRITE_MIN_MAX_DIM);
      const sc = Math.min(maxDim / nw, maxDim / nh);
      const w = nw * sc;
      const h = nh * sc;
      ctx.drawImage(img, p.x - w / 2, p.y - h / 2, w, h);
    } else {
      const style = ENEMY_STYLE[e.type] || ENEMY_STYLE.N;
      ctx.fillStyle = style.fill;
      ctx.strokeStyle = style.stroke;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }
}

/**
 * 击中/击杀爆炸（PBottle01 小、PBottle02 大）。
 * 未击杀时可带 followEnemy，每帧跟随怪中心；击杀用固定 x,y（怪已移除）。
 * @param {ReturnType<import('./pathFollow.js').buildPathMetrics> | null} pathMetrics
 */
export function drawExplosionEffects(
  ctx,
  effects,
  imgSmall,
  imgLarge,
  pathMetrics
) {
  if (!effects || effects.length === 0) return;
  const maxHit = TILE * 0.55;
  const maxKill = TILE * 0.95;
  for (let i = 0; i < effects.length; i++) {
    const e = effects[i];
    const img = e.kill ? imgLarge : imgSmall;
    if (!img || !img.complete || img.naturalWidth <= 0) continue;
    let px = e.x;
    let py = e.y;
    if (e.followEnemy && pathMetrics) {
      const ep = getEnemyPosition(e.followEnemy, pathMetrics);
      px = ep.x;
      py = ep.y;
    }
    const maxDim = e.kill ? maxKill : maxHit;
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    const sc = Math.min(maxDim / nw, maxDim / nh);
    const w = nw * sc;
    const h = nh * sc;
    ctx.drawImage(img, px - w / 2, py - h / 2, w, h);
  }
}

const BULLET_SPRITE_MAX_DIM = TILE * 0.38;
const BULLET_SPRITE_ANIM_MS = 95;

/** @param {ReturnType<import('./pathFollow.js').buildPathMetrics> | null} pathMetrics — 用于子弹朝向目标旋转 */
export function drawBullets(ctx, bullets, scale, bulletMatrix, now, pathMetrics) {
  if (bullets.length === 0) return;
  for (let i = 0; i < bullets.length; i++) {
    const b = bullets[i];
    const lv = Math.min(Math.max(b.towerLevel ?? 1, 1), 3);
    const t0 = b.spawnAt ?? 0;
    const age = Math.max(0, now - t0);
    const st = (Math.floor(age / BULLET_SPRITE_ANIM_MS) % 3) + 1;
    const img =
      bulletMatrix && bulletMatrix[lv] && bulletMatrix[lv][st]
        ? bulletMatrix[lv][st]
        : null;

    let flyAngle = 0;
    if (pathMetrics && b.target) {
      const tp = getEnemyPosition(b.target, pathMetrics);
      flyAngle = Math.atan2(tp.y - b.y, tp.x - b.x);
    }

    if (img && img.complete && img.naturalWidth > 0) {
      const nw = img.naturalWidth;
      const nh = img.naturalHeight;
      const sc = Math.min(BULLET_SPRITE_MAX_DIM / nw, BULLET_SPRITE_MAX_DIM / nh);
      const w = nw * sc;
      const h = nh * sc;
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(flyAngle);
      ctx.drawImage(img, -w / 2, -h / 2, w, h);
      ctx.restore();
    } else {
      ctx.fillStyle = "rgba(255, 230, 120, 0.95)";
      ctx.strokeStyle = "rgba(120, 70, 0, 0.85)";
      ctx.lineWidth = 1.25 / scale;
      ctx.beginPath();
      ctx.arc(b.x, b.y, BULLET_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }
}
