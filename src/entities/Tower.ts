import type { Position, TowerType, TowerLevelStats } from '../types';
import type { ProjectileCallbacks } from './Projectile';
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

  // Animation
  private animationTime: number = 0;
  private attackAnimation: number = 0;

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

  update(
    deltaTime: number,
    enemies: Enemy[],
    projectiles: Projectile[],
    callbacks?: ProjectileCallbacks
  ): void {
    // Update animation
    this.animationTime += deltaTime;
    if (this.attackAnimation > 0) {
      this.attackAnimation -= deltaTime * 5;
    }

    this.fireCooldown -= deltaTime;

    if (this.fireCooldown <= 0) {
      const target = this.findTarget(enemies);
      if (target) {
        this.fire(target, projectiles, enemies, callbacks);
        this.fireCooldown = 1 / this.fireRate;
        this.attackAnimation = 1; // Trigger attack animation
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

  private fire(
    target: Enemy,
    projectiles: Projectile[],
    enemies: Enemy[],
    callbacks?: ProjectileCallbacks
  ): void {
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
      stats.slowDuration,
      callbacks
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
      ctx.arc(this.x, this.y, this.size / 2 + 8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Idle animation (gentle bobbing)
    const bobAmount = Math.sin(this.animationTime * 3) * 2;
    const attackScale = 1 + this.attackAnimation * 0.2;

    ctx.save();
    ctx.translate(this.x, this.y + bobAmount);
    ctx.scale(attackScale, attackScale);

    if (this.type === 'cannon') {
      this.renderCannon(ctx);
    } else if (this.type === 'slow') {
      this.renderMage(ctx);
    } else {
      this.renderArcher(ctx);
    }

    ctx.restore();

    // Level indicator (stars)
    if (this._level > 1) {
      ctx.fillStyle = '#ffdd00';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      const stars = '★'.repeat(this._level - 1);
      ctx.fillText(stars, this.x, this.y + this.size / 2 + 14);
    }
  }

  private renderArcher(ctx: CanvasRenderingContext2D): void {
    const s = this.size;

    // Body (round)
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, s / 2);
    gradient.addColorStop(0, '#88cc88');
    gradient.addColorStop(1, '#448844');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, s / 2, 0, Math.PI * 2);
    ctx.fill();

    // Hood
    ctx.fillStyle = '#336633';
    ctx.beginPath();
    ctx.arc(0, -s / 4, s / 3, Math.PI, 0);
    ctx.fill();

    // Eyes
    const eyeOffset = s / 6;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(-eyeOffset, -s / 8, s / 8, s / 7, 0, 0, Math.PI * 2);
    ctx.ellipse(eyeOffset, -s / 8, s / 8, s / 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Pupils
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(-eyeOffset + 1, -s / 8, s / 16, 0, Math.PI * 2);
    ctx.arc(eyeOffset + 1, -s / 8, s / 16, 0, Math.PI * 2);
    ctx.fill();

    // Blush
    ctx.fillStyle = 'rgba(255, 150, 150, 0.4)';
    ctx.beginPath();
    ctx.ellipse(-s / 4, s / 10, s / 8, s / 12, 0, 0, Math.PI * 2);
    ctx.ellipse(s / 4, s / 10, s / 8, s / 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Bow
    ctx.strokeStyle = '#8B4513';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(s / 2 + 2, 0, s / 3, -Math.PI / 2, Math.PI / 2);
    ctx.stroke();

    // Bow string
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(s / 2 + 2, -s / 3);
    ctx.lineTo(s / 2 + 2, s / 3);
    ctx.stroke();
  }

  private renderCannon(ctx: CanvasRenderingContext2D): void {
    const s = this.size;
    const recoil = this.attackAnimation * -5;

    // Body (round with metallic look)
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, s / 2);
    gradient.addColorStop(0, '#ff9966');
    gradient.addColorStop(1, '#cc5522');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 2, s / 2, 0, Math.PI * 2);
    ctx.fill();

    // Cannon barrel
    ctx.fillStyle = '#555';
    ctx.save();
    ctx.translate(0, -s / 2 + recoil);
    ctx.fillRect(-s / 5, -s / 2, s / 2.5, s / 2);
    // Barrel tip
    ctx.fillStyle = '#333';
    ctx.fillRect(-s / 4, -s / 2 - 3, s / 2, 5);
    ctx.restore();

    // Eyes
    const eyeOffset = s / 5;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-eyeOffset, 0, s / 7, 0, Math.PI * 2);
    ctx.arc(eyeOffset, 0, s / 7, 0, Math.PI * 2);
    ctx.fill();

    // Pupils (looking up at barrel)
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(-eyeOffset, -s / 16, s / 14, 0, Math.PI * 2);
    ctx.arc(eyeOffset, -s / 16, s / 14, 0, Math.PI * 2);
    ctx.fill();

    // Determined mouth
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-s / 6, s / 5);
    ctx.lineTo(s / 6, s / 5);
    ctx.stroke();
  }

  private renderMage(ctx: CanvasRenderingContext2D): void {
    const s = this.size;
    const floatOffset = Math.sin(this.animationTime * 4) * 3;

    ctx.save();
    ctx.translate(0, floatOffset);

    // Magic aura
    const auraSize = s / 2 + 5 + Math.sin(this.animationTime * 5) * 3;
    const auraGradient = ctx.createRadialGradient(0, 0, s / 4, 0, 0, auraSize);
    auraGradient.addColorStop(0, 'rgba(100, 150, 255, 0)');
    auraGradient.addColorStop(0.7, 'rgba(100, 150, 255, 0.2)');
    auraGradient.addColorStop(1, 'rgba(100, 150, 255, 0)');
    ctx.fillStyle = auraGradient;
    ctx.beginPath();
    ctx.arc(0, 0, auraSize, 0, Math.PI * 2);
    ctx.fill();

    // Body (round with mystical look)
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, s / 2);
    gradient.addColorStop(0, '#aaccff');
    gradient.addColorStop(1, '#6688cc');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, s / 2, 0, Math.PI * 2);
    ctx.fill();

    // Wizard hat
    ctx.fillStyle = '#4455aa';
    ctx.beginPath();
    ctx.moveTo(0, -s / 2 - s / 2);
    ctx.lineTo(s / 3, -s / 4);
    ctx.lineTo(-s / 3, -s / 4);
    ctx.closePath();
    ctx.fill();

    // Hat brim
    ctx.fillStyle = '#3344aa';
    ctx.beginPath();
    ctx.ellipse(0, -s / 4, s / 2.5, s / 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eyes (mystical)
    ctx.fillStyle = '#fff';
    const eyeOffset = s / 6;
    ctx.beginPath();
    ctx.arc(-eyeOffset, 0, s / 8, 0, Math.PI * 2);
    ctx.arc(eyeOffset, 0, s / 8, 0, Math.PI * 2);
    ctx.fill();

    // Glowing pupils
    ctx.fillStyle = '#88ffff';
    ctx.beginPath();
    ctx.arc(-eyeOffset, 0, s / 16, 0, Math.PI * 2);
    ctx.arc(eyeOffset, 0, s / 16, 0, Math.PI * 2);
    ctx.fill();

    // Magic staff
    ctx.strokeStyle = '#8B4513';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(s / 2 + 3, -s / 4);
    ctx.lineTo(s / 2 + 3, s / 2);
    ctx.stroke();

    // Crystal on staff
    const crystalGlow = 0.5 + Math.sin(this.animationTime * 6) * 0.3;
    ctx.fillStyle = `rgba(150, 200, 255, ${crystalGlow})`;
    ctx.beginPath();
    ctx.arc(s / 2 + 3, -s / 3, s / 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
