export interface Position {
  x: number;
  y: number;
}

// Tower types
export type TowerType = 'archer' | 'cannon' | 'slow';

export interface TowerConfig {
  name: string;
  cost: number;
  range: number;
  damage: number;
  fireRate: number;
  color: string;
  secondaryColor: string;
  aoeRadius?: number;  // For cannon
  slowAmount?: number; // For slow tower (0-1)
  slowDuration?: number; // seconds
}

export const TOWER_CONFIGS: Record<TowerType, TowerConfig> = {
  archer: {
    name: 'Archer',
    cost: 30,
    range: 120,
    damage: 15,
    fireRate: 1.5,
    color: '#44aa44',
    secondaryColor: '#228822',
  },
  cannon: {
    name: 'Cannon',
    cost: 80,
    range: 80,
    damage: 40,
    fireRate: 0.5,
    color: '#aa4444',
    secondaryColor: '#882222',
    aoeRadius: 50,
  },
  slow: {
    name: 'Slow',
    cost: 50,
    range: 100,
    damage: 5,
    fireRate: 1,
    color: '#4488cc',
    secondaryColor: '#226699',
    slowAmount: 0.5,
    slowDuration: 2,
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

export interface GameConfig {
  canvas: {
    width: number;
    height: number;
  };
  path: {
    y: number;
    width: number;
  };
  tower: {
    size: number;
  };
  projectile: {
    size: number;
    speed: number;
  };
  player: {
    initialLives: number;
    initialGold: number;
  };
  waves: WaveConfig[];
}

export const CONFIG: GameConfig = {
  canvas: {
    width: 800,
    height: 600,
  },
  path: {
    y: 300,
    width: 40,
  },
  tower: {
    size: 30,
  },
  projectile: {
    size: 5,
    speed: 300,
  },
  player: {
    initialLives: 10,
    initialGold: 100,
  },
  waves: [
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
  ],
};
