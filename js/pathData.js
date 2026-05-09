/**
 * 路径数据：运行时 fetch JSON；失败时使用内嵌副本（file:// 或无静态服务时常不可用）。
 * 修改关卡：调整 main.js 中 levelIndex，或 URL ?level=0|1|2
 */

/** 与 index.html 同目录时的默认文件；也可改为绝对路径或 CDN */
export const DEFAULT_THEME1_JSON_URL = "./theme1-paths.json";

/**
 * 若 fetch 不可用，取消注释下方 embedded 或改用内嵌对象（与 theme1-paths.json 保持同步）。
 * 内嵌对象供 loadTheme1Paths 在无网络/本地文件限制时回退。
 */
export const EMBEDDED_THEME1_PATHS = {
  coordinateSystem: {
    tileSize: { width: 70, height: 70 },
    mapPixelSize: { width: 910, height: 490 },
  },
  levels: [
    {
      level: 1,
      roadPath: [
        { id: 2, x: 105, y: 175 },
        { id: 3, x: 245, y: 175 },
        { id: 4, x: 245, y: 455 },
        { id: 5, x: 665, y: 455 },
        { id: 6, x: 665, y: 175 },
        { id: 7, x: 805, y: 175 },
      ],
    },
    {
      level: 2,
      roadPath: [
        { id: 20, x: 455, y: 525 },
        { id: 21, x: 175, y: 525 },
        { id: 22, x: 175, y: 455 },
        { id: 23, x: 105, y: 455 },
        { id: 24, x: 106, y: 245 },
        { id: 25, x: 315, y: 245 },
        { id: 26, x: 315, y: 315 },
        { id: 27, x: 595, y: 315 },
        { id: 28, x: 595, y: 455 },
        { id: 29, x: 735, y: 455 },
        { id: 30, x: 734, y: 175 },
      ],
    },
    {
      level: 3,
      roadPath: [
        { id: 55, x: 105, y: 175 },
        { id: 56, x: 385, y: 175 },
        { id: 57, x: 385, y: 245 },
        { id: 58, x: 525, y: 245 },
        { id: 59, x: 525, y: 385 },
        { id: 60, x: 385, y: 385 },
        { id: 61, x: 385, y: 315 },
        { id: 62, x: 245, y: 315 },
        { id: 63, x: 245, y: 455 },
        { id: 64, x: 805, y: 455 },
      ],
    },
  ],
};

/**
 * @param {string} [url]
 * @returns {Promise<{ data: object, source: 'fetch' | 'embedded', fetchFailed?: boolean }>}
 */
export async function loadTheme1Paths(url = DEFAULT_THEME1_JSON_URL) {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(String(res.status));
    const data = await res.json();
    return { data, source: "fetch" };
  } catch (e) {
    console.warn(
      "[pathData] fetch 失败，使用内嵌 theme1 数据。本地预览请用静态服务器或同步更新 EMBEDDED_THEME1_PATHS：",
      e
    );
    return {
      data: EMBEDDED_THEME1_PATHS,
      source: "embedded",
      fetchFailed: true,
    };
  }
}

export function getRoadPathForLevel(data, levelIndex) {
  const levels = data.levels;
  if (!levels || levelIndex < 0 || levelIndex >= levels.length) {
    throw new Error("无效关卡索引: " + levelIndex);
  }
  const lv = levels[levelIndex];
  const roadPath = lv.roadPath;
  if (!roadPath) throw new Error("关卡缺少 roadPath");
  return { levelMeta: lv, roadPath };
}
