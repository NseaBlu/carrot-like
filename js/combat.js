/**
 * 塔防战斗：索敌、发射、子弹更新、受伤。
 */

import { getEnemyPosition, ENEMY_RADIUS } from "./enemies.js";
import {
  TOWER_FIRE_INTERVAL_MS,
  BULLET_SPEED,
  BULLET_DAMAGE,
  BULLET_RADIUS,
  GOLD_PER_KILL,
  getTowerStatsForLevel,
} from "./gameBalance.js";

/** 基准命中距离（类型 N 半径）；实际判定见 updateBullets 内每敌人 radius */
export const BULLET_HIT_DIST = ENEMY_RADIUS + BULLET_RADIUS + 2;

export {
  TOWER_FIRE_INTERVAL_MS,
  BULLET_SPEED,
  BULLET_DAMAGE,
  BULLET_RADIUS,
  GOLD_PER_KILL,
};

/**
 * @param pathMetrics buildPathMetrics 返回值（非 null）
 * @returns {{ enemy: object, index: number } | null}
 */
export function findNearestEnemyInRange(towerX, towerY, range, enemies, pathMetrics) {
  if (!pathMetrics || !enemies.length) return null;
  let bestIdx = -1;
  let bestD = Infinity;
  for (let i = 0; i < enemies.length; i++) {
    const p = getEnemyPosition(enemies[i], pathMetrics);
    const d = Math.hypot(p.x - towerX, p.y - towerY);
    if (d <= range && d < bestD) {
      bestD = d;
      bestIdx = i;
    }
  }
  if (bestIdx < 0) return null;
  return { enemy: enemies[bestIdx], index: bestIdx };
}

/**
 * @returns {{ x: number, y: number, target: object, damage: number, towerLevel: number, spawnAt: number }}
 */
export function spawnBullet(fromX, fromY, targetEnemy, damage, towerLevel, spawnAt) {
  return {
    x: fromX,
    y: fromY,
    target: targetEnemy,
    damage,
    towerLevel: towerLevel ?? 1,
    spawnAt: spawnAt ?? 0,
  };
}

/**
 * @param {object} enemy
 * @param {number} amount
 * @returns {number} 剩余 hp（可 ≤0）
 */
export function enemyTakeDamage(enemy, amount) {
  enemy.hp -= amount;
  return enemy.hp;
}

/**
 * @param {Array<{ x: number, y: number, target: object, damage: number }>} bullets
 * @param {number} dt 秒
 * @param {object[]} enemies — 与 main 中共用同一数组（原地 splice）
 * @param pathMetrics 路径度量（非 null）
 * @param {{ onGoldReward?: (n: number) => void }} hooks
 */
/**
 * 每座塔独立计时：到点则在射程内索敌，有目标则 spawnBullet。
 * @param {Array<{ col: number, row: number, level?: number, nextFireAt: number }>} towers
 */
/**
 * 根据射程内最近敌人更新每座塔的瞄准角（弧度，0 为向右）；无目标则保持上一帧角度。
 * @param {Array<{ col: number, row: number, level?: number, aimAngle?: number }>} towers
 */
export function updateTowerAiming(towers, tile, enemies, pathMetrics) {
  if (!pathMetrics || towers.length === 0) return;
  for (let ti = 0; ti < towers.length; ti++) {
    const tw = towers[ti];
    const lv = tw.level ?? 1;
    const stats = getTowerStatsForLevel(lv);
    const cx = tw.col * tile + tile / 2;
    const cy = tw.row * tile + tile / 2;
    const found = findNearestEnemyInRange(
      cx,
      cy,
      stats.rangePx,
      enemies,
      pathMetrics
    );
    if (found) {
      const ep = getEnemyPosition(found.enemy, pathMetrics);
      tw.aimAngle = Math.atan2(ep.y - cy, ep.x - cx);
    }
  }
}

export function runTowerFiring(towers, tile, enemies, pathMetrics, now, bullets) {
  if (!pathMetrics) return;
  for (let ti = 0; ti < towers.length; ti++) {
    const tw = towers[ti];
    const lv = tw.level ?? 1;
    const stats = getTowerStatsForLevel(lv);
    if (now < tw.nextFireAt) continue;
    const cx = tw.col * tile + tile / 2;
    const cy = tw.row * tile + tile / 2;
    const found = findNearestEnemyInRange(
      cx,
      cy,
      stats.rangePx,
      enemies,
      pathMetrics
    );
    if (!found) continue;
    tw.nextFireAt = now + stats.fireIntervalMs;
    bullets.push(
      spawnBullet(cx, cy, found.enemy, stats.damage, lv, now)
    );
  }
}

export function updateBullets(bullets, dt, enemies, pathMetrics, hooks) {
  const onGoldReward = hooks && hooks.onGoldReward;
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    const idx = enemies.indexOf(b.target);
    if (idx === -1) {
      bullets.splice(i, 1);
      continue;
    }
    const tp = getEnemyPosition(b.target, pathMetrics);
    let dx = tp.x - b.x;
    let dy = tp.y - b.y;
    let dist = Math.hypot(dx, dy);
    const hitDist =
      (b.target.radius ?? ENEMY_RADIUS) + BULLET_RADIUS + 2;
    if (dist <= hitDist) {
      const hpAfter = enemyTakeDamage(b.target, b.damage);
      bullets.splice(i, 1);
      const onExplosionFx = hooks && hooks.onExplosionFx;
      if (onExplosionFx) {
        if (hpAfter <= 0) {
          onExplosionFx(tp.x, tp.y, true);
        } else {
          onExplosionFx(tp.x, tp.y, false, b.target);
        }
      }
      if (hpAfter <= 0) {
        enemies.splice(idx, 1);
        if (onGoldReward) onGoldReward(GOLD_PER_KILL);
      }
      continue;
    }
    if (dist <= 0) continue;
    const step = Math.min(BULLET_SPEED * dt, dist);
    b.x += (dx / dist) * step;
    b.y += (dy / dist) * step;
  }
}
