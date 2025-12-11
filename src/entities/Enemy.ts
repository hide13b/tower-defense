import type { Position } from '../types';
import { CONFIG } from '../types';

export interface EnemyConfig {
  hp: number;
  speed: number;
  reward: number;
}

export class Enemy {
  public x: number;
  public y: number;
  public hp: number;
  public readonly maxHp: number;
  public readonly size: number;
  public readonly speed: number;
  public readonly reward: number;
  public active: boolean = true;
  public rewarded: boolean = false;

  constructor(x: number, y: number, config?: EnemyConfig) {
    this.x = x;
    this.y = y;
    this.hp = config?.hp ?? CONFIG.enemy.baseHp;
    this.maxHp = this.hp;
    this.size = CONFIG.enemy.size;
    this.speed = config?.speed ?? CONFIG.enemy.baseSpeed;
    this.reward = config?.reward ?? CONFIG.enemy.baseReward;
  }

  get position(): Position {
    return { x: this.x, y: this.y };
  }

  update(deltaTime: number): void {
    this.x += this.speed * deltaTime;
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
    ctx.fillStyle = '#ff4444';
    ctx.fillRect(
      this.x - this.size / 2,
      this.y - this.size / 2,
      this.size,
      this.size
    );

    // Health bar background
    const barWidth = this.size;
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
