/**
 * 终点保卫萝卜贴图帧选择（素材：assets/carrot/hlb1_*.png）。
 * 「较远」：距终点路径剩余长度大于 CARROT_FAR_DIST_PX。
 */

/** 最近的怪距路径终点（沿路径剩余长度）大于此值视为「较远」 */
export const CARROT_FAR_DIST_PX = 200;

/** 漏怪扣血时播放 hlb1_7/8 交替的时长 */
export const CARROT_LEAK_FLASH_MS = 480;

/**
 * @param {import('./enemies.js').Enemy[]} enemies
 * @param {ReturnType<import('./pathFollow.js').buildPathMetrics> | null} metrics
 */
export function nearestEnemyRemainToEnd(enemies, metrics) {
  if (!metrics || enemies.length === 0) return Infinity;
  let minRem = Infinity;
  for (let i = 0; i < enemies.length; i++) {
    const rem = metrics.totalLen - enemies[i].distAlongPath;
    if (rem < minRem) minRem = rem;
  }
  return minRem;
}

/**
 * @param {{
 *   lives: number,
 *   gamePhase: string,
 *   leakFlashUntil: number,
 *   now: number,
 *   enemies: import('./enemies.js').Enemy[],
 *   metrics: ReturnType<import('./pathFollow.js').buildPathMetrics> | null,
 * }} p
 * @returns {number} hlb1 索引 1～14
 */
export function pickCarrotSpriteId(p) {
  const { lives, gamePhase, leakFlashUntil, now, enemies, metrics } = p;

  if (gamePhase === "lose") {
    const i = Math.floor(now / 480) % 3;
    return [1, 2, 3][i];
  }

  if (now < leakFlashUntil) {
    return Math.floor(now / 110) % 2 === 0 ? 7 : 8;
  }

  const far = nearestEnemyRemainToEnd(enemies, metrics) > CARROT_FAR_DIST_PX;
  const slowMs = far ? 520 : 260;
  const phase = Math.floor(now / slowMs) % 2;
  const L = lives;

  if (L >= 15 && L <= 20) return phase === 0 ? 13 : 14;
  if (L >= 10 && L <= 14) return phase === 0 ? 11 : 12;
  if (L >= 5 && L <= 9) return phase === 0 ? 9 : 10;
  if (L >= 1 && L <= 4) return phase === 0 ? 7 : 8;
  return 14;
}
