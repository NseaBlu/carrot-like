/**
 * 敌人状态：沿路径移动；可被子弹扣 hp；到达终点由 main 扣 lives、记漏怪并移除。
 */

import { positionAtDistance } from "./pathFollow.js";
import { ENEMY_MAX_HP } from "./gameBalance.js";

/** 逻辑像素：绘制与命中判定共用半径 */
export const ENEMY_RADIUS = 12;

/** @typedef {{ distAlongPath: number, hp: number }} Enemy */

/**
 * @param {number} [hpMultiplier=1] — 相对 ENEMY_MAX_HP
 * @returns {Enemy}
 */
export function spawnEnemy(hpMultiplier = 1) {
  const hp = Math.max(1, Math.round(ENEMY_MAX_HP * hpMultiplier));
  return { distAlongPath: 0, hp };
}

/**
 * @param {Enemy} enemy
 * @param {ReturnType<import('./pathFollow.js').buildPathMetrics>} metrics
 * @returns {boolean} 是否已到达终点（含超出）
 */
export function updateEnemyAlongPath(enemy, metrics, speedPxPerSec, dt) {
  if (!metrics || metrics.totalLen <= 0) return false;
  enemy.distAlongPath += speedPxPerSec * dt;
  if (enemy.distAlongPath >= metrics.totalLen) {
    enemy.distAlongPath = metrics.totalLen;
    return true;
  }
  return false;
}

/**
 * @param {Enemy} enemy
 * @param {ReturnType<import('./pathFollow.js').buildPathMetrics>} metrics
 */
export function getEnemyPosition(enemy, metrics) {
  if (!metrics) return { x: 0, y: 0 };
  return positionAtDistance(metrics, enemy.distAlongPath);
}
