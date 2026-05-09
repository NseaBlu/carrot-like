/**
 * 塔格子工具。造价与射程见 gameBalance.js。
 */

export { towerCost, towerRange } from "./gameBalance.js";

/**
 * 逻辑坐标 → 格子索引（与 70×70 网格对齐）
 * @param {number} gameX
 * @param {number} gameY
 * @param {number} tile
 */
export function cellIndexFromGamePoint(gameX, gameY, tile) {
  const c = Math.floor(gameX / tile);
  const r = Math.floor(gameY / tile);
  return { c, r };
}

export function cellCenterLogical(col, row, tile) {
  return {
    x: col * tile + tile / 2,
    y: row * tile + tile / 2,
  };
}
