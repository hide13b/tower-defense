import { CONFIG } from '../types';
import type { WaveConfig } from '../types';
import { Tower } from '../entities/Tower';
import { Enemy } from '../entities/Enemy';
import { Projectile } from '../entities/Projectile';

type GameState = 'waiting' | 'playing' | 'paused' | 'gameover' | 'victory';

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private towers: Tower[] = [];
  private enemies: Enemy[] = [];
  private projectiles: Projectile[] = [];
  private lives: number;
  private gold: number;
  private lastTime: number = 0;
  private spawnTimer: number = 0;
  private state: GameState = 'waiting';

  // Wave system
  private currentWave: number = 0;
  private enemiesSpawned: number = 0;
  private enemiesKilled: number = 0;

  // UI Elements
  private waveElement: HTMLElement;
  private livesElement: HTMLElement;
  private goldElement: HTMLElement;
  private startButton: HTMLButtonElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;

    canvas.width = CONFIG.canvas.width;
    canvas.height = CONFIG.canvas.height;

    this.lives = CONFIG.player.initialLives;
    this.gold = CONFIG.player.initialGold;

    this.waveElement = document.getElementById('wave')!;
    this.livesElement = document.getElementById('lives')!;
    this.goldElement = document.getElementById('gold')!;
    this.startButton = document.getElementById('start-btn') as HTMLButtonElement;

    this.setupEventListeners();
    this.updateUI();
  }

  private setupEventListeners(): void {
    this.canvas.addEventListener('click', (e) => this.handleClick(e));
    this.startButton.addEventListener('click', () => this.handleStartButton());
  }

  private handleStartButton(): void {
    if (this.state === 'waiting') {
      this.startWave();
    } else if (this.state === 'playing') {
      this.state = 'paused';
      this.startButton.textContent = 'Resume';
    } else if (this.state === 'paused') {
      this.state = 'playing';
      this.startButton.textContent = 'Pause';
    }
  }

  private startWave(): void {
    this.state = 'playing';
    this.enemiesSpawned = 0;
    this.spawnTimer = 0;
    this.startButton.textContent = 'Pause';
    this.updateUI();
  }

  private handleClick(e: MouseEvent): void {
    if (this.state === 'gameover' || this.state === 'victory') return;

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if click is on the path
    const pathTop = CONFIG.path.y - CONFIG.path.width / 2;
    const pathBottom = CONFIG.path.y + CONFIG.path.width / 2;

    if (y >= pathTop && y <= pathBottom) {
      return; // Can't place tower on path
    }

    // Check if we have enough gold
    if (this.gold < CONFIG.tower.cost) {
      return;
    }

    // Check if too close to another tower
    for (const tower of this.towers) {
      const dx = tower.x - x;
      const dy = tower.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < CONFIG.tower.size) {
        return;
      }
    }

    this.gold -= CONFIG.tower.cost;
    this.towers.push(new Tower(x, y));
    this.updateUI();
  }

  private updateUI(): void {
    const totalWaves = CONFIG.waves.length;
    this.waveElement.textContent = `Wave: ${this.currentWave + 1}/${totalWaves}`;
    this.livesElement.textContent = `Lives: ${this.lives}`;
    this.goldElement.textContent = `Gold: ${this.gold}`;
  }

  private getCurrentWaveConfig(): WaveConfig {
    return CONFIG.waves[this.currentWave];
  }

  private spawnEnemy(): void {
    const waveConfig = this.getCurrentWaveConfig();
    const enemy = new Enemy(0, CONFIG.path.y, {
      hp: waveConfig.enemyHp,
      speed: waveConfig.enemySpeed,
      reward: waveConfig.reward,
    });
    this.enemies.push(enemy);
    this.enemiesSpawned++;
  }

  private checkWaveComplete(): boolean {
    const waveConfig = this.getCurrentWaveConfig();
    return (
      this.enemiesSpawned >= waveConfig.enemyCount &&
      this.enemies.every((e) => !e.active)
    );
  }

  private nextWave(): void {
    this.currentWave++;
    this.enemiesKilled = 0;

    if (this.currentWave >= CONFIG.waves.length) {
      this.victory();
      return;
    }

    this.state = 'waiting';
    this.startButton.textContent = 'Start Wave';
    this.startButton.disabled = false;
    this.updateUI();
  }

  private update(deltaTime: number): void {
    if (this.state !== 'playing') return;

    const waveConfig = this.getCurrentWaveConfig();

    // Spawn enemies
    if (this.enemiesSpawned < waveConfig.enemyCount) {
      this.spawnTimer += deltaTime * 1000;
      if (this.spawnTimer >= waveConfig.spawnInterval) {
        this.spawnEnemy();
        this.spawnTimer = 0;
      }
    }

    // Update enemies
    for (const enemy of this.enemies) {
      if (!enemy.active) continue;
      enemy.update(deltaTime);

      if (enemy.hasReachedGoal()) {
        enemy.active = false;
        this.lives--;
        this.updateUI();

        if (this.lives <= 0) {
          this.gameOver();
          return;
        }
      }
    }

    // Update towers
    for (const tower of this.towers) {
      tower.update(deltaTime, this.enemies, this.projectiles);
    }

    // Update projectiles
    for (const projectile of this.projectiles) {
      if (!projectile.active) continue;
      projectile.update(deltaTime);
    }

    // Check for killed enemies and give rewards
    for (const enemy of this.enemies) {
      if (!enemy.active && enemy.hp <= 0 && !enemy.rewarded) {
        enemy.rewarded = true;
        this.gold += enemy.reward;
        this.enemiesKilled++;
        this.updateUI();
      }
    }

    // Clean up inactive entities
    this.enemies = this.enemies.filter((e) => e.active);
    this.projectiles = this.projectiles.filter((p) => p.active);

    // Check wave completion
    if (this.checkWaveComplete()) {
      this.nextWave();
    }
  }

  private render(): void {
    const ctx = this.ctx;

    // Clear canvas
    ctx.fillStyle = '#333';
    ctx.fillRect(0, 0, CONFIG.canvas.width, CONFIG.canvas.height);

    // Draw path
    ctx.fillStyle = '#c2b280';
    ctx.fillRect(
      0,
      CONFIG.path.y - CONFIG.path.width / 2,
      CONFIG.canvas.width,
      CONFIG.path.width
    );

    // Draw start and end markers
    ctx.fillStyle = '#44ff44';
    ctx.fillRect(0, CONFIG.path.y - CONFIG.path.width / 2, 10, CONFIG.path.width);

    ctx.fillStyle = '#ff4444';
    ctx.fillRect(
      CONFIG.canvas.width - 10,
      CONFIG.path.y - CONFIG.path.width / 2,
      10,
      CONFIG.path.width
    );

    // Draw towers
    for (const tower of this.towers) {
      tower.render(ctx);
    }

    // Draw enemies
    for (const enemy of this.enemies) {
      if (enemy.active) {
        enemy.render(ctx);
      }
    }

    // Draw projectiles
    for (const projectile of this.projectiles) {
      if (projectile.active) {
        projectile.render(ctx);
      }
    }

    // Draw wave info during waiting state
    if (this.state === 'waiting' && this.currentWave < CONFIG.waves.length) {
      const waveConfig = this.getCurrentWaveConfig();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, CONFIG.canvas.width, CONFIG.canvas.height);

      ctx.fillStyle = '#88aaff';
      ctx.font = 'bold 36px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        `Wave ${this.currentWave + 1}`,
        CONFIG.canvas.width / 2,
        CONFIG.canvas.height / 2 - 40
      );

      ctx.fillStyle = '#fff';
      ctx.font = '20px sans-serif';
      ctx.fillText(
        `Enemies: ${waveConfig.enemyCount} | HP: ${waveConfig.enemyHp}`,
        CONFIG.canvas.width / 2,
        CONFIG.canvas.height / 2
      );

      ctx.fillStyle = '#aaa';
      ctx.font = '16px sans-serif';
      ctx.fillText(
        'Place towers and click "Start Wave"',
        CONFIG.canvas.width / 2,
        CONFIG.canvas.height / 2 + 40
      );
    }

    // Draw paused overlay
    if (this.state === 'paused') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, CONFIG.canvas.width, CONFIG.canvas.height);

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 48px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('PAUSED', CONFIG.canvas.width / 2, CONFIG.canvas.height / 2);
    }
  }

  private gameOver(): void {
    this.state = 'gameover';
    this.startButton.disabled = true;
    this.startButton.textContent = 'Game Over';

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(0, 0, CONFIG.canvas.width, CONFIG.canvas.height);

    this.ctx.fillStyle = '#ff4444';
    this.ctx.font = 'bold 48px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('GAME OVER', CONFIG.canvas.width / 2, CONFIG.canvas.height / 2);

    this.ctx.fillStyle = '#fff';
    this.ctx.font = '24px sans-serif';
    this.ctx.fillText(
      'Click to restart',
      CONFIG.canvas.width / 2,
      CONFIG.canvas.height / 2 + 50
    );

    this.canvas.addEventListener('click', () => this.restart(), { once: true });
  }

  private victory(): void {
    this.state = 'victory';
    this.startButton.disabled = true;
    this.startButton.textContent = 'Victory!';

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(0, 0, CONFIG.canvas.width, CONFIG.canvas.height);

    this.ctx.fillStyle = '#44ff44';
    this.ctx.font = 'bold 48px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('VICTORY!', CONFIG.canvas.width / 2, CONFIG.canvas.height / 2);

    this.ctx.fillStyle = '#fff';
    this.ctx.font = '24px sans-serif';
    this.ctx.fillText(
      `Final Gold: ${this.gold} | Lives: ${this.lives}`,
      CONFIG.canvas.width / 2,
      CONFIG.canvas.height / 2 + 50
    );

    this.ctx.fillText(
      'Click to play again',
      CONFIG.canvas.width / 2,
      CONFIG.canvas.height / 2 + 90
    );

    this.canvas.addEventListener('click', () => this.restart(), { once: true });
  }

  private restart(): void {
    this.towers = [];
    this.enemies = [];
    this.projectiles = [];
    this.lives = CONFIG.player.initialLives;
    this.gold = CONFIG.player.initialGold;
    this.currentWave = 0;
    this.enemiesSpawned = 0;
    this.enemiesKilled = 0;
    this.spawnTimer = 0;
    this.state = 'waiting';
    this.startButton.disabled = false;
    this.startButton.textContent = 'Start Wave';
    this.updateUI();
  }

  public start(): void {
    this.lastTime = performance.now();
    this.gameLoop();
  }

  private gameLoop = (): void => {
    const currentTime = performance.now();
    const deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    this.update(deltaTime);
    this.render();

    requestAnimationFrame(this.gameLoop);
  };
}
