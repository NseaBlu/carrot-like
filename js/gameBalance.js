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

// —— 敌人基础 ——
export const ENEMY_MAX_HP = 100;
/** 沿路径移动速度（逻辑像素/秒） */
export const ENEMY_MOVE_SPEED = 140;

// —— 波次：每波数量、生成间隔(秒)、血量倍数；敌人在路径起点生成 ——
/** @typedef {{ count: number, spawnIntervalSec: number, hpMultiplier: number }} WaveDef */
/** @type {WaveDef[]} */
export const WAVES = [
  { count: 5, spawnIntervalSec: 2.3, hpMultiplier: 1 },
  { count: 7, spawnIntervalSec: 2.0, hpMultiplier: 1 },
  { count: 9, spawnIntervalSec: 1.8, hpMultiplier: 1.12 },
  { count: 11, spawnIntervalSec: 1.6, hpMultiplier: 1.22 },
  { count: 14, spawnIntervalSec: 1.4, hpMultiplier: 1.35 },
];

// —— 战斗 ——
export const TOWER_FIRE_INTERVAL_MS = 500;
export const BULLET_SPEED = 420;
export const BULLET_DAMAGE = 25;
export const BULLET_RADIUS = 4;
export const GOLD_PER_KILL = 10;
