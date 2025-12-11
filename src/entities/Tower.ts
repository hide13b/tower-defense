import type { Position, TowerType, TowerLevelStats } from '../types';
import { CONFIG, TOWER_CONFIGS } from '../types';
import { Enemy } from './Enemy';
import { Projectile } from './Projectile';
import { distance } from '../utils/math';

export class Tower {
  public readonly x: number;
  public readonly y: number;
  public readonly size: number;
  public readonly type: TowerType;
  public readonly color: string;
  public readonly secondaryColor: string;

  private _level: number = 1;
  private _totalInvested: number;
  private fireRate: number;
  private fireCooldown: number = 0;
  private _range: number;
  private _damage: number;

  constructor(x: number, y: number, type: TowerType) {
    const config = TOWER_CONFIGS[type];
    const levelStats = config.levels[0];

    this.x = x;
    this.y = y;
    this.type = type;
    this.size = CONFIG.tower.size;
    this._range = levelStats.range;
    this._damage = levelStats.damage;
    this.fireRate = levelStats.fireRate;
    this.color = config.color;
    this.secondaryColor = config.secondaryColor;
    this._totalInvested = config.cost;
  }

  get position(): Position {
    return { x: this.x, y: this.y };
  }

  get level(): number {
    return this._level;
  }

  get range(): number {
    return this._range;
  }

  get damage(): number {
    return this._damage;
  }

  get totalInvested(): number {
    return this._totalInvested;
  }

  get sellValue(): number {
    return Math.floor(this._totalInvested * CONFIG.tower.sellRefundRate);
  }

  get canUpgrade(): boolean {
    return this._level < 3;
  }

  get upgradeCost(): number {
    if (!this.canUpgrade) return 0;
    return TOWER_CONFIGS[this.type].upgradeCosts[this._level - 1];
  }

  getCurrentStats(): TowerLevelStats {
    return TOWER_CONFIGS[this.type].levels[this._level - 1];
  }

  getNextLevelStats(): TowerLevelStats | null {
    if (!this.canUpgrade) return null;
    return TOWER_CONFIGS[this.type].levels[this._level];
  }

  upgrade(): boolean {
    if (!this.canUpgrade) return false;

    const cost = this.upgradeCost;
    this._totalInvested += cost;
    this._level++;

    const newStats = this.getCurrentStats();
    this._range = newStats.range;
    this._damage = newStats.damage;
    this.fireRate = newStats.fireRate;

    return true;
  }

  update(deltaTime: number, enemies: Enemy[], projectiles: Projectile[]): void {
    this.fireCooldown -= deltaTime;

    if (this.fireCooldown <= 0) {
      const target = this.findTarget(enemies);
      if (target) {
        this.fire(target, projectiles, enemies);
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
      if (dist <= this._range && dist < closestDist) {
        closest = enemy;
        closestDist = dist;
      }
    }

    return closest;
  }

  private fire(target: Enemy, projectiles: Projectile[], enemies: Enemy[]): void {
    const stats = this.getCurrentStats();
    const projectile = new Projectile(
      this.x,
      this.y,
      target,
      this._damage,
      this.type,
      enemies,
      stats.aoeRadius,
      stats.slowAmount,
      stats.slowDuration
    );
    projectiles.push(projectile);
  }

  render(ctx: CanvasRenderingContext2D, isSelected: boolean = false): void {
    // Range indicator (subtle, more visible when selected)
    ctx.strokeStyle = isSelected ? this.color + '88' : this.color + '33';
    ctx.lineWidth = isSelected ? 2 : 1;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this._range, 0, Math.PI * 2);
    ctx.stroke();

    // Selection highlight
    if (isSelected) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size / 2 + 5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Tower base
    ctx.fillStyle = this.color;

    if (this.type === 'cannon') {
      // Cannon - circular base
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size / 2, 0, Math.PI * 2);
      ctx.fill();
      // Barrel
      ctx.fillStyle = this.secondaryColor;
      ctx.fillRect(this.x - 4, this.y - this.size / 2 - 5, 8, 15);
    } else if (this.type === 'slow') {
      // Slow tower - hexagonal
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3 - Math.PI / 6;
        const px = this.x + (this.size / 2) * Math.cos(angle);
        const py = this.y + (this.size / 2) * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      // Crystal
      ctx.fillStyle = '#aaddff';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size / 4, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Archer - square base
      ctx.fillRect(
        this.x - this.size / 2,
        this.y - this.size / 2,
        this.size,
        this.size
      );
      // Tower top
      ctx.fillStyle = this.secondaryColor;
      ctx.beginPath();
      ctx.moveTo(this.x, this.y - this.size / 2 - 8);
      ctx.lineTo(this.x + this.size / 3, this.y - this.size / 4);
      ctx.lineTo(this.x - this.size / 3, this.y - this.size / 4);
      ctx.closePath();
      ctx.fill();
    }

    // Level indicator (stars)
    if (this._level > 1) {
      ctx.fillStyle = '#ffdd00';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      const stars = '★'.repeat(this._level - 1);
      ctx.fillText(stars, this.x, this.y + this.size / 2 + 12);
    }
  }
}
