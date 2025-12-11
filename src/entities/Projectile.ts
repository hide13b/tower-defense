import type { Position } from '../types';
import { CONFIG } from '../types';
import { Enemy } from './Enemy';
import { direction, distance } from '../utils/math';

export class Projectile {
  public x: number;
  public y: number;
  public readonly size: number;
  public readonly speed: number;
  public readonly damage: number;
  public active: boolean = true;
  private target: Enemy;
  private dirX: number = 0;
  private dirY: number = 0;

  constructor(x: number, y: number, target: Enemy, damage: number) {
    this.x = x;
    this.y = y;
    this.target = target;
    this.damage = damage;
    this.size = CONFIG.projectile.size;
    this.speed = CONFIG.projectile.speed;
    this.updateDirection();
  }

  get position(): Position {
    return { x: this.x, y: this.y };
  }

  private updateDirection(): void {
    if (this.target.active) {
      const dir = direction(this.position, this.target.position);
      this.dirX = dir.x;
      this.dirY = dir.y;
    }
  }

  update(deltaTime: number): void {
    // Update direction to track target
    if (this.target.active) {
      this.updateDirection();
    }

    this.x += this.dirX * this.speed * deltaTime;
    this.y += this.dirY * this.speed * deltaTime;

    // Check collision with target
    if (this.target.active && distance(this.position, this.target.position) < this.size + this.target.size / 2) {
      this.target.takeDamage(this.damage);
      this.active = false;
    }

    // Deactivate if off screen
    if (this.x < 0 || this.x > CONFIG.canvas.width || this.y < 0 || this.y > CONFIG.canvas.height) {
      this.active = false;
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#ffff00';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
  }
}
