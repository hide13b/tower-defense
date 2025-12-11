export interface Position {
  x: number;
  y: number;
}

export interface WaveConfig {
  enemyCount: number;
  enemyHp: number;
  enemySpeed: number;
  spawnInterval: number;
  reward: number;
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
    range: number;
    fireRate: number;
    damage: number;
    cost: number;
  };
  enemy: {
    size: number;
    baseSpeed: number;
    baseHp: number;
    baseReward: number;
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
    range: 100,
    fireRate: 1,
    damage: 10,
    cost: 50,
  },
  enemy: {
    size: 20,
    baseSpeed: 50,
    baseHp: 30,
    baseReward: 10,
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
    { enemyCount: 5, enemyHp: 30, enemySpeed: 50, spawnInterval: 2000, reward: 10 },
    { enemyCount: 8, enemyHp: 40, enemySpeed: 55, spawnInterval: 1800, reward: 12 },
    { enemyCount: 10, enemyHp: 50, enemySpeed: 60, spawnInterval: 1600, reward: 15 },
    { enemyCount: 12, enemyHp: 70, enemySpeed: 65, spawnInterval: 1400, reward: 18 },
    { enemyCount: 15, enemyHp: 100, enemySpeed: 70, spawnInterval: 1200, reward: 25 },
  ],
};
