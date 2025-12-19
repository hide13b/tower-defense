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

  // Animation
  private animationTime: number = 0;
  private previousPositions: { x: number; y: number }[] = [];

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
    // Update animation
    this.animationTime += deltaTime;

    // Store previous position for trail (Speed type)
    if (this.type === 'speed') {
      this.previousPositions.unshift({ x: this.x, y: this.y });
      if (this.previousPositions.length > 5) {
        this.previousPositions.pop();
      }
    }

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
    if (this.type === 'tank') {
      this.renderGolem(ctx);
    } else if (this.type === 'speed') {
      this.renderNinja(ctx);
    } else {
      this.renderSlime(ctx);
    }

    // Slow indicator
    if (this.slowTimer > 0) {
      ctx.strokeStyle = '#88ccff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size / 2 + 5, 0, Math.PI * 2);
      ctx.stroke();

      // Ice crystals
      for (let i = 0; i < 4; i++) {
        const angle = (i * Math.PI) / 2 + this.animationTime * 2;
        const cx = this.x + Math.cos(angle) * (this.size / 2 + 8);
        const cy = this.y + Math.sin(angle) * (this.size / 2 + 8);
        ctx.fillStyle = '#aaeeff';
        ctx.beginPath();
        ctx.moveTo(cx, cy - 4);
        ctx.lineTo(cx + 3, cy);
        ctx.lineTo(cx, cy + 4);
        ctx.lineTo(cx - 3, cy);
        ctx.closePath();
        ctx.fill();
      }
    }

    // Health bar background
    const barWidth = this.size + 6;
    const barHeight = 5;
    const barY = this.y - this.size / 2 - 10;

    ctx.fillStyle = '#222';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(this.x - barWidth / 2, barY, barWidth, barHeight, 2);
    ctx.fill();
    ctx.stroke();

    // Health bar fill
    const healthPercent = this.hp / this.maxHp;
    const healthGradient = ctx.createLinearGradient(
      this.x - barWidth / 2,
      barY,
      this.x - barWidth / 2 + barWidth * healthPercent,
      barY
    );
    if (healthPercent > 0.5) {
      healthGradient.addColorStop(0, '#66ff66');
      healthGradient.addColorStop(1, '#44cc44');
    } else if (healthPercent > 0.25) {
      healthGradient.addColorStop(0, '#ffff66');
      healthGradient.addColorStop(1, '#cccc44');
    } else {
      healthGradient.addColorStop(0, '#ff6666');
      healthGradient.addColorStop(1, '#cc4444');
    }
    ctx.fillStyle = healthGradient;
    ctx.beginPath();
    ctx.roundRect(
      this.x - barWidth / 2 + 1,
      barY + 1,
      (barWidth - 2) * healthPercent,
      barHeight - 2,
      1
    );
    ctx.fill();
  }

  private renderSlime(ctx: CanvasRenderingContext2D): void {
    const s = this.size;
    const squish = 1 + Math.sin(this.animationTime * 8) * 0.1;
    const squishY = 1 / squish;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(squish, squishY);

    // Slime body
    const gradient = ctx.createRadialGradient(0, -s / 6, 0, 0, 0, s / 2);
    gradient.addColorStop(0, '#ff8888');
    gradient.addColorStop(0.7, '#ff4444');
    gradient.addColorStop(1, '#cc2222');
    ctx.fillStyle = gradient;

    // Draw slime shape
    ctx.beginPath();
    ctx.moveTo(-s / 2, s / 4);
    ctx.quadraticCurveTo(-s / 2, -s / 2, 0, -s / 2);
    ctx.quadraticCurveTo(s / 2, -s / 2, s / 2, s / 4);
    ctx.quadraticCurveTo(s / 4, s / 2, 0, s / 2);
    ctx.quadraticCurveTo(-s / 4, s / 2, -s / 2, s / 4);
    ctx.fill();

    // Shine
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.beginPath();
    ctx.ellipse(-s / 5, -s / 4, s / 6, s / 8, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    const eyeOffset = s / 5;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(-eyeOffset, -s / 8, s / 7, s / 6, 0, 0, Math.PI * 2);
    ctx.ellipse(eyeOffset, -s / 8, s / 7, s / 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Pupils
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(-eyeOffset + 1, -s / 10, s / 14, 0, Math.PI * 2);
    ctx.arc(eyeOffset + 1, -s / 10, s / 14, 0, Math.PI * 2);
    ctx.fill();

    // Cute mouth
    ctx.strokeStyle = '#aa2222';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, s / 8, s / 6, 0.2, Math.PI - 0.2);
    ctx.stroke();

    ctx.restore();
  }

  private renderNinja(ctx: CanvasRenderingContext2D): void {
    const s = this.size;

    // Draw afterimages
    for (let i = this.previousPositions.length - 1; i >= 0; i--) {
      const pos = this.previousPositions[i];
      const alpha = (1 - i / this.previousPositions.length) * 0.3;
      ctx.globalAlpha = alpha;
      this.drawNinjaBody(ctx, pos.x, pos.y, s * 0.9);
    }
    ctx.globalAlpha = 1;

    // Draw main body
    this.drawNinjaBody(ctx, this.x, this.y, s);
  }

  private drawNinjaBody(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    s: number
  ): void {
    // Body
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, s / 2);
    gradient.addColorStop(0, '#ffcc66');
    gradient.addColorStop(1, '#cc8800');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, s / 2, 0, Math.PI * 2);
    ctx.fill();

    // Headband
    ctx.fillStyle = '#333';
    ctx.fillRect(x - s / 2, y - s / 6, s, s / 4);

    // Headband tails
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + s / 2, y - s / 8);
    ctx.quadraticCurveTo(
      x + s / 2 + s / 4,
      y - s / 4,
      x + s / 2 + s / 3,
      y
    );
    ctx.stroke();

    // Eyes (determined)
    ctx.fillStyle = '#fff';
    const eyeOffset = s / 5;
    ctx.beginPath();
    ctx.ellipse(x - eyeOffset, y, s / 8, s / 10, 0, 0, Math.PI * 2);
    ctx.ellipse(x + eyeOffset, y, s / 8, s / 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Focused pupils
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(x - eyeOffset + 2, y, s / 16, 0, Math.PI * 2);
    ctx.arc(x + eyeOffset + 2, y, s / 16, 0, Math.PI * 2);
    ctx.fill();
  }

  private renderGolem(ctx: CanvasRenderingContext2D): void {
    const s = this.size;
    const walkOffset = Math.sin(this.animationTime * 6) * 2;

    ctx.save();
    ctx.translate(this.x, this.y + walkOffset);

    // Rock body
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, s / 2);
    gradient.addColorStop(0, '#aa77cc');
    gradient.addColorStop(0.6, '#8855aa');
    gradient.addColorStop(1, '#553377');
    ctx.fillStyle = gradient;

    // Main body (irregular rock shape)
    ctx.beginPath();
    ctx.moveTo(-s / 2, s / 4);
    ctx.lineTo(-s / 2.5, -s / 4);
    ctx.lineTo(-s / 4, -s / 2);
    ctx.lineTo(s / 4, -s / 2);
    ctx.lineTo(s / 2.5, -s / 4);
    ctx.lineTo(s / 2, s / 4);
    ctx.lineTo(s / 3, s / 2);
    ctx.lineTo(-s / 3, s / 2);
    ctx.closePath();
    ctx.fill();

    // Stone texture lines
    ctx.strokeStyle = '#442266';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-s / 4, -s / 3);
    ctx.lineTo(-s / 6, s / 4);
    ctx.moveTo(s / 5, -s / 4);
    ctx.lineTo(s / 4, s / 3);
    ctx.stroke();

    // Glowing eyes
    const eyeGlow = 0.7 + Math.sin(this.animationTime * 4) * 0.3;
    ctx.fillStyle = `rgba(255, 100, 255, ${eyeGlow})`;
    ctx.beginPath();
    ctx.arc(-s / 5, -s / 6, s / 8, 0, Math.PI * 2);
    ctx.arc(s / 5, -s / 6, s / 8, 0, Math.PI * 2);
    ctx.fill();

    // Eye cores
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-s / 5, -s / 6, s / 16, 0, Math.PI * 2);
    ctx.arc(s / 5, -s / 6, s / 16, 0, Math.PI * 2);
    ctx.fill();

    // Angry mouth
    ctx.strokeStyle = '#331155';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-s / 4, s / 6);
    ctx.lineTo(0, s / 4);
    ctx.lineTo(s / 4, s / 6);
    ctx.stroke();

    ctx.restore();
  }
}
