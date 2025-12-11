import type { Position, EnemyType, PathPoint } from '../types';
import { ENEMY_CONFIGS } from '../types';

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

  // Path following
  private path: PathPoint[];
  private currentPathIndex: number = 0;
  private distanceAlongSegment: number = 0;

  constructor(path: PathPoint[], config: EnemySpawnConfig) {
    const typeConfig = ENEMY_CONFIGS[config.type];

    this.path = path;
    this.x = path[0].x;
    this.y = path[0].y;
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

  private getSegmentLength(): number {
    if (this.currentPathIndex >= this.path.length - 1) return 0;
    const start = this.path[this.currentPathIndex];
    const end = this.path[this.currentPathIndex + 1];
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    return Math.sqrt(dx * dx + dy * dy);
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

    // Move along path
    const moveDistance = this.currentSpeed * deltaTime;
    this.moveAlongPath(moveDistance);
  }

  private moveAlongPath(distance: number): void {
    let remainingDistance = distance;

    while (remainingDistance > 0 && this.currentPathIndex < this.path.length - 1) {
      const segmentLength = this.getSegmentLength();
      const remainingInSegment = segmentLength - this.distanceAlongSegment;

      if (remainingDistance >= remainingInSegment) {
        // Move to next segment
        remainingDistance -= remainingInSegment;
        this.currentPathIndex++;
        this.distanceAlongSegment = 0;

        if (this.currentPathIndex >= this.path.length - 1) {
          // Reached the end
          const lastPoint = this.path[this.path.length - 1];
          this.x = lastPoint.x;
          this.y = lastPoint.y;
          return;
        }
      } else {
        // Move within current segment
        this.distanceAlongSegment += remainingDistance;
        remainingDistance = 0;
      }
    }

    // Update position based on current segment
    this.updatePosition();
  }

  private updatePosition(): void {
    if (this.currentPathIndex >= this.path.length - 1) {
      const lastPoint = this.path[this.path.length - 1];
      this.x = lastPoint.x;
      this.y = lastPoint.y;
      return;
    }

    const start = this.path[this.currentPathIndex];
    const end = this.path[this.currentPathIndex + 1];
    const segmentLength = this.getSegmentLength();

    if (segmentLength === 0) {
      this.x = start.x;
      this.y = start.y;
      return;
    }

    const t = this.distanceAlongSegment / segmentLength;
    this.x = start.x + (end.x - start.x) * t;
    this.y = start.y + (end.y - start.y) * t;
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
    return this.currentPathIndex >= this.path.length - 1;
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
