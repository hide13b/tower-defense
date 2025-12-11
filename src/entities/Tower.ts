import type { Position } from '../types';
import { CONFIG } from '../types';
import { Enemy } from './Enemy';
import { Projectile } from './Projectile';
import { distance } from '../utils/math';

export class Tower {
  public readonly x: number;
  public readonly y: number;
  public readonly size: number;
  public readonly range: number;
  public readonly damage: number;
  private fireRate: number;
  private fireCooldown: number = 0;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.size = CONFIG.tower.size;
    this.range = CONFIG.tower.range;
    this.damage = CONFIG.tower.damage;
    this.fireRate = CONFIG.tower.fireRate;
  }

  get position(): Position {
    return { x: this.x, y: this.y };
  }

  update(deltaTime: number, enemies: Enemy[], projectiles: Projectile[]): void {
    this.fireCooldown -= deltaTime;

    if (this.fireCooldown <= 0) {
      const target = this.findTarget(enemies);
      if (target) {
        this.fire(target, projectiles);
        this.fireCooldown = 1 / this.fireRate;
      }
    }
  }

  private findTarget(enemies: Enemy[]): Enemy | null {
    let closest: Enemy | null = null;
    let closestDist = Infinity;

    for (const enemy of enemies) {
      if (!enemy.active) continue;

      const dist = distance(this.position, enemy.position);
      if (dist <= this.range && dist < closestDist) {
        closest = enemy;
        closestDist = dist;
      }
    }

    return closest;
  }

  private fire(target: Enemy, projectiles: Projectile[]): void {
    const projectile = new Projectile(this.x, this.y, target, this.damage);
    projectiles.push(projectile);
  }

  render(ctx: CanvasRenderingContext2D): void {
    // Range indicator (subtle)
    ctx.strokeStyle = 'rgba(68, 136, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.range, 0, Math.PI * 2);
    ctx.stroke();

    // Tower body
    ctx.fillStyle = '#4488ff';
    ctx.fillRect(
      this.x - this.size / 2,
      this.y - this.size / 2,
      this.size,
      this.size
    );

    // Tower top
    ctx.fillStyle = '#2266dd';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size / 3, 0, Math.PI * 2);
    ctx.fill();
  }
}
