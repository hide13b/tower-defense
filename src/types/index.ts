export interface Position {
  x: number;
  y: number;
}

// Tower types
export type TowerType = 'archer' | 'cannon' | 'slow';

export interface TowerLevelStats {
  damage: number;
  range: number;
  fireRate: number;
  aoeRadius?: number;
  slowAmount?: number;
  slowDuration?: number;
}

export interface TowerConfig {
  name: string;
  cost: number;
  upgradeCosts: [number, number]; // Level 2 and 3 costs
  levels: [TowerLevelStats, TowerLevelStats, TowerLevelStats]; // Stats for each level
  color: string;
  secondaryColor: string;
}

export const TOWER_CONFIGS: Record<TowerType, TowerConfig> = {
  archer: {
    name: 'Archer',
    cost: 30,
    upgradeCosts: [40, 60],
    levels: [
      { damage: 15, range: 120, fireRate: 1.5 },
      { damage: 25, range: 140, fireRate: 2.0 },
      { damage: 40, range: 160, fireRate: 2.5 },
    ],
    color: '#44aa44',
    secondaryColor: '#228822',
  },
  cannon: {
    name: 'Cannon',
    cost: 80,
    upgradeCosts: [60, 100],
    levels: [
      { damage: 40, range: 80, fireRate: 0.5, aoeRadius: 50 },
      { damage: 60, range: 90, fireRate: 0.6, aoeRadius: 60 },
      { damage: 90, range: 100, fireRate: 0.75, aoeRadius: 75 },
    ],
    color: '#aa4444',
    secondaryColor: '#882222',
  },
  slow: {
    name: 'Slow',
    cost: 50,
    upgradeCosts: [50, 80],
    levels: [
      { damage: 5, range: 100, fireRate: 1, slowAmount: 0.5, slowDuration: 2 },
      { damage: 10, range: 120, fireRate: 1.2, slowAmount: 0.6, slowDuration: 2.5 },
      { damage: 15, range: 140, fireRate: 1.5, slowAmount: 0.7, slowDuration: 3 },
    ],
    color: '#4488cc',
    secondaryColor: '#226699',
  },
};

// Enemy types
export type EnemyType = 'normal' | 'speed' | 'tank';

export interface EnemyTypeConfig {
  name: string;
  hpMultiplier: number;
  speedMultiplier: number;
  rewardMultiplier: number;
  color: string;
  size: number;
}

export const ENEMY_CONFIGS: Record<EnemyType, EnemyTypeConfig> = {
  normal: {
    name: 'Normal',
    hpMultiplier: 1,
    speedMultiplier: 1,
    rewardMultiplier: 1,
    color: '#ff4444',
    size: 20,
  },
  speed: {
    name: 'Speed',
    hpMultiplier: 0.5,
    speedMultiplier: 1.8,
    rewardMultiplier: 1.2,
    color: '#ffaa00',
    size: 16,
  },
  tank: {
    name: 'Tank',
    hpMultiplier: 3,
    speedMultiplier: 0.5,
    rewardMultiplier: 2,
    color: '#8844aa',
    size: 28,
  },
};

// Path system
export interface PathPoint {
  x: number;
  y: number;
}

export interface MapConfig {
  name: string;
  path: PathPoint[];
  pathWidth: number;
}

// Default winding path
export const DEFAULT_MAP: MapConfig = {
  name: 'Winding Path',
  path: [
    { x: 0, y: 100 },
    { x: 200, y: 100 },
    { x: 200, y: 300 },
    { x: 400, y: 300 },
    { x: 400, y: 150 },
    { x: 600, y: 150 },
    { x: 600, y: 450 },
    { x: 300, y: 450 },
    { x: 300, y: 550 },
    { x: 800, y: 550 },
  ],
  pathWidth: 40,
};

// Wave configuration (JSON-compatible)
export interface WaveEnemy {
  type: EnemyType;
  count: number;
}

export interface WaveConfig {
  enemies: WaveEnemy[];
  baseHp: number;
  baseSpeed: number;
  spawnInterval: number;
  baseReward: number;
}

// Default waves (can be loaded from JSON)
export const DEFAULT_WAVES: WaveConfig[] = [
  {
    enemies: [{ type: 'normal', count: 5 }],
    baseHp: 30,
    baseSpeed: 50,
    spawnInterval: 2000,
    baseReward: 10,
  },
  {
    enemies: [{ type: 'normal', count: 5 }, { type: 'speed', count: 3 }],
    baseHp: 35,
    baseSpeed: 52,
    spawnInterval: 1800,
    baseReward: 12,
  },
  {
    enemies: [{ type: 'normal', count: 5 }, { type: 'speed', count: 3 }, { type: 'tank', count: 2 }],
    baseHp: 40,
    baseSpeed: 55,
    spawnInterval: 1600,
    baseReward: 15,
  },
  {
    enemies: [{ type: 'normal', count: 6 }, { type: 'speed', count: 5 }, { type: 'tank', count: 3 }],
    baseHp: 50,
    baseSpeed: 58,
    spawnInterval: 1400,
    baseReward: 18,
  },
  {
    enemies: [{ type: 'normal', count: 8 }, { type: 'speed', count: 6 }, { type: 'tank', count: 5 }],
    baseHp: 60,
    baseSpeed: 60,
    spawnInterval: 1200,
    baseReward: 22,
  },
];

export interface GameConfig {
  canvas: {
    width: number;
    height: number;
  };
  tower: {
    size: number;
    sellRefundRate: number; // 0.5 = 50% refund
  };
  projectile: {
    size: number;
    speed: number;
  };
  player: {
    initialLives: number;
    initialGold: number;
  };
  map: MapConfig;
  waves: WaveConfig[];
}

export const CONFIG: GameConfig = {
  canvas: {
    width: 800,
    height: 600,
  },
  tower: {
    size: 30,
    sellRefundRate: 0.5,
  },
  projectile: {
    size: 5,
    speed: 300,
  },
  player: {
    initialLives: 10,
    initialGold: 100,
  },
  map: DEFAULT_MAP,
  waves: DEFAULT_WAVES,
};
