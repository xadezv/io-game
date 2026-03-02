/**
 * AnimationSystem — lightweight helpers for smooth interpolation and
 * time-based easing used throughout the client engine.
 */

// ── Interpolation helpers ────────────────────────────────────────────────────

/**
 * Linear interpolation between a and b by factor t (unclamped).
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Shortest-path lerp between two angles (in radians).
 * Handles wrap-around at ±π so the rotation always takes the short arc.
 */
export function lerpAngle(a: number, b: number, t: number): number {
  let diff = b - a;

  // Normalise difference to (-π, π]
  while (diff >  Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;

  return a + diff * t;
}

// ── Easing functions ─────────────────────────────────────────────────────────

/**
 * Cubic ease-out: fast start, slow finish.
 * @param t - normalised time in [0, 1]
 */
export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Quadratic ease-out.
 * @param t - normalised time in [0, 1]
 */
export function easeOutQuad(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

// ── Ease class ────────────────────────────────────────────────────────────────

/**
 * One-shot timer that exposes an eased progress value.
 *
 * Usage:
 *   const e = new Ease(0.3);
 *   e.start();
 *   // in game loop:
 *   if (e.update(dt)) { doSomethingWith(e.value); }
 */
export class Ease {
  /** Eased progress in [0, 1] — updated by update(). */
  value: number = 0;

  private duration: number;
  private elapsed: number = 0;
  private active:  boolean = false;

  constructor(duration: number) {
    this.duration = duration;
  }

  /** Reset and begin the ease. */
  start(): void {
    this.elapsed = 0;
    this.active  = true;
    this.value   = 0;
  }

  /**
   * Advance the timer by dt seconds.
   * @returns true while the ease is still running, false once it finishes.
   */
  update(dt: number): boolean {
    if (!this.active) return false;

    this.elapsed += dt;

    const t = Math.min(this.elapsed / this.duration, 1);
    this.value = easeOutCubic(t);

    if (t >= 1) {
      this.active = false;
    }

    return this.active || t >= 1; // returns true on the final frame too
  }
}
