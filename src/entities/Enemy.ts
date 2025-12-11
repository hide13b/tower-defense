import type { Position, EnemyType } from '../types';
import { CONFIG, ENEMY_CONFIGS } from '../types';

export interface EnemySpawnConfig {
  type: EnemyType;
  baseHp: number;
  baseSpeed: number;
  baseReward: number;
}

export class Enemy {
  public x: number;
  public y: number;
  public hp: number;
  public readonly maxHp: number;
  public readonly size: number;
  public readonly baseSpeed: number;
  public currentSpeed: number;
  public readonly reward: number;
  public readonly type: EnemyType;
  public readonly color: string;
  public active: boolean = true;
  public rewarded: boolean = false;

  // Slow effect
  private slowAmount: number = 0;
  private slowTimer: number = 0;

  constructor(x: number, y: number, config: EnemySpawnConfig) {
    const typeConfig = ENEMY_CONFIGS[config.type];

    this.x = x;
    this.y = y;
    this.type = config.type;
    this.hp = Math.floor(config.baseHp * typeConfig.hpMultiplier);
    this.maxHp = this.hp;
    this.size = typeConfig.size;
    this.baseSpeed = config.baseSpeed * typeConfig.speedMultiplier;
    this.currentSpeed = this.baseSpeed;
    this.reward = Math.floor(config.baseReward * typeConfig.rewardMultiplier);
    this.color = typeConfig.color;
  }

  get position(): Position {
    return { x: this.x, y: this.y };
  }

  update(deltaTime: number): void {
    // Update slow effect
    if (this.slowTimer > 0) {
      this.slowTimer -= deltaTime;
      this.currentSpeed = this.baseSpeed * (1 - this.slowAmount);
    } else {
      this.currentSpeed = this.baseSpeed;
      this.slowAmount = 0;
    }

    this.x += this.currentSpeed * deltaTime;
  }

  applySlow(amount: number, duration: number): void {
    // Apply stronger slow if new one is stronger
    if (amount > this.slowAmount) {
      this.slowAmount = amount;
    }
    // Always refresh duration
    this.slowTimer = duration;
  }

  takeDamage(damage: number): void {
    this.hp -= damage;
    if (this.hp <= 0) {
      this.active = false;
    }
  }

  hasReachedGoal(): boolean {
    return this.x >= CONFIG.canvas.width;
  }

  render(ctx: CanvasRenderingContext2D): void {
    // Enemy body
    ctx.fillStyle = this.color;

    if (this.type === 'tank') {
      // Tank is circular
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size / 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.type === 'speed') {
      // Speed is diamond
      ctx.beginPath();
      ctx.moveTo(this.x, this.y - this.size / 2);
      ctx.lineTo(this.x + this.size / 2, this.y);
      ctx.lineTo(this.x, this.y + this.size / 2);
      ctx.lineTo(this.x - this.size / 2, this.y);
      ctx.closePath();
      ctx.fill();
    } else {
      // Normal is square
      ctx.fillRect(
        this.x - this.size / 2,
        this.y - this.size / 2,
        this.size,
        this.size
      );
    }

    // Slow indicator
    if (this.slowTimer > 0) {
      ctx.strokeStyle = '#88ccff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size / 2 + 3, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Health bar background
    const barWidth = this.size + 4;
    const barHeight = 4;
    const barY = this.y - this.size / 2 - 8;

    ctx.fillStyle = '#333';
    ctx.fillRect(this.x - barWidth / 2, barY, barWidth, barHeight);

    // Health bar fill
    const healthPercent = this.hp / this.maxHp;
    ctx.fillStyle = healthPercent > 0.5 ? '#44ff44' : healthPercent > 0.25 ? '#ffff44' : '#ff4444';
    ctx.fillRect(this.x - barWidth / 2, barY, barWidth * healthPercent, barHeight);
  }
}
