import { CONFIG, TOWER_CONFIGS } from '../types';
import type { WaveConfig, TowerType, EnemyType, PathPoint } from '../types';
import type { ProjectileCallbacks } from '../entities/Projectile';
import { Tower } from '../entities/Tower';
import { Enemy } from '../entities/Enemy';
import { Projectile } from '../entities/Projectile';
import { distance } from '../utils/math';
import { soundManager } from '../systems/SoundManager';
import { visualEffects } from '../systems/VisualEffects';

type GameState = 'waiting' | 'playing' | 'paused' | 'gameover' | 'victory';

interface SpawnQueue {
  type: EnemyType;
  remaining: number;
}

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
  private spawnQueue: SpawnQueue[] = [];
  private currentSpawnIndex: number = 0;

  // Tower selection
  private selectedTowerType: TowerType = 'archer';
  private selectedTower: Tower | null = null;

  // Path
  private path: PathPoint[];

  // UI Elements
  private waveElement: HTMLElement;
  private livesElement: HTMLElement;
  private goldElement: HTMLElement;
  private startButton: HTMLButtonElement;
  private towerButtons: NodeListOf<HTMLButtonElement>;
  private upgradeButton: HTMLButtonElement;
  private sellButton: HTMLButtonElement;
  private towerInfoPanel: HTMLElement;

  // Projectile callbacks for effects
  private projectileCallbacks: ProjectileCallbacks;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;

    canvas.width = CONFIG.canvas.width;
    canvas.height = CONFIG.canvas.height;

    this.lives = CONFIG.player.initialLives;
    this.gold = CONFIG.player.initialGold;
    this.path = CONFIG.map.path;

    this.waveElement = document.getElementById('wave')!;
    this.livesElement = document.getElementById('lives')!;
    this.goldElement = document.getElementById('gold')!;
    this.startButton = document.getElementById('start-btn') as HTMLButtonElement;
    this.towerButtons = document.querySelectorAll('.tower-btn') as NodeListOf<HTMLButtonElement>;
    this.upgradeButton = document.getElementById('upgrade-btn') as HTMLButtonElement;
    this.sellButton = document.getElementById('sell-btn') as HTMLButtonElement;
    this.towerInfoPanel = document.getElementById('tower-info') as HTMLElement;

    // Setup projectile callbacks
    this.projectileCallbacks = {
      onHit: (x, y, damage, isAoe) => {
        visualEffects.createDamagePopup(x, y, damage, damage >= 30);
        if (isAoe) {
          visualEffects.createExplosion(x, y, 50, '#ff8800');
          soundManager.play('explosion');
        } else {
          soundManager.play('hit');
        }
      },
      onTrail: (x, y, color, size) => {
        visualEffects.createTrailParticle(x, y, color, size);
      },
    };

    this.setupEventListeners();
    this.updateUI();
  }

  private setupEventListeners(): void {
    this.canvas.addEventListener('click', (e) => this.handleClick(e));
    this.startButton.addEventListener('click', () => this.handleStartButton());

    this.towerButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const type = btn.dataset.tower as TowerType;
        this.selectTowerType(type);
      });
    });

    this.upgradeButton?.addEventListener('click', () => this.upgradeTower());
    this.sellButton?.addEventListener('click', () => this.sellTower());
  }

  private selectTowerType(type: TowerType): void {
    this.selectedTowerType = type;
    this.selectedTower = null;
    this.towerButtons.forEach((btn) => {
      btn.classList.toggle('selected', btn.dataset.tower === type);
    });
    this.updateTowerInfoPanel();
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
    this.spawnTimer = 0;
    this.startButton.textContent = 'Pause';

    // Build spawn queue from wave config
    const waveConfig = this.getCurrentWaveConfig();
    this.spawnQueue = waveConfig.enemies.map((e) => ({
      type: e.type,
      remaining: e.count,
    }));
    this.currentSpawnIndex = 0;

    // Play wave start sound and show announcement
    soundManager.play('wave_start');
    visualEffects.createWaveAnnouncement(this.currentWave + 1);

    this.updateUI();
  }

  private handleClick(e: MouseEvent): void {
    if (this.state === 'gameover' || this.state === 'victory') return;

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if clicked on existing tower
    for (const tower of this.towers) {
      const dist = distance({ x, y }, tower.position);
      if (dist <= tower.size / 2 + 5) {
        this.selectTower(tower);
        return;
      }
    }

    // Deselect tower if clicking elsewhere
    this.selectedTower = null;
    this.updateTowerInfoPanel();

    // Check if click is on the path
    if (this.isOnPath(x, y)) {
      return; // Can't place tower on path
    }

    const towerConfig = TOWER_CONFIGS[this.selectedTowerType];

    // Check if we have enough gold
    if (this.gold < towerConfig.cost) {
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

    this.gold -= towerConfig.cost;
    this.towers.push(new Tower(x, y, this.selectedTowerType));
    soundManager.play('tower_place');
    this.updateUI();
  }

  private isOnPath(x: number, y: number): boolean {
    const pathWidth = CONFIG.map.pathWidth;
    const halfWidth = pathWidth / 2;

    for (let i = 0; i < this.path.length - 1; i++) {
      const start = this.path[i];
      const end = this.path[i + 1];

      // Calculate distance from point to line segment
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const length = Math.sqrt(dx * dx + dy * dy);

      if (length === 0) continue;

      // Project point onto line
      const t = Math.max(0, Math.min(1, ((x - start.x) * dx + (y - start.y) * dy) / (length * length)));
      const projX = start.x + t * dx;
      const projY = start.y + t * dy;

      const distToLine = Math.sqrt((x - projX) * (x - projX) + (y - projY) * (y - projY));

      if (distToLine <= halfWidth + CONFIG.tower.size / 2) {
        return true;
      }
    }

    return false;
  }

  private selectTower(tower: Tower): void {
    this.selectedTower = tower;
    this.towerButtons.forEach((btn) => btn.classList.remove('selected'));
    this.updateTowerInfoPanel();
  }

  private updateTowerInfoPanel(): void {
    if (!this.towerInfoPanel) return;

    if (this.selectedTower) {
      const tower = this.selectedTower;
      const config = TOWER_CONFIGS[tower.type];

      this.towerInfoPanel.style.display = 'block';
      this.towerInfoPanel.innerHTML = `
        <div class="tower-info-header">${config.name} Lv.${tower.level}</div>
        <div class="tower-info-stats">
          <div>Damage: ${tower.damage}</div>
          <div>Range: ${tower.range}</div>
          <div>Sell: ${tower.sellValue}G</div>
        </div>
      `;

      if (this.upgradeButton) {
        if (tower.canUpgrade) {
          this.upgradeButton.style.display = 'block';
          this.upgradeButton.textContent = `Upgrade (${tower.upgradeCost}G)`;
          this.upgradeButton.disabled = this.gold < tower.upgradeCost;
        } else {
          this.upgradeButton.style.display = 'none';
        }
      }

      if (this.sellButton) {
        this.sellButton.style.display = 'block';
        this.sellButton.textContent = `Sell (${tower.sellValue}G)`;
      }
    } else {
      this.towerInfoPanel.style.display = 'none';
      if (this.upgradeButton) this.upgradeButton.style.display = 'none';
      if (this.sellButton) this.sellButton.style.display = 'none';
    }
  }

  private upgradeTower(): void {
    if (!this.selectedTower || !this.selectedTower.canUpgrade) return;

    const cost = this.selectedTower.upgradeCost;
    if (this.gold < cost) return;

    this.gold -= cost;
    this.selectedTower.upgrade();
    soundManager.play('tower_upgrade');
    this.updateUI();
    this.updateTowerInfoPanel();
  }

  private sellTower(): void {
    if (!this.selectedTower) return;

    this.gold += this.selectedTower.sellValue;
    this.towers = this.towers.filter((t) => t !== this.selectedTower);
    this.selectedTower = null;
    soundManager.play('tower_sell');
    this.updateUI();
    this.updateTowerInfoPanel();
  }

  private updateUI(): void {
    const totalWaves = CONFIG.waves.length;
    this.waveElement.textContent = `Wave: ${this.currentWave + 1}/${totalWaves}`;
    this.livesElement.textContent = `Lives: ${this.lives}`;
    this.goldElement.textContent = `Gold: ${this.gold}`;
    this.updateTowerInfoPanel();
  }

  private getCurrentWaveConfig(): WaveConfig {
    return CONFIG.waves[this.currentWave];
  }

  private spawnEnemy(): void {
    if (this.currentSpawnIndex >= this.spawnQueue.length) return;

    const current = this.spawnQueue[this.currentSpawnIndex];
    if (current.remaining <= 0) {
      this.currentSpawnIndex++;
      if (this.currentSpawnIndex < this.spawnQueue.length) {
        this.spawnEnemy();
      }
      return;
    }

    const waveConfig = this.getCurrentWaveConfig();
    const enemy = new Enemy(this.path, {
      type: current.type,
      baseHp: waveConfig.baseHp,
      baseSpeed: waveConfig.baseSpeed,
      baseReward: waveConfig.baseReward,
    });
    this.enemies.push(enemy);
    current.remaining--;
  }

  private getTotalEnemiesRemaining(): number {
    return this.spawnQueue.reduce((sum, q) => sum + q.remaining, 0);
  }

  private checkWaveComplete(): boolean {
    return (
      this.getTotalEnemiesRemaining() === 0 &&
      this.enemies.every((e) => !e.active)
    );
  }

  private nextWave(): void {
    this.currentWave++;

    soundManager.play('wave_complete');

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
    // Always update visual effects
    visualEffects.update(deltaTime);

    if (this.state !== 'playing') return;

    // Don't process game logic during wave announcement
    if (visualEffects.isWaveAnnouncementActive()) return;

    const waveConfig = this.getCurrentWaveConfig();

    // Spawn enemies
    if (this.getTotalEnemiesRemaining() > 0) {
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
        soundManager.play('enemy_reach');
        this.updateUI();

        if (this.lives <= 0) {
          this.gameOver();
          return;
        }
      }
    }

    // Update towers with projectile callbacks
    for (const tower of this.towers) {
      const oldProjectileCount = this.projectiles.length;
      tower.update(deltaTime, this.enemies, this.projectiles, this.projectileCallbacks);

      // Play shoot sound if new projectile was created
      if (this.projectiles.length > oldProjectileCount) {
        const towerType = tower.type;
        if (towerType === 'cannon') {
          soundManager.play('shoot_cannon');
        } else if (towerType === 'slow') {
          soundManager.play('shoot_slow');
        } else {
          soundManager.play('shoot_arrow');
        }
      }
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
        soundManager.play('enemy_die');
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
    ctx.fillStyle = '#2a3a2a';
    ctx.fillRect(0, 0, CONFIG.canvas.width, CONFIG.canvas.height);

    // Draw path
    this.renderPath();

    // Draw towers
    for (const tower of this.towers) {
      tower.render(ctx, tower === this.selectedTower);
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

    // Draw visual effects (trails, explosions, damage popups)
    visualEffects.render(ctx, CONFIG.canvas.width, CONFIG.canvas.height);

    // Draw wave info during waiting state (only if no announcement active)
    if (this.state === 'waiting' && this.currentWave < CONFIG.waves.length && !visualEffects.isWaveAnnouncementActive()) {
      const waveConfig = this.getCurrentWaveConfig();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, CONFIG.canvas.width, CONFIG.canvas.height);

      ctx.fillStyle = '#88aaff';
      ctx.font = 'bold 36px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        `Wave ${this.currentWave + 1}`,
        CONFIG.canvas.width / 2,
        CONFIG.canvas.height / 2 - 60
      );

      ctx.fillStyle = '#fff';
      ctx.font = '18px sans-serif';

      const enemyInfo = waveConfig.enemies
        .map((e) => `${e.type}: ${e.count}`)
        .join(' | ');
      ctx.fillText(enemyInfo, CONFIG.canvas.width / 2, CONFIG.canvas.height / 2 - 20);

      ctx.fillStyle = '#aaa';
      ctx.font = '16px sans-serif';
      ctx.fillText(
        'Select tower type and click to place',
        CONFIG.canvas.width / 2,
        CONFIG.canvas.height / 2 + 20
      );
      ctx.fillText(
        'Then click "Start Wave"',
        CONFIG.canvas.width / 2,
        CONFIG.canvas.height / 2 + 45
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

  private renderPath(): void {
    const ctx = this.ctx;
    const pathWidth = CONFIG.map.pathWidth;

    // Draw path segments
    ctx.strokeStyle = '#c2b280';
    ctx.lineWidth = pathWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(this.path[0].x, this.path[0].y);
    for (let i = 1; i < this.path.length; i++) {
      ctx.lineTo(this.path[i].x, this.path[i].y);
    }
    ctx.stroke();

    // Draw path border
    ctx.strokeStyle = '#8a7a50';
    ctx.lineWidth = pathWidth + 4;
    ctx.globalCompositeOperation = 'destination-over';
    ctx.beginPath();
    ctx.moveTo(this.path[0].x, this.path[0].y);
    for (let i = 1; i < this.path.length; i++) {
      ctx.lineTo(this.path[i].x, this.path[i].y);
    }
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';

    // Draw start marker
    ctx.fillStyle = '#44ff44';
    ctx.beginPath();
    ctx.arc(this.path[0].x, this.path[0].y, 15, 0, Math.PI * 2);
    ctx.fill();

    // Draw end marker
    ctx.fillStyle = '#ff4444';
    ctx.beginPath();
    ctx.arc(this.path[this.path.length - 1].x, this.path[this.path.length - 1].y, 15, 0, Math.PI * 2);
    ctx.fill();
  }

  private gameOver(): void {
    this.state = 'gameover';
    this.startButton.disabled = true;
    this.startButton.textContent = 'Game Over';

    soundManager.play('game_over');

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

    soundManager.play('victory');

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
    this.spawnQueue = [];
    this.currentSpawnIndex = 0;
    this.spawnTimer = 0;
    this.state = 'waiting';
    this.selectedTower = null;
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
