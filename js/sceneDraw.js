/**
 * 场景绘制：路径折线、顶点、可建塔格、敌人描画。不含资源加载（见 pathData.js）与布局变换（见 main.js）。
 */

import { getEnemyPosition, ENEMY_RADIUS } from "./enemies.js";
import { BULLET_RADIUS } from "./combat.js";
import { TILE } from "./gridLogic.js";

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
 */
export function drawTowerRanges(ctx, towers, tile, rangePx, scale) {
  if (towers.length === 0) return;
  const lw = 2.25 / scale;
  for (let i = 0; i < towers.length; i++) {
    const t = towers[i];
    const cx = t.col * tile + tile / 2;
    const cy = t.row * tile + tile / 2;
    ctx.save();
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(cx, cy, rangePx, 0, Math.PI * 2, false);
    ctx.setLineDash([]);
    ctx.strokeStyle = "rgba(12, 35, 55, 0.88)";
    ctx.lineWidth = lw + 3 / scale;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, rangePx, 0, Math.PI * 2, false);
    ctx.setLineDash([10 / scale, 7 / scale]);
    ctx.strokeStyle = "rgba(175, 248, 255, 0.98)";
    ctx.lineWidth = lw;
    ctx.stroke();
    ctx.restore();
  }
}

/**
 * 塔：三角形（顶点朝上），中心对齐格子中心。
 * @param {Array<{ col: number, row: number }>} towers
 */
export function drawTowers(ctx, towers, tile, scale) {
  const triR = tile * 0.26;
  ctx.fillStyle = "rgba(85, 130, 215, 0.95)";
  ctx.strokeStyle = "rgba(25, 45, 95, 0.92)";
  ctx.lineWidth = 2 / scale;
  ctx.lineJoin = "round";
  for (let i = 0; i < towers.length; i++) {
    const t = towers[i];
    const cx = t.col * tile + tile / 2;
    const cy = t.row * tile + tile / 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy - triR * 1.35);
    ctx.lineTo(cx - triR, cy + triR * 0.85);
    ctx.lineTo(cx + triR, cy + triR * 0.85);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}

/** @param {Array<{ distAlongPath: number }>} enemies */
export function drawEnemies(ctx, enemies, metrics, scale) {
  if (!metrics || enemies.length === 0) return;
  ctx.fillStyle = "rgba(220, 80, 120, 0.92)";
  ctx.strokeStyle = "rgba(60, 10, 30, 0.85)";
  ctx.lineWidth = 2 / scale;
  ctx.lineJoin = "round";
  for (let i = 0; i < enemies.length; i++) {
    const p = getEnemyPosition(enemies[i], metrics);
    ctx.beginPath();
    ctx.arc(p.x, p.y, ENEMY_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}

/** @param {Array<{ x: number, y: number }>} bullets */
export function drawBullets(ctx, bullets, scale) {
  if (bullets.length === 0) return;
  ctx.fillStyle = "rgba(255, 230, 120, 0.95)";
  ctx.strokeStyle = "rgba(120, 70, 0, 0.85)";
  ctx.lineWidth = 1.25 / scale;
  for (let i = 0; i < bullets.length; i++) {
    const b = bullets[i];
    ctx.beginPath();
    ctx.arc(b.x, b.y, BULLET_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}
