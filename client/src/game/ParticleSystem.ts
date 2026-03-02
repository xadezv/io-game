import { Camera } from '../engine/Camera';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Particle {
  x:       number;
  y:       number;
  vx:      number;
  vy:      number;
  life:    number; // seconds remaining
  maxLife: number; // total lifetime at birth (seconds)
  color:   string;
  size:    number; // world-space radius at birth
  alpha:   number; // current opacity 0–1
}

// ---------------------------------------------------------------------------
// ParticleSystem
// ---------------------------------------------------------------------------

const GRAVITY      = 380; // world-px / s² downward pull
const FRICTION     = 3.5; // per-second horizontal drag coefficient

export class ParticleSystem {
  private particles: Particle[] = [];

  // -------------------------------------------------------------------------
  // Emit a burst of `count` particles centred on (x, y) in world space.
  // -------------------------------------------------------------------------

  emit(
    x:     number,
    y:     number,
    color: string,
    count: number  = 8,
    speed: number  = 120,
    size:  number  = 4,
  ): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const mag   = speed * (0.4 + Math.random() * 0.8);
      const life  = 0.35 + Math.random() * 0.5;

      this.particles.push({
        x,
        y,
        vx:      Math.cos(angle) * mag,
        vy:      Math.sin(angle) * mag,
        life,
        maxLife: life,
        color,
        size:    size * (0.5 + Math.random() * 0.9),
        alpha:   1,
      });
    }
  }

  // -------------------------------------------------------------------------
  // Convenience emitters
  // -------------------------------------------------------------------------

  /** Red blood splatter — e.g. player/animal hit. */
  emitBlood(x: number, y: number): void {
    this.emit(x, y, '#c0392b', 6 + Math.floor(Math.random() * 4), 140, 4);
    this.emit(x, y, '#e74c3c', 3, 80, 2.5);
  }

  /** Bright sparks — e.g. stone/gold impact. */
  emitSparks(x: number, y: number): void {
    this.emit(x, y, '#ffe066', 7, 160, 3);
    this.emit(x, y, '#ffaa22', 4, 90,  2);
  }

  /** Wood chip fragments — e.g. tree hit. */
  emitWoodChip(x: number, y: number): void {
    this.emit(x, y, '#8B5E3C', 5 + Math.floor(Math.random() * 3), 120, 4);
    this.emit(x, y, '#C49A6C', 3, 75, 2.5);
  }

  /** Stone chip fragments — e.g. stone/wall hit. */
  emitStoneChip(x: number, y: number): void {
    this.emit(x, y, '#7f8c8d', 5, 130, 3);
    this.emit(x, y, '#95a5a6', 3, 70,  2);
  }

  /** Smoke puffs — e.g. campfire. */
  emitSmoke(x: number, y: number): void {
    // Smoke rises, so give an upward bias
    for (let i = 0; i < 4; i++) {
      const angle = -Math.PI * 0.5 + (Math.random() - 0.5) * 1.2;
      const speed = 30 + Math.random() * 40;
      const life  = 0.8 + Math.random() * 0.6;
      this.particles.push({
        x: x + (Math.random() - 0.5) * 10,
        y,
        vx:      Math.cos(angle) * speed,
        vy:      Math.sin(angle) * speed,
        life,
        maxLife: life,
        color:   'rgba(160,160,160,0.6)',
        size:    6 + Math.random() * 4,
        alpha:   0.5 + Math.random() * 0.3,
      });
    }
  }

  /** Leaf confetti — e.g. berry bush or tree hit. */
  emitLeaves(x: number, y: number): void {
    this.emit(x, y, '#6abf45', 5, 80, 4);
    this.emit(x, y, '#4a8e2a', 3, 50, 3);
  }

  /** Ice/snow chips — e.g. snow tree or cold damage. */
  emitSnow(x: number, y: number): void {
    this.emit(x, y, '#dce9f5', 6, 70, 3.5);
    this.emit(x, y, '#ffffff', 4, 50, 2);
  }

  // -------------------------------------------------------------------------
  // Update — advance physics and reap dead particles each frame.
  // -------------------------------------------------------------------------

  update(dt: number): void {
    let i = this.particles.length;
    while (i--) {
      const p = this.particles[i];
      p.life -= dt;

      if (p.life <= 0) {
        // Swap-remove — O(1) deletion without splicing
        this.particles[i] = this.particles[this.particles.length - 1];
        this.particles.pop();
        continue;
      }

      // Integrate position
      p.x  += p.vx * dt;
      p.y  += p.vy * dt;

      // Gravity
      p.vy += GRAVITY * dt;

      // Horizontal air friction
      p.vx *= Math.max(0, 1 - FRICTION * dt);

      // Linear alpha fade based on remaining life ratio
      p.alpha = Math.max(0, p.life / p.maxLife);
    }
  }

  // -------------------------------------------------------------------------
  // Render — draw all live particles; context is in screen-space.
  // -------------------------------------------------------------------------

  render(ctx: CanvasRenderingContext2D, camera: Camera): void {
    if (this.particles.length === 0) return;

    ctx.save();

    for (const p of this.particles) {
      // Quick visibility pre-check
      if (!camera.isVisible(p.x, p.y, p.size * 3)) continue;

      const screen = camera.worldToScreen(p.x, p.y);
      const r      = Math.max(0.5, p.size * camera.zoom);

      ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha));
      ctx.fillStyle   = p.color;
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  // -------------------------------------------------------------------------
  // Utilities
  // -------------------------------------------------------------------------

  /** Number of live particles (debug overlay). */
  get count(): number {
    return this.particles.length;
  }

  /** Remove all particles (e.g. on scene change). */
  clear(): void {
    this.particles.length = 0;
  }
}
