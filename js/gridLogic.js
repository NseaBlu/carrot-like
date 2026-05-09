/**
 * 与 docs/canvas-exported-coords/README.md 一致：TMX tile 70×70，地图逻辑 910×490。
 * 可建塔格判定（简化）：以格子中心到路径折线（顶点依次连线）的最短距离判定；
 * 距离 ≤ roadHalfWidth（默认半格 35）视为「路径占用」，不可建塔；其余空白格可建塔。
 */

export const TILE = 70;
export const LOGICAL_W = 910;
export const LOGICAL_H = 490;

export const COLS = LOGICAL_W / TILE;
export const ROWS = LOGICAL_H / TILE;

function hypot(dx, dy) {
  return Math.sqrt(dx * dx + dy * dy);
}

/** 点 (px,py) 到线段 (x1,y1)-(x2,y2) 的最短距离 */
export function distancePointToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const nx = x1 + t * dx;
  const ny = y1 + t * dy;
  return hypot(px - nx, py - ny);
}

/** roadPath: [{x,y}, ...] — 与 JSON roadPath 一致 */
export function minDistanceToPolyline(px, py, roadPath) {
  if (!roadPath || roadPath.length === 0) return Infinity;
  let min = Infinity;
  for (let i = 0; i < roadPath.length - 1; i++) {
    const a = roadPath[i];
    const b = roadPath[i + 1];
    const d = distancePointToSegment(px, py, a.x, a.y, b.x, b.y);
    if (d < min) min = d;
  }
  return min;
}

/**
 * @param roadPath {x,y}[]
 * @param roadHalfWidth 路径中心线左右「占用」半宽，默认 TILE/2（与单格道路宽度简化一致）
 * @returns {{ cols: number, rows: number, tile: number, buildable: boolean[][] }}
 */
export function computeBuildableGrid(roadPath, roadHalfWidth = TILE / 2) {
  const buildable = [];
  for (let r = 0; r < ROWS; r++) {
    const row = [];
    for (let c = 0; c < COLS; c++) {
      const cx = c * TILE + TILE / 2;
      const cy = r * TILE + TILE / 2;
      const d = minDistanceToPolyline(cx, cy, roadPath);
      row.push(d > roadHalfWidth);
    }
    buildable.push(row);
  }
  return {
    cols: COLS,
    rows: ROWS,
    tile: TILE,
    buildable,
  };
}
