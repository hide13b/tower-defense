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
  private animationTime: number = 0;

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
    // Update animation
    this.animationTime += deltaTime;

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
    ctx.save();
    ctx.translate(this.x, this.y);

    if (this.towerType === 'cannon') {
      this.renderCannonBall(ctx);
    } else if (this.towerType === 'slow') {
      this.renderMagicOrb(ctx);
    } else {
      this.renderArrow(ctx);
    }

    ctx.restore();
  }

  private renderArrow(ctx: CanvasRenderingContext2D): void {
    // Rotate to face direction
    const angle = Math.atan2(this.dirY, this.dirX);
    ctx.rotate(angle);

    // Arrow glow
    ctx.shadowColor = '#44ff44';
    ctx.shadowBlur = 8;

    // Arrow body
    const gradient = ctx.createLinearGradient(-this.size * 2, 0, this.size, 0);
    gradient.addColorStop(0, 'rgba(136, 255, 136, 0)');
    gradient.addColorStop(0.5, '#88ff88');
    gradient.addColorStop(1, '#44cc44');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(this.size, 0);
    ctx.lineTo(-this.size, -this.size / 2);
    ctx.lineTo(-this.size / 2, 0);
    ctx.lineTo(-this.size, this.size / 2);
    ctx.closePath();
    ctx.fill();

    // Sparkle
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(this.size / 2, 0, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
  }

  private renderCannonBall(ctx: CanvasRenderingContext2D): void {
    const pulse = 1 + Math.sin(this.animationTime * 20) * 0.1;

    // Outer glow
    ctx.shadowColor = '#ff6600';
    ctx.shadowBlur = 12;

    // Main ball
    const gradient = ctx.createRadialGradient(
      -this.size / 3,
      -this.size / 3,
      0,
      0,
      0,
      this.size * pulse
    );
    gradient.addColorStop(0, '#666');
    gradient.addColorStop(0.6, '#333');
    gradient.addColorStop(1, '#111');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, this.size * pulse, 0, Math.PI * 2);
    ctx.fill();

    // Fire trail effect
    ctx.shadowBlur = 0;
    const fireGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.size * 0.6);
    fireGradient.addColorStop(0, 'rgba(255, 200, 100, 0.8)');
    fireGradient.addColorStop(1, 'rgba(255, 100, 0, 0)');
    ctx.fillStyle = fireGradient;
    ctx.beginPath();
    ctx.arc(0, 0, this.size * 0.6, 0, Math.PI * 2);
    ctx.fill();

    // Highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.arc(-this.size / 3, -this.size / 3, this.size / 3, 0, Math.PI * 2);
    ctx.fill();
  }

  private renderMagicOrb(ctx: CanvasRenderingContext2D): void {
    const pulse = 1 + Math.sin(this.animationTime * 15) * 0.15;
    const rotation = this.animationTime * 5;

    // Outer aura
    ctx.shadowColor = '#88ccff';
    ctx.shadowBlur = 15;

    // Aura rings
    ctx.strokeStyle = 'rgba(136, 204, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, this.size * 1.5 * pulse, 0, Math.PI * 2);
    ctx.stroke();

    // Main orb
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.size * pulse);
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.3, '#aaddff');
    gradient.addColorStop(0.7, '#6699ff');
    gradient.addColorStop(1, '#4466cc');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, this.size * pulse, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;

    // Snowflake pattern
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3 + rotation;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(
        Math.cos(angle) * this.size * 0.7,
        Math.sin(angle) * this.size * 0.7
      );
      ctx.stroke();
    }

    // Center sparkle
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(0, 0, this.size / 3, 0, Math.PI * 2);
    ctx.fill();
  }
}
