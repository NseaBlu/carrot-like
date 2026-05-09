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
  towerRange,
  cellIndexFromGamePoint,
} from "./towers.js";
import {
  runTowerFiring,
  updateBullets,
  BULLET_DAMAGE,
} from "./combat.js";
import {
  WAVES,
  STARTING_GOLD,
  INITIAL_LIVES,
  ENEMY_MOVE_SPEED,
} from "./gameBalance.js";
import { buildPathMetrics } from "./pathFollow.js";
import {
  spawnEnemy,
  updateEnemyAlongPath,
} from "./enemies.js";
import {
  drawBuildableTowerCells,
  drawRoadPolyline,
  drawPathVertices,
  drawTowerRanges,
  drawTowers,
  drawEnemies,
  drawBullets,
} from "./sceneDraw.js";

/** 关卡：JSON levels 数组下标，0=Level1；也可 URL ?level=1 */
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

const elHudGold = document.getElementById("hud-gold");
const elHudLives = document.getElementById("hud-lives");
const elHudWave = document.getElementById("hud-wave");
const elHudPhase = document.getElementById("hud-phase");
const btnRestart = document.getElementById("btn-restart");

/** @type {"playing" | "win" | "lose"} */
let gamePhase = "playing";

let scale = 1;
let offsetX = 0;
let offsetY = 0;

let roadPath = [];
/** @type {ReturnType<typeof buildPathMetrics>} */
let pathMetrics = null;
let buildableGrid = null;
/** @type {Array<{ col: number, row: number, nextFireAt: number }>} */
let towers = [];
/** @type {Array<{ x: number, y: number, target: object, damage: number }>} */
let bullets = [];
let gold = STARTING_GOLD;
/** @type {{ source: string, levelLabel: string }} */
let loadInfo = { source: "", levelLabel: "" };

/** @type {import('./enemies.js').Enemy[]} */
let enemies = [];
let lives = INITIAL_LIVES;
let leaked = 0;

/** 当前波（0-based，对应 WAVES 下标） */
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

function cssPixelToGame(px, py) {
  const gameX = (px - offsetX) / scale;
  const gameY = (py - offsetY) / scale;
  return { gameX, gameY };
}

/**
 * 胜利判定（全部满足才算通关）：
 * - currentWave 已为最后一波下标：currentWave === WAVES.length - 1
 * - 该波计划生成的敌人已全部出场：waveSpawnsLeft === 0
 * - 场上没有任何敌人：enemies.length === 0（含击杀与漏怪离场）
 * - 仍有生命：lives > 0
 *
 * 失败判定：lives <= 0（漏怪扣生命至 0）。
 */
function checkVictory() {
  if (gamePhase !== "playing" || lives <= 0) return;
  if (WAVES.length === 0) return;
  if (currentWave !== WAVES.length - 1) return;
  if (waveSpawnsLeft !== 0) return;
  if (enemies.length !== 0) return;
  gamePhase = "win";
}

function updateHud() {
  if (!elHudGold || !elHudLives || !elHudWave || !elHudPhase) return;
  elHudGold.textContent = String(gold);
  elHudLives.textContent = String(lives);
  const cur = WAVES.length ? Math.min(currentWave + 1, WAVES.length) : 0;
  elHudWave.textContent = WAVES.length ? cur + "/" + WAVES.length : "—";
  elHudPhase.textContent =
    gamePhase === "playing"
      ? "进行中"
      : gamePhase === "win"
        ? "胜利"
        : "失败";
}

/** 重置战斗状态（不关卡数据）：塔、弹、敌、经济、波次、胜负 */
function resetGameState() {
  towers.length = 0;
  bullets.length = 0;
  enemies.length = 0;
  gold = STARTING_GOLD;
  lives = INITIAL_LIVES;
  leaked = 0;
  currentWave = 0;
  waveSpawnsLeft = WAVES.length > 0 ? WAVES[0].count : 0;
  waveSpawnAccumulator =
    WAVES.length > 0 ? WAVES[0].spawnIntervalSec : 0;
  towerHintText = "";
  towerHintUntil = 0;
  clickMarks.length = 0;
  gamePhase = "playing";
  lastFrameTime = null;
  updateHud();
}

function restartGame() {
  resetGameState();
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

  ctx.fillStyle = "#2d4a3e";
  ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);

  if (buildableGrid) {
    drawBuildableTowerCells(ctx, buildableGrid, scale);
  }
  drawRoadPolyline(ctx, roadPath, scale);
  drawPathVertices(ctx, roadPath, scale);

  drawTowers(ctx, towers, TILE, scale);
  drawTowerRanges(ctx, towers, TILE, towerRange, scale);

  drawEnemies(ctx, enemies, pathMetrics, scale);
  drawBullets(ctx, bullets, scale);

  ctx.strokeStyle = "#7cfc00";
  ctx.lineWidth = 4 / scale;
  ctx.strokeRect(0, 0, LOGICAL_W, LOGICAL_H);

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

  ctx.fillStyle = "rgba(255, 255, 255, 0.82)";
  ctx.font = `${Math.max(12, 13)}px system-ui, sans-serif`;
  ctx.textBaseline = "top";
  ctx.fillText(
    loadInfo.levelLabel +
      " · 敌 " +
      enemies.length +
      " · 塔 " +
      towers.length +
      " · 漏怪 " +
      leaked +
      " · 造价 " +
      towerCost +
      " · R/重开",
    12,
    12
  );

  ctx.fillStyle = "rgba(200, 220, 200, 0.65)";
  ctx.font = `${Math.max(11, 12)}px system-ui, sans-serif`;
  ctx.fillText(pathsJsonUrl + " · ?level=", 12, 30);

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

  const waveCfg = WAVES[currentWave];
  if (waveCfg && waveSpawnsLeft > 0 && lives > 0) {
    waveSpawnAccumulator += dt;
    while (
      waveSpawnAccumulator >= waveCfg.spawnIntervalSec &&
      waveSpawnsLeft > 0 &&
      lives > 0
    ) {
      waveSpawnAccumulator -= waveCfg.spawnIntervalSec;
      enemies.push(spawnEnemy(waveCfg.hpMultiplier));
      waveSpawnsLeft--;
    }
  }

  if (
    waveSpawnsLeft === 0 &&
    enemies.length === 0 &&
    currentWave < WAVES.length - 1
  ) {
    currentWave++;
    waveSpawnsLeft = WAVES[currentWave].count;
    waveSpawnAccumulator = WAVES[currentWave].spawnIntervalSec;
  }

  for (let i = enemies.length - 1; i >= 0; i--) {
    const reached = updateEnemyAlongPath(
      enemies[i],
      pathMetrics,
      ENEMY_MOVE_SPEED,
      dt
    );
    if (reached) {
      leaked += 1;
      lives = Math.max(0, lives - 1);
      enemies.splice(i, 1);
    }
  }

  runTowerFiring(towers, TILE, towerRange, enemies, pathMetrics, now, bullets, BULLET_DAMAGE);

  updateBullets(bullets, dt, enemies, pathMetrics, {
    onGoldReward: function (n) {
      gold += n;
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
    nextFireAt: now,
  });
  return true;
}

function onPointerDown(e) {
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
    if (tryPlaceTower(gameX, gameY, now)) return;
    clickMarks.push({ x: gameX, y: gameY });
    if (clickMarks.length > MAX_MARKS) clickMarks.shift();
  }
}

canvas.addEventListener("pointerdown", onPointerDown);
window.addEventListener("resize", onResize);

window.addEventListener("keydown", function (e) {
  if (e.repeat) return;
  if (e.key.toLowerCase() === "r") {
    e.preventDefault();
    restartGame();
  }
});

if (btnRestart) {
  btnRestart.addEventListener("click", function () {
    restartGame();
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
  const { roadPath: rp, levelMeta } = getRoadPathForLevel(
    result.data,
    levelIndex
  );
  roadPath = rp;
  pathMetrics = buildPathMetrics(roadPath);
  buildableGrid = computeBuildableGrid(roadPath);
  loadInfo = {
    source: result.source + (result.fetchFailed ? "(回退)" : ""),
    levelLabel: "Level " + levelMeta.level + " (levels[" + levelIndex + "])",
  };
  resetGameState();
  updateLayout();
  requestAnimationFrame(loop);
}

bootstrap();
