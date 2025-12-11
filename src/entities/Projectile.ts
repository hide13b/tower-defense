import type { Position, TowerType } from '../types';
import { CONFIG, TOWER_CONFIGS } from '../types';
import { Enemy } from './Enemy';
import { direction, distance } from '../utils/math';

export class Projectile {
  public x: number;
  public y: number;
  public readonly size: number;
  public readonly speed: number;
  public readonly damage: number;
  public readonly towerType: TowerType;
  public active: boolean = true;
  private target: Enemy;
  private dirX: number = 0;
  private dirY: number = 0;
  private enemies: Enemy[];

  constructor(x: number, y: number, target: Enemy, damage: number, towerType: TowerType, enemies: Enemy[]) {
    this.x = x;
    this.y = y;
    this.target = target;
    this.damage = damage;
    this.towerType = towerType;
    this.enemies = enemies;
    this.size = towerType === 'cannon' ? 8 : CONFIG.projectile.size;
    this.speed = towerType === 'cannon' ? 200 : CONFIG.projectile.speed;
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
    const hitDistance = this.size + this.target.size / 2;
    if (this.target.active && distance(this.position, this.target.position) < hitDistance) {
      this.onHit();
      this.active = false;
    }

    // Deactivate if off screen
    if (this.x < 0 || this.x > CONFIG.canvas.width || this.y < 0 || this.y > CONFIG.canvas.height) {
      this.active = false;
    }
  }

  private onHit(): void {
    const config = TOWER_CONFIGS[this.towerType];

    if (this.towerType === 'cannon' && config.aoeRadius) {
      // AOE damage
      for (const enemy of this.enemies) {
        if (!enemy.active) continue;
        const dist = distance(this.position, enemy.position);
        if (dist <= config.aoeRadius) {
          enemy.takeDamage(this.damage);
        }
      }
    } else if (this.towerType === 'slow' && config.slowAmount && config.slowDuration) {
      // Apply slow and damage
      this.target.takeDamage(this.damage);
      this.target.applySlow(config.slowAmount, config.slowDuration);
    } else {
      // Normal damage
      this.target.takeDamage(this.damage);
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (this.towerType === 'cannon') {
      // Cannon ball - larger, darker
      ctx.fillStyle = '#333';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#666';
      ctx.beginPath();
      ctx.arc(this.x - 2, this.y - 2, this.size / 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.towerType === 'slow') {
      // Slow projectile - blue
      ctx.fillStyle = '#88ccff';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Arrow - green
      ctx.fillStyle = '#88ff88';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
