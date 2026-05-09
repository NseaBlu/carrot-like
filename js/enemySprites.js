/**
 * 怪物贴图：N → assets/normal，R → assets/swift，T → assets/bulky。
 * 每类 3 帧，沿路径 distAlongPath 推进切换。
 */

/**
 * @returns {Record<'N'|'R'|'T', HTMLImageElement[]>}
 */
export function createEnemyMonsterFrames() {
  const mk = (folder, names) =>
    names.map(function (name) {
      const im = new Image();
      im.src = new URL(
        "../assets/" + folder + "/" + name + ".png",
        import.meta.url
      ).href;
      return im;
    });
  return {
    N: mk("normal", ["SL31", "SL32", "SL33"]),
    R: mk("swift", ["F11", "F12", "F13"]),
    T: mk("bulky", ["B11", "B12", "B13"]),
  };
}
