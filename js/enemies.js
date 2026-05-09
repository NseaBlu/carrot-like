/**
 * 敌人状态：沿路径移动；可被子弹扣 hp；到达终点由 main 扣 lives、记漏怪并移除。
 */

import { positionAtDistance } from "./pathFollow.js";
import {
  ENEMY_MAX_HP,
  ENEMY_MOVE_SPEED,
  ENEMY_TYPE,
} from "./gameBalance.js";

/** 逻辑像素：绘制与命中判定共用半径（类型 N 默认；敌实例可有自身 radius） */
export const ENEMY_RADIUS = 12;

/** @typedef {'N'|'R'|'T'} EnemyTypeId */

/**
 * @typedef {object} Enemy
 * @property {number} distAlongPath
 * @property {number} hp
 * @property {EnemyTypeId} type
 * @property {number} speedPxPerSec
 * @property {number} radius
 */

/**
 * @param {number} [hpMultiplier=1] — 相对 ENEMY_MAX_HP，再乘类型血量系数
 * @param {EnemyTypeId} [typeId='N']
 * @returns {Enemy}
 */
export function spawnEnemy(hpMultiplier = 1, typeId = "N") {
  const def = ENEMY_TYPE[typeId] || ENEMY_TYPE.N;
  const hp = Math.max(
    1,
    Math.round(ENEMY_MAX_HP * hpMultiplier * def.hpMult)
  );
  const speedPxPerSec = ENEMY_MOVE_SPEED * def.speedMult;
  return {
    distAlongPath: 0,
    hp,
    type: typeId in ENEMY_TYPE ? typeId : "N",
    speedPxPerSec,
    radius: def.radius,
  };
}

/**
 * @param {Enemy} enemy
 * @param {ReturnType<import('./pathFollow.js').buildPathMetrics>} metrics
 * @returns {boolean} 是否已到达终点（含超出）
 */
export function updateEnemyAlongPath(enemy, metrics, dt) {
  if (!metrics || metrics.totalLen <= 0) return false;
  const speed = enemy.speedPxPerSec ?? ENEMY_MOVE_SPEED;
  enemy.distAlongPath += speed * dt;
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
