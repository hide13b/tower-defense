import type { Position, TowerType } from '../types';
import { CONFIG } from '../types';
import { Enemy } from './Enemy';
import { direction, distance } from '../utils/math';

export interface ProjectileCallbacks {
  onHit?: (x: number, y: number, damage: number, isAoe: boolean) => void;
  onTrail?: (x: number, y: number, color: string, size: number) => void;
}

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
  private aoeRadius?: number;
  private slowAmount?: number;
  private slowDuration?: number;
  private callbacks: ProjectileCallbacks;
  private trailTimer: number = 0;
  private readonly trailInterval: number = 0.02;

  constructor(
    x: number,
    y: number,
    target: Enemy,
    damage: number,
    towerType: TowerType,
    enemies: Enemy[],
    aoeRadius?: number,
    slowAmount?: number,
    slowDuration?: number,
    callbacks: ProjectileCallbacks = {}
  ) {
    this.x = x;
    this.y = y;
    this.target = target;
    this.damage = damage;
    this.towerType = towerType;
    this.enemies = enemies;
    this.aoeRadius = aoeRadius;
    this.slowAmount = slowAmount;
    this.slowDuration = slowDuration;
    this.callbacks = callbacks;
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

  private getTrailColor(): string {
    switch (this.towerType) {
      case 'cannon':
        return '#ff8844';
      case 'slow':
        return '#88ccff';
      default:
        return '#88ff88';
    }
  }

  update(deltaTime: number): void {
    // Update direction to track target
    if (this.target.active) {
      this.updateDirection();
    }

    this.x += this.dirX * this.speed * deltaTime;
    this.y += this.dirY * this.speed * deltaTime;

    // Create trail particles
    this.trailTimer += deltaTime;
    if (this.trailTimer >= this.trailInterval && this.callbacks.onTrail) {
      this.callbacks.onTrail(
        this.x,
        this.y,
        this.getTrailColor(),
        this.towerType === 'cannon' ? 4 : 2
      );
      this.trailTimer = 0;
    }

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
    if (this.towerType === 'cannon' && this.aoeRadius) {
      // AOE damage
      for (const enemy of this.enemies) {
        if (!enemy.active) continue;
        const dist = distance(this.position, enemy.position);
        if (dist <= this.aoeRadius) {
          enemy.takeDamage(this.damage);
          // Notify hit for each enemy in AOE
          if (this.callbacks.onHit) {
            this.callbacks.onHit(enemy.x, enemy.y, this.damage, true);
          }
        }
      }
    } else if (this.towerType === 'slow' && this.slowAmount && this.slowDuration) {
      // Apply slow and damage
      this.target.takeDamage(this.damage);
      this.target.applySlow(this.slowAmount, this.slowDuration);
      if (this.callbacks.onHit) {
        this.callbacks.onHit(this.target.x, this.target.y, this.damage, false);
      }
    } else {
      // Normal damage
      this.target.takeDamage(this.damage);
      if (this.callbacks.onHit) {
        this.callbacks.onHit(this.target.x, this.target.y, this.damage, false);
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (this.towerType === 'cannon') {
      // Cannon ball - larger, darker with glow
      ctx.shadowColor = '#ff6600';
      ctx.shadowBlur = 8;
      ctx.fillStyle = '#333';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#666';
      ctx.beginPath();
      ctx.arc(this.x - 2, this.y - 2, this.size / 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.towerType === 'slow') {
      // Slow projectile - blue with glow
      ctx.shadowColor = '#4488ff';
      ctx.shadowBlur = 10;
      ctx.fillStyle = '#88ccff';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Inner bright core
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Arrow - green with glow
      ctx.shadowColor = '#44ff44';
      ctx.shadowBlur = 6;
      ctx.fillStyle = '#88ff88';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }
}
