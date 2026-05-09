/**
 * 防御塔 Bottle 贴图：assets/tower-bottle/
 * - Bottle00/Bottle01：升级花费提示（与 TOWER_UPGRADE_COST 一致）
 * - BottleXY：X=等级 1～3，Y=动态帧 1～3
 * - PBottleXY：子弹；PBottle01/02：击中/击杀爆炸
 */

function loadImg(relPath) {
  const im = new Image();
  im.src = new URL(relPath, import.meta.url).href;
  return im;
}

/**
 * @returns {{
 *   hintUpgrade: HTMLImageElement[],
 *   bottle: HTMLImageElement[][],
 *   bullet: HTMLImageElement[][],
 *   explosionHit: HTMLImageElement,
 *   explosionKill: HTMLImageElement,
 * }}
 */
export function loadTowerBottleAssets() {
  const base = "../assets/tower-bottle/";
  const hintUpgrade = [
    loadImg(base + "Bottle00.png"),
    loadImg(base + "Bottle01.png"),
  ];
  /** @type {HTMLImageElement[][]} 索引 [level][state] 均为 1～3 */
  const bottle = [[], [], [], []];
  const bullet = [[], [], [], []];
  for (let L = 1; L <= 3; L++) {
    for (let S = 1; S <= 3; S++) {
      bottle[L][S] = loadImg(base + "Bottle" + L + S + ".png");
      bullet[L][S] = loadImg(base + "PBottle" + L + S + ".png");
    }
  }
  return {
    hintUpgrade,
    bottle,
    bullet,
    explosionHit: loadImg(base + "PBottle01.png"),
    explosionKill: loadImg(base + "PBottle02.png"),
  };
}
