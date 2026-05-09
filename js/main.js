import {
  loadTheme1Paths,
  DEFAULT_THEME1_JSON_URL,
  getRoadPathForLevel,
} from "./pathData.js";
import {
  computeBuildableGrid,
  LOGICAL_W,
  LOGICAL_H,
  TILE,
  COLS,
  ROWS,
} from "./gridLogic.js";
import {
  towerCost,
  cellIndexFromGamePoint,
} from "./towers.js";
import {
  runTowerFiring,
  updateTowerAiming,
  updateBullets,
} from "./combat.js";
import {
  wavesForTheme1Level,
  STARTING_GOLD,
  INITIAL_LIVES,
  getTowerStatsForLevel,
  towerUpgradeCostFromLevel,
  TOWER_MAX_LEVEL,
} from "./gameBalance.js";
import { buildPathMetrics } from "./pathFollow.js";
import {
  spawnEnemy,
  updateEnemyAlongPath,
} from "./enemies.js";
import {
  drawMapAssistGrid,
  drawRoadPolyline,
  drawPathVertices,
  drawPathIceTiles,
  drawTowerRanges,
  drawTowers,
  drawDefenseCarrot,
  drawEnemies,
  drawBullets,
  drawExplosionEffects,
} from "./sceneDraw.js";
import {
  pickCarrotSpriteId,
  CARROT_LEAK_FLASH_MS,
} from "./carrotSprite.js";
import { createEnemyMonsterFrames } from "./enemySprites.js";
import { loadTowerBottleAssets } from "./towerSprites.js";

/** 当前关卡波次表（Theme1，随 levelIndex 切换） */
function activeWaves() {
  return wavesForTheme1Level(levelIndex);
}

/** 关卡：theme1-paths.json 的 levels 下标，0=第 1 关；URL ?level=1 为第 2 关 */
function readLevelIndex() {
  const q = new URLSearchParams(window.location.search).get("level");
  if (q !== null && q !== "") {
    const n = parseInt(q, 10);
    if (!Number.isNaN(n)) return Math.max(0, n);
  }
  return 0;
}

let levelIndex = readLevelIndex();
let pathsJsonUrl = DEFAULT_THEME1_JSON_URL;

const qsUrl = new URLSearchParams(window.location.search).get("paths");
if (qsUrl) pathsJsonUrl = qsUrl;

const canvas = document.getElementById("view");
const ctx = canvas.getContext("2d");

/** 逻辑区域 910×490 背景（与 index 同级目录下的 assets） */
const bgImage = new Image();
bgImage.src = new URL("../assets/background.png", import.meta.url).href;
const pathIceImg = new Image();
pathIceImg.src = new URL("../assets/path-ice-tile.png", import.meta.url).href;

const CARROT_SPRITE_IDS = [1, 2, 3, 7, 8, 9, 10, 11, 12, 13, 14];
/** @type {Record<number, HTMLImageElement>} */
const carrotImages = {};
for (let ci = 0; ci < CARROT_SPRITE_IDS.length; ci++) {
  const sid = CARROT_SPRITE_IDS[ci];
  const cimg = new Image();
  cimg.src = new URL(
    "../assets/carrot/hlb1_" + sid + ".png",
    import.meta.url
  ).href;
  carrotImages[sid] = cimg;
}

const enemyMonsterFrames = createEnemyMonsterFrames();
const towerBottleAssets = loadTowerBottleAssets();

const elHudLevel = document.getElementById("hud-level");
const elHudGold = document.getElementById("hud-gold");
const elHudLives = document.getElementById("hud-lives");
const elHudWave = document.getElementById("hud-wave");
const elHudTowers = document.getElementById("hud-towers");
const elHudEnemies = document.getElementById("hud-enemies");
const elHudLeaked = document.getElementById("hud-leaked");
const elHudPhase = document.getElementById("hud-phase");
const elHudTowerCost = document.getElementById("hud-tower-cost");
const elHudTowerSel = document.getElementById("hud-tower-sel");
const btnRestart = document.getElementById("btn-restart");
const btnMapAssist = document.getElementById("btn-map-assist");
const elStageClearOverlay = document.getElementById("stage-clear-overlay");
const btnStageClearNext = document.getElementById("btn-stage-clear-next");
const btnStageClearReplay = document.getElementById("btn-stage-clear-replay");

/** @type {"playing" | "win" | "lose" | "stageClear"} */
let gamePhase = "playing";

/** 地图边框、格线、可建格/不可建红叉、塔射程、路径折线与顶点；默认关闭 */
let showMapAssistOverlay = false;

let scale = 1;
let offsetX = 0;
let offsetY = 0;

/** fetch 到的 theme1-paths 全文；用于通关后进下一关切换几何 */
let themePathsData = null;

let roadPath = [];
/** 终点萝卜绘制锚点（脚底）；来自关卡 startEndMarkers.carrotEnd */
let carrotPos = { x: 805, y: 195 };
/** 漏怪瞬间播放受击帧，截止时间戳（performance.now） */
let carrotLeakFlashUntil = 0;
/** @type {ReturnType<typeof buildPathMetrics>} */
let pathMetrics = null;
let buildableGrid = null;
/** @type {Array<{ col: number, row: number, level: number, nextFireAt: number }>} */
let towers = [];
/** 选中塔在 towers 中的下标；-1 表示未选中 */
let selectedTowerIndex = -1;
/** @type {Array<{ x: number, y: number, target: object, damage: number }>} */
let bullets = [];
/** @type {Array<{ x: number, y: number, kill: boolean, until: number, followEnemy?: object }>} */
let explosionFx = [];
let gold = STARTING_GOLD;
/** @type {{ source: string, levelLabel: string }} */
let loadInfo = { source: "", levelLabel: "" };

/** @type {import('./enemies.js').Enemy[]} */
let enemies = [];
let lives = INITIAL_LIVES;
let leaked = 0;

/** 当前波（0-based，对应当前关卡波次表下标） */
let currentWave = 0;
/** 本波剩余待生成数量 */
let waveSpawnsLeft = 0;
/** 生成间隔累计（秒） */
let waveSpawnAccumulator = 0;

/** 金币不足等提示（画布角落 + console） */
let towerHintText = "";
let towerHintUntil = 0;

let lastFrameTime = null;

const clickMarks = [];
const MAX_MARKS = 32;

function findTowerIndexAtCell(c, r) {
  for (let i = 0; i < towers.length; i++) {
    if (towers[i].col === c && towers[i].row === r) return i;
  }
  return -1;
}

function tryUpgradeSelectedTower(now) {
  if (gamePhase !== "playing") return false;
  if (selectedTowerIndex < 0 || selectedTowerIndex >= towers.length) {
    return false;
  }
  const tw = towers[selectedTowerIndex];
  if (tw.level >= TOWER_MAX_LEVEL) {
    towerHintText = "该塔已满级";
    towerHintUntil = now + 2400;
    return false;
  }
  const cost = towerUpgradeCostFromLevel(tw.level);
  if (cost === null) return false;
  if (gold < cost) {
    towerHintText = "金币不足（升级需 " + cost + "，当前 " + gold + "）";
    towerHintUntil = now + 3200;
    return false;
  }
  gold -= cost;
  tw.level += 1;
  return true;
}

function cssPixelToGame(px, py) {
  const gameX = (px - offsetX) / scale;
  const gameY = (py - offsetY) / scale;
  return { gameX, gameY };
}

/**
 * 胜利判定（全部满足才算通关）：
 * - currentWave 已为最后一波下标：currentWave === activeWaves().length - 1
 * - 该波计划生成的敌人已全部出场：waveSpawnsLeft === 0
 * - 场上没有任何敌人：enemies.length === 0（含击杀与漏怪离场）
 * - 仍有生命：lives > 0
 *
 * 失败判定：lives <= 0（漏怪扣生命至 0）。
 *
 * 通关且仍存在下一关：进入 stageClear，DOM 弹窗询问是否进入下一关；
 * 最后一关通关仍为胜利态。
 */
function checkVictory() {
  if (gamePhase !== "playing" || lives <= 0) return;
  if (activeWaves().length === 0) return;
  if (currentWave !== activeWaves().length - 1) return;
  if (waveSpawnsLeft !== 0) return;
  if (enemies.length !== 0) return;

  const levelsArr = themePathsData && themePathsData.levels;
  const hasNextLevel =
    levelsArr && levelIndex < levelsArr.length - 1;

  if (hasNextLevel) {
    gamePhase = "stageClear";
    lastFrameTime = null;
    showStageClearDialog();
    return;
  }

  gamePhase = "win";
}

/**
 * 切换 roads.json 关卡索引：刷新路径、萝卜点、可建格与 HUD 关卡名。
 * @param {number} idx — themePathsData.levels 下标
 */
function applyLevelGeometry(idx) {
  if (!themePathsData) return;
  const { roadPath: rp, levelMeta, carrotPos: cp } = getRoadPathForLevel(
    themePathsData,
    idx
  );
  roadPath = rp;
  carrotPos = cp;
  pathMetrics = buildPathMetrics(roadPath);
  buildableGrid = computeBuildableGrid(roadPath);
  loadInfo.levelLabel =
    "Level " + levelMeta.level + " (levels[" + idx + "])";
}

function updateHud() {
  if (
    !elHudGold ||
    !elHudLives ||
    !elHudWave ||
    !elHudPhase
  ) {
    return;
  }
  if (elHudLevel) elHudLevel.textContent = loadInfo.levelLabel || "—";
  if (elHudTowerCost) elHudTowerCost.textContent = String(towerCost);
  elHudGold.textContent = String(gold);
  elHudLives.textContent = String(lives);
  const wlen = activeWaves().length;
  const cur = wlen ? Math.min(currentWave + 1, wlen) : 0;
  elHudWave.textContent = wlen ? cur + "/" + wlen : "—";
  if (elHudTowers) elHudTowers.textContent = String(towers.length);
  if (elHudEnemies) elHudEnemies.textContent = String(enemies.length);
  if (elHudLeaked) elHudLeaked.textContent = String(leaked);
  elHudPhase.textContent =
    gamePhase === "playing"
      ? "进行中"
      : gamePhase === "stageClear"
        ? "通关（待选择）"
        : gamePhase === "win"
          ? "胜利"
          : "失败";

  if (elHudTowerSel) {
    if (
      (gamePhase !== "playing" && gamePhase !== "stageClear") ||
      selectedTowerIndex < 0 ||
      selectedTowerIndex >= towers.length
    ) {
      elHudTowerSel.textContent = "（点击塔升级）";
    } else {
      const tw = towers[selectedTowerIndex];
      const cost = towerUpgradeCostFromLevel(tw.level);
      if (cost === null) {
        elHudTowerSel.textContent = "Lv." + tw.level + " 已满级";
      } else {
        elHudTowerSel.textContent =
          "Lv." + tw.level + " → 升级需 " + cost;
      }
    }
  }

}

/** 重置战斗状态（不关卡数据）：塔、弹、敌、经济、波次、胜负 */
function resetGameState() {
  towers.length = 0;
  bullets.length = 0;
  explosionFx.length = 0;
  enemies.length = 0;
  gold = STARTING_GOLD;
  lives = INITIAL_LIVES;
  leaked = 0;
  currentWave = 0;
  const aw = activeWaves();
  waveSpawnsLeft = aw.length > 0 ? aw[0].spawnTypes.length : 0;
  waveSpawnAccumulator = aw.length > 0 ? aw[0].spawnIntervalSec : 0;
  towerHintText = "";
  towerHintUntil = 0;
  clickMarks.length = 0;
  selectedTowerIndex = -1;
  carrotLeakFlashUntil = 0;
  gamePhase = "playing";
  lastFrameTime = null;
  updateHud();
}

function hideStageClearDialog() {
  if (elStageClearOverlay) elStageClearOverlay.hidden = true;
}

function showStageClearDialog() {
  if (elStageClearOverlay) elStageClearOverlay.hidden = false;
  updateHud();
}

function confirmNextLevel() {
  hideStageClearDialog();
  const levelsArr = themePathsData && themePathsData.levels;
  if (!levelsArr || levelIndex >= levelsArr.length - 1) return;
  levelIndex++;
  applyLevelGeometry(levelIndex);
  resetGameState();
  lastFrameTime = null;
  towerHintText = "已进入下一关";
  towerHintUntil = performance.now() + 2800;
  try {
    const url = new URL(window.location.href);
    url.searchParams.set("level", String(levelIndex));
    history.replaceState(null, "", url.pathname + url.search + url.hash);
  } catch (err) {
    /* ignore */
  }
}

function replayCurrentLevelFromDialog() {
  hideStageClearDialog();
  resetGameState();
  lastFrameTime = null;
}

function restartGame() {
  hideStageClearDialog();
  resetGameState();
}

function syncMapAssistButton() {
  if (!btnMapAssist) return;
  btnMapAssist.setAttribute(
    "aria-pressed",
    showMapAssistOverlay ? "true" : "false"
  );
  btnMapAssist.textContent = showMapAssistOverlay
    ? "辅助：开"
    : "辅助：关";
}

function updateLayout() {
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const cw = canvas.clientWidth;
  const ch = canvas.clientHeight;

  canvas.width = Math.max(1, Math.floor(cw * dpr));
  canvas.height = Math.max(1, Math.floor(ch * dpr));

  scale = Math.min(cw / LOGICAL_W, ch / LOGICAL_H);
  offsetX = (cw - LOGICAL_W * scale) / 2;
  offsetY = (ch - LOGICAL_H * scale) / 2;
}

function drawFrame() {
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const cw = canvas.clientWidth;
  const ch = canvas.clientHeight;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = "#1a1a1e";
  ctx.fillRect(0, 0, cw, ch);

  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);

  if (bgImage.complete && bgImage.naturalWidth > 0) {
    ctx.drawImage(bgImage, 0, 0, LOGICAL_W, LOGICAL_H);
  } else {
    ctx.fillStyle = "#2d4a3e";
    ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);
  }

  drawPathIceTiles(ctx, roadPath, pathIceImg);
  if (showMapAssistOverlay && buildableGrid) {
    drawMapAssistGrid(ctx, buildableGrid, scale);
    drawRoadPolyline(ctx, roadPath, scale);
    drawPathVertices(ctx, roadPath, scale);
  }

  const frameNow = performance.now();
  let showUpgradeHint = false;
  if (
    gamePhase === "playing" &&
    selectedTowerIndex >= 0 &&
    selectedTowerIndex < towers.length
  ) {
    const uc = towerUpgradeCostFromLevel(
      towers[selectedTowerIndex].level
    );
    showUpgradeHint = uc !== null && gold >= uc;
  }

  drawTowers(
    ctx,
    towers,
    TILE,
    scale,
    selectedTowerIndex,
    towerBottleAssets,
    frameNow,
    showUpgradeHint
  );
  if (showMapAssistOverlay) {
    drawTowerRanges(
      ctx,
      towers,
      TILE,
      function (t) {
        return getTowerStatsForLevel(t.level ?? 1).rangePx;
      },
      scale,
      selectedTowerIndex
    );
  }

  const carrotNow = frameNow;
  const carrotSpriteId = pickCarrotSpriteId({
    lives,
    gamePhase,
    leakFlashUntil: carrotLeakFlashUntil,
    now: carrotNow,
    enemies,
    metrics: pathMetrics,
  });
  drawDefenseCarrot(
    ctx,
    carrotImages[carrotSpriteId],
    carrotPos.x,
    carrotPos.y
  );

  drawEnemies(ctx, enemies, pathMetrics, scale, enemyMonsterFrames);
  drawBullets(
    ctx,
    bullets,
    scale,
    towerBottleAssets.bullet,
    frameNow,
    pathMetrics
  );
  drawExplosionEffects(
    ctx,
    explosionFx,
    towerBottleAssets.explosionHit,
    towerBottleAssets.explosionKill,
    pathMetrics
  );

  if (showMapAssistOverlay) {
    ctx.strokeStyle = "#7cfc00";
    ctx.lineWidth = 4 / scale;
    ctx.strokeRect(0, 0, LOGICAL_W, LOGICAL_H);
  }

  const crossHalf = 14;
  ctx.strokeStyle = "#ff6b6b";
  ctx.lineWidth = 3 / scale;
  ctx.lineCap = "round";
  for (let i = 0; i < clickMarks.length; i++) {
    const m = clickMarks[i];
    ctx.beginPath();
    ctx.moveTo(m.x - crossHalf, m.y - crossHalf);
    ctx.lineTo(m.x + crossHalf, m.y + crossHalf);
    ctx.moveTo(m.x + crossHalf, m.y - crossHalf);
    ctx.lineTo(m.x - crossHalf, m.y + crossHalf);
    ctx.stroke();
  }

  if (gamePhase === "win" || gamePhase === "lose") {
    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);
    ctx.fillStyle = "rgba(255, 255, 255, 0.96)";
    ctx.font = `${Math.max(36, 44)}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
      gamePhase === "win" ? "胜利" : "失败",
      LOGICAL_W / 2,
      LOGICAL_H / 2 - 18
    );
    ctx.font = `${Math.max(14, 16)}px system-ui, sans-serif`;
    ctx.fillStyle = "rgba(230, 230, 230, 0.92)";
    ctx.fillText("按 R 或点「重开」", LOGICAL_W / 2, LOGICAL_H / 2 + 28);
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.restore();
  }

  const hintNow = performance.now();
  if (towerHintText && hintNow < towerHintUntil) {
    ctx.save();
    ctx.fillStyle = "rgba(255, 140, 140, 0.98)";
    ctx.font = `${Math.max(13, 15)}px system-ui, sans-serif`;
    ctx.textAlign = "right";
    ctx.textBaseline = "bottom";
    ctx.fillText(towerHintText, LOGICAL_W - 10, LOGICAL_H - 10);
    ctx.restore();
  }

  updateHud();
}

function updateSimulation(dt, now) {
  if (!pathMetrics) return;
  if (gamePhase !== "playing") return;

  explosionFx = explosionFx.filter(function (e) {
    if (now >= e.until) return false;
    if (e.followEnemy && enemies.indexOf(e.followEnemy) < 0) return false;
    return true;
  });

  const waves = activeWaves();
  const waveCfg = waves[currentWave];
  if (waveCfg && waveSpawnsLeft > 0 && lives > 0) {
    waveSpawnAccumulator += dt;
    while (
      waveSpawnAccumulator >= waveCfg.spawnIntervalSec &&
      waveSpawnsLeft > 0 &&
      lives > 0
    ) {
      waveSpawnAccumulator -= waveCfg.spawnIntervalSec;
      const types = waveCfg.spawnTypes;
      const idx = types.length - waveSpawnsLeft;
      const typeChar = types.charAt(idx);
      enemies.push(spawnEnemy(waveCfg.hpMultiplier, typeChar));
      waveSpawnsLeft--;
    }
  }

  if (
    waveSpawnsLeft === 0 &&
    enemies.length === 0 &&
    currentWave < waves.length - 1
  ) {
    currentWave++;
    waveSpawnsLeft = waves[currentWave].spawnTypes.length;
    waveSpawnAccumulator = waves[currentWave].spawnIntervalSec;
  }

  for (let i = enemies.length - 1; i >= 0; i--) {
    const reached = updateEnemyAlongPath(enemies[i], pathMetrics, dt);
    if (reached) {
      leaked += 1;
      carrotLeakFlashUntil = now + CARROT_LEAK_FLASH_MS;
      lives = Math.max(0, lives - 1);
      enemies.splice(i, 1);
    }
  }

  updateTowerAiming(towers, TILE, enemies, pathMetrics);
  runTowerFiring(towers, TILE, enemies, pathMetrics, now, bullets);

  updateBullets(bullets, dt, enemies, pathMetrics, {
    onGoldReward: function (n) {
      gold += n;
    },
    onExplosionFx: function (x, y, killed, followEnemy) {
      explosionFx.push({
        x,
        y,
        kill: killed,
        until: now + (killed ? 320 : 220),
        followEnemy: killed ? undefined : followEnemy,
      });
    },
  });

  if (lives <= 0) {
    gamePhase = "lose";
    return;
  }
  checkVictory();
}

function loop(frameTime) {
  const now =
    frameTime !== undefined ? frameTime : performance.now();
  let dt = 0;
  if (lastFrameTime !== null) {
    dt = (now - lastFrameTime) / 1000;
    if (dt > 0.1) dt = 0.1;
  }
  lastFrameTime = now;

  updateSimulation(dt, now);
  drawFrame();
  requestAnimationFrame(loop);
}

function onResize() {
  updateLayout();
}

function pointerPosRelativeToCanvas(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  return {
    px: clientX - rect.left,
    py: clientY - rect.top,
  };
}

function tryPlaceTower(gameX, gameY, now) {
  if (gamePhase !== "playing") return false;
  if (!buildableGrid) return false;
  const { c, r } = cellIndexFromGamePoint(gameX, gameY, TILE);
  if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return false;
  if (!buildableGrid.buildable[r][c]) return false;
  for (let i = 0; i < towers.length; i++) {
    if (towers[i].col === c && towers[i].row === r) return false;
  }
  if (gold < towerCost) {
    towerHintText = "金币不足（需要 " + towerCost + "，当前 " + gold + "）";
    towerHintUntil = now + 3200;
    console.warn("[塔防] 金币不足，无法造塔。需要", towerCost, "当前", gold);
    return false;
  }
  gold -= towerCost;
  towers.push({
    col: c,
    row: r,
    level: 1,
    aimAngle: 0,
    nextFireAt: now,
  });
  return true;
}

function onPointerDown(e) {
  if (gamePhase === "stageClear") return;
  if (e.pointerType === "mouse" && e.button !== 0) return;
  const now = performance.now();
  const { px, py } = pointerPosRelativeToCanvas(e.clientX, e.clientY);
  const { gameX, gameY } = cssPixelToGame(px, py);
  const eps = 1;
  if (
    gameX >= -eps &&
    gameX <= LOGICAL_W + eps &&
    gameY >= -eps &&
    gameY <= LOGICAL_H + eps
  ) {
    const { c, r } = cellIndexFromGamePoint(gameX, gameY, TILE);
    const hitTower = findTowerIndexAtCell(c, r);
    if (hitTower >= 0) {
      selectedTowerIndex = hitTower;
      tryUpgradeSelectedTower(now);
      return;
    }
    if (tryPlaceTower(gameX, gameY, now)) {
      selectedTowerIndex = towers.length - 1;
      return;
    }
    selectedTowerIndex = -1;
    clickMarks.push({ x: gameX, y: gameY });
    if (clickMarks.length > MAX_MARKS) clickMarks.shift();
  }
}

canvas.addEventListener("pointerdown", onPointerDown);
window.addEventListener("resize", onResize);

window.addEventListener("keydown", function (e) {
  if (e.repeat) return;
  const k = e.key.toLowerCase();
  if (k === "r") {
    e.preventDefault();
    restartGame();
    return;
  }
});

if (btnRestart) {
  btnRestart.addEventListener("click", function () {
    restartGame();
  });
}
if (btnMapAssist) {
  btnMapAssist.addEventListener("click", function () {
    showMapAssistOverlay = !showMapAssistOverlay;
    syncMapAssistButton();
  });
  syncMapAssistButton();
}
if (btnStageClearNext) {
  btnStageClearNext.addEventListener("click", function () {
    confirmNextLevel();
  });
}
if (btnStageClearReplay) {
  btnStageClearReplay.addEventListener("click", function () {
    replayCurrentLevelFromDialog();
  });
}
if (window.visualViewport) {
  visualViewport.addEventListener("resize", onResize);
}
if (typeof ResizeObserver !== "undefined") {
  new ResizeObserver(onResize).observe(canvas);
}

async function bootstrap() {
  const result = await loadTheme1Paths(pathsJsonUrl);
  themePathsData = result.data;
  loadInfo.source = result.source + (result.fetchFailed ? "(回退)" : "");
  hideStageClearDialog();
  applyLevelGeometry(levelIndex);
  resetGameState();
  updateLayout();
  requestAnimationFrame(loop);
}

bootstrap();
