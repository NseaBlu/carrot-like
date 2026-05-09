/**
 * 折线路径上的匀速运动：逻辑坐标系内距离累加，按线段长度插值位置。
 */

/**
 * @param {{ x: number, y: number }[]} roadPath
 * @returns {null | { segments: { ax: number, ay: number, bx: number, by: number, len: number }[], cum: number[], totalLen: number }}
 */
export function buildPathMetrics(roadPath) {
  if (!roadPath || roadPath.length < 2) return null;
  const segments = [];
  const cum = [0];
  let totalLen = 0;
  for (let i = 0; i < roadPath.length - 1; i++) {
    const a = roadPath[i];
    const b = roadPath[i + 1];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    segments.push({ ax: a.x, ay: a.y, bx: b.x, by: b.y, len });
    totalLen += len;
    cum.push(totalLen);
  }
  return { segments, cum, totalLen };
}

/**
 * @param {NonNullable<ReturnType<typeof buildPathMetrics>>} metrics
 * @param {number} dist — 沿路径从起点累计的距离（逻辑像素）
 */
export function positionAtDistance(metrics, dist) {
  const { segments, cum, totalLen } = metrics;
  if (segments.length === 0) return { x: 0, y: 0 };
  if (dist <= 0) {
    const s = segments[0];
    return { x: s.ax, y: s.ay };
  }
  if (dist >= totalLen) {
    const s = segments[segments.length - 1];
    return { x: s.bx, y: s.by };
  }
  let i = 0;
  while (i < segments.length && cum[i + 1] < dist) i++;
  const seg = segments[i];
  const d0 = cum[i];
  const t = seg.len > 0 ? (dist - d0) / seg.len : 0;
  return {
    x: seg.ax + t * (seg.bx - seg.ax),
    y: seg.ay + t * (seg.by - seg.ay),
  };
}
