// Damage popup for showing damage numbers
export interface DamagePopup {
  x: number;
  y: number;
  damage: number;
  color: string;
  alpha: number;
  lifetime: number;
  maxLifetime: number;
  offsetY: number;
  scale: number;
}

// Projectile trail particle
export interface TrailParticle {
  x: number;
  y: number;
  alpha: number;
  size: number;
  color: string;
  lifetime: number;
}

// Explosion effect
export interface Explosion {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  lifetime: number;
  color: string;
}

// Wave announcement
export interface WaveAnnouncement {
  wave: number;
  alpha: number;
  scale: number;
  lifetime: number;
  phase: 'expand' | 'hold' | 'fade';
}

export class VisualEffects {
  private damagePopups: DamagePopup[] = [];
  private trailParticles: TrailParticle[] = [];
  private explosions: Explosion[] = [];
  private waveAnnouncement: WaveAnnouncement | null = null;

  // Create damage popup
  createDamagePopup(x: number, y: number, damage: number, isCritical: boolean = false): void {
    const popup: DamagePopup = {
      x: x + (Math.random() - 0.5) * 20,
      y,
      damage,
      color: isCritical ? '#ffff00' : '#ffffff',
      alpha: 1,
      lifetime: 0,
      maxLifetime: 0.8,
      offsetY: 0,
      scale: isCritical ? 1.5 : 1,
    };
    this.damagePopups.push(popup);
  }

  // Create trail particle
  createTrailParticle(x: number, y: number, color: string, size: number = 3): void {
    const particle: TrailParticle = {
      x: x + (Math.random() - 0.5) * 4,
      y: y + (Math.random() - 0.5) * 4,
      alpha: 0.8,
      size,
      color,
      lifetime: 0.2,
    };
    this.trailParticles.push(particle);
  }

  // Create explosion effect
  createExplosion(x: number, y: number, radius: number, color: string = '#ff8800'): void {
    const explosion: Explosion = {
      x,
      y,
      radius: 5,
      maxRadius: radius,
      alpha: 1,
      lifetime: 0.3,
      color,
    };
    this.explosions.push(explosion);
  }

  // Create wave start announcement
  createWaveAnnouncement(wave: number): void {
    this.waveAnnouncement = {
      wave,
      alpha: 0,
      scale: 2,
      lifetime: 0,
      phase: 'expand',
    };
  }

  // Update all effects
  update(deltaTime: number): void {
    // Update damage popups
    for (const popup of this.damagePopups) {
      popup.lifetime += deltaTime;
      popup.offsetY -= 40 * deltaTime;
      popup.alpha = 1 - popup.lifetime / popup.maxLifetime;
    }
    this.damagePopups = this.damagePopups.filter((p) => p.lifetime < p.maxLifetime);

    // Update trail particles
    for (const particle of this.trailParticles) {
      particle.lifetime -= deltaTime;
      particle.alpha = particle.lifetime / 0.2;
      particle.size *= 0.95;
    }
    this.trailParticles = this.trailParticles.filter((p) => p.lifetime > 0);

    // Update explosions
    for (const explosion of this.explosions) {
      explosion.lifetime -= deltaTime;
      const progress = 1 - explosion.lifetime / 0.3;
      explosion.radius = explosion.maxRadius * progress;
      explosion.alpha = 1 - progress;
    }
    this.explosions = this.explosions.filter((e) => e.lifetime > 0);

    // Update wave announcement
    if (this.waveAnnouncement) {
      const ann = this.waveAnnouncement;
      ann.lifetime += deltaTime;

      if (ann.phase === 'expand' && ann.lifetime < 0.3) {
        ann.alpha = ann.lifetime / 0.3;
        ann.scale = 2 - ann.lifetime / 0.3;
      } else if (ann.phase === 'expand') {
        ann.phase = 'hold';
        ann.alpha = 1;
        ann.scale = 1;
        ann.lifetime = 0;
      } else if (ann.phase === 'hold' && ann.lifetime < 1.0) {
        // Hold
      } else if (ann.phase === 'hold') {
        ann.phase = 'fade';
        ann.lifetime = 0;
      } else if (ann.phase === 'fade' && ann.lifetime < 0.5) {
        ann.alpha = 1 - ann.lifetime / 0.5;
      } else {
        this.waveAnnouncement = null;
      }
    }
  }

  // Render all effects
  render(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number): void {
    // Render trail particles
    for (const particle of this.trailParticles) {
      ctx.globalAlpha = particle.alpha;
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Render explosions
    for (const explosion of this.explosions) {
      ctx.globalAlpha = explosion.alpha;

      // Outer ring
      ctx.strokeStyle = explosion.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(explosion.x, explosion.y, explosion.radius, 0, Math.PI * 2);
      ctx.stroke();

      // Inner glow
      const gradient = ctx.createRadialGradient(
        explosion.x,
        explosion.y,
        0,
        explosion.x,
        explosion.y,
        explosion.radius
      );
      gradient.addColorStop(0, explosion.color + '80');
      gradient.addColorStop(1, explosion.color + '00');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(explosion.x, explosion.y, explosion.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Render damage popups
    for (const popup of this.damagePopups) {
      ctx.globalAlpha = popup.alpha;
      ctx.fillStyle = popup.color;
      ctx.font = `bold ${Math.floor(14 * popup.scale)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;

      const displayY = popup.y + popup.offsetY;
      ctx.strokeText(`-${popup.damage}`, popup.x, displayY);
      ctx.fillText(`-${popup.damage}`, popup.x, displayY);
    }
    ctx.globalAlpha = 1;

    // Render wave announcement
    if (this.waveAnnouncement) {
      const ann = this.waveAnnouncement;
      ctx.globalAlpha = ann.alpha;

      // Background
      ctx.fillStyle = `rgba(0, 0, 0, ${ann.alpha * 0.6})`;
      ctx.fillRect(0, canvasHeight / 2 - 60, canvasWidth, 120);

      // Wave text
      ctx.save();
      ctx.translate(canvasWidth / 2, canvasHeight / 2);
      ctx.scale(ann.scale, ann.scale);

      ctx.fillStyle = '#ffcc00';
      ctx.font = 'bold 48px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      ctx.strokeStyle = '#000';
      ctx.lineWidth = 4;
      ctx.strokeText(`WAVE ${ann.wave}`, 0, -10);
      ctx.fillText(`WAVE ${ann.wave}`, 0, -10);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText('START!', 0, 30);

      ctx.restore();
      ctx.globalAlpha = 1;
    }
  }

  // Check if wave announcement is active
  isWaveAnnouncementActive(): boolean {
    return this.waveAnnouncement !== null;
  }
}

// Singleton instance
export const visualEffects = new VisualEffects();
