/**
 * 数值平衡集中配置（改难度主要改本文件）。
 * 规则说明见 main.js 内 checkVictory / checkDefeat 注释。
 */

import { TILE } from "./gridLogic.js";

// —— 经济与生命 ——
export const STARTING_GOLD = 380;
export const INITIAL_LIVES = 20;

// —— 塔 ——
export const towerCost = 120;
/** 射程 = TILE × 该倍数（逻辑像素半径） */
export const TOWER_RANGE_TILES = 2;
export const towerRange = TILE * TOWER_RANGE_TILES;

/** 防御塔等级上限（含）：1 级为新造，最高 3 级 */
export const TOWER_MAX_LEVEL = 3;
/** 升级花费：下标 0 = Lv1→Lv2，1 = Lv2→Lv3 */
export const TOWER_UPGRADE_COST = [95, 140];

/** Lv1 单发伤害基准（与 towerDamageForLevel(1) 一致） */
export const BULLET_DAMAGE = 25;

/**
 * @param {number} level 1～TOWER_MAX_LEVEL
 */
export function towerDamageForLevel(level) {
  const lv = Math.min(Math.max(level | 0, 1), TOWER_MAX_LEVEL);
  const mult = [1, 1.2, 1.45];
  return Math.max(1, Math.round(BULLET_DAMAGE * mult[lv - 1]));
}

/**
 * @param {number} level 1～TOWER_MAX_LEVEL
 */
export function towerRangeForLevel(level) {
  const lv = Math.min(Math.max(level | 0, 1), TOWER_MAX_LEVEL);
  const mult = [1, 1.06, 1.12];
  return TILE * TOWER_RANGE_TILES * mult[lv - 1];
}

/**
 * @param {number} level 1～TOWER_MAX_LEVEL
 */
export function towerFireIntervalMsForLevel(level) {
  const lv = Math.min(Math.max(level | 0, 1), TOWER_MAX_LEVEL);
  const ms = [500, 440, 385];
  return ms[lv - 1];
}

/**
 * @param {number} level 当前等级
 * @returns {{ damage: number, rangePx: number, fireIntervalMs: number }}
 */
export function getTowerStatsForLevel(level) {
  return {
    damage: towerDamageForLevel(level),
    rangePx: towerRangeForLevel(level),
    fireIntervalMs: towerFireIntervalMsForLevel(level),
  };
}

/**
 * @param {number} currentLevel 当前等级（升级前）
 * @returns {number | null} 升到下一级所需金币；已满级为 null
 */
export function towerUpgradeCostFromLevel(currentLevel) {
  if (currentLevel >= TOWER_MAX_LEVEL) return null;
  return TOWER_UPGRADE_COST[currentLevel - 1];
}

// —— 敌人基础 ——
export const ENEMY_MAX_HP = 100;
/** 类型 N 的沿路径移动速度（逻辑像素/秒）；R/T 乘 ENEMY_TYPE 内倍数 */
export const ENEMY_MOVE_SPEED = 140;

/**
 * 三种怪：普通 N / 快跑 R / 肉盾 T
 * @typedef {{ speedMult: number, hpMult: number, radius: number }} EnemyTypeDef
 * @type {Record<'N'|'R'|'T', EnemyTypeDef>}
 */
export const ENEMY_TYPE = {
  N: { speedMult: 1, hpMult: 1, radius: 12 },
  R: { speedMult: 1.55, hpMult: 0.75, radius: 10 },
  T: { speedMult: 0.72, hpMult: 2.2, radius: 15 },
};

// —— 波次：spawnTypes 为出场顺序（字符 N/R/T），长度即本波数量 ——
/** @typedef {{ spawnIntervalSec: number, hpMultiplier: number, spawnTypes: string }} WaveDef */
/** @type {WaveDef[]} */
export const WAVES = [
  {
    spawnIntervalSec: 2.3,
    hpMultiplier: 1.0,
    spawnTypes: "NNNNNN",
  },
  {
    spawnIntervalSec: 2.1,
    hpMultiplier: 1.0,
    spawnTypes: "NRNNNRN",
  },
  {
    spawnIntervalSec: 2.0,
    hpMultiplier: 1.05,
    spawnTypes: "NRNRNRNT",
  },
  {
    spawnIntervalSec: 1.85,
    hpMultiplier: 1.08,
    spawnTypes: "NRNRTNRRT",
  },
  {
    spawnIntervalSec: 1.75,
    hpMultiplier: 1.12,
    spawnTypes: "NRNRTTNRRT",
  },
  {
    spawnIntervalSec: 1.65,
    hpMultiplier: 1.15,
    spawnTypes: "NRRNTRRTRT",
  },
  {
    spawnIntervalSec: 1.55,
    hpMultiplier: 1.18,
    spawnTypes: "NRRTRNTRTRT",
  },
  {
    spawnIntervalSec: 1.45,
    hpMultiplier: 1.22,
    spawnTypes: "NRRRTRNRRTT",
  },
  {
    spawnIntervalSec: 1.35,
    hpMultiplier: 1.26,
    spawnTypes: "NRTRRNRTTRTR",
  },
  {
    spawnIntervalSec: 1.25,
    hpMultiplier: 1.3,
    spawnTypes: "TRTNRRNRTRTR",
  },
];

// —— 战斗 ——
export const TOWER_FIRE_INTERVAL_MS = 500;
export const BULLET_SPEED = 420;
export const BULLET_RADIUS = 4;
export const GOLD_PER_KILL = 10;
