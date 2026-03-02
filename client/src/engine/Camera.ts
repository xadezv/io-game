/**
 * Camera — tracks a world-space position and maps between world and screen
 * coordinates for a 2-D canvas game.
 */
export class Camera {
  /** Current world-space position of the camera centre. */
  x: number = 0;
  y: number = 0;

  /** Zoom factor (1 = no zoom). */
  zoom: number = 1;

  /** Desired world-space position the camera lerps toward. */
  targetX: number = 0;
  targetY: number = 0;

  /** Canvas dimensions in pixels. */
  width: number = 0;
  height: number = 0;

  constructor(width: number = 800, height: number = 600) {
    this.width = width;
    this.height = height;
  }

  /**
   * Smoothly move the camera toward (targetX, targetY).
   * @param dt - delta time in seconds
   */
  update(dt: number): void {
    const speed = 8;
    const alpha = 1 - Math.exp(-speed * dt);
    this.x += (this.targetX - this.x) * alpha;
    this.y += (this.targetY - this.y) * alpha;
  }

  /**
   * Convert a world-space point to screen-space pixels.
   */
  worldToScreen(wx: number, wy: number): { x: number; y: number } {
    return {
      x: (wx - this.x) * this.zoom + this.width  / 2,
      y: (wy - this.y) * this.zoom + this.height / 2,
    };
  }

  /**
   * Convert a screen-space pixel to a world-space point.
   */
  screenToWorld(sx: number, sy: number): { x: number; y: number } {
    return {
      x: (sx - this.width  / 2) / this.zoom + this.x,
      y: (sy - this.height / 2) / this.zoom + this.y,
    };
  }

  /**
   * Apply the camera transform to a 2-D canvas context.
   * Call restore() when finished drawing world-space objects.
   */
  apply(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.width / 2, this.height / 2);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-this.x, -this.y);
  }

  /**
   * Restore the canvas context to its state before apply() was called.
   */
  restore(ctx: CanvasRenderingContext2D): void {
    ctx.restore();
  }

  /**
   * Frustum/culling check — returns true when the circle at (wx, wy) with
   * the given world-space radius is at least partially visible on screen.
   */
  isVisible(wx: number, wy: number, radius: number): boolean {
    const screenPad = radius * this.zoom;
    const { x, y } = this.worldToScreen(wx, wy);
    return (
      x + screenPad >= 0 &&
      x - screenPad <= this.width &&
      y + screenPad >= 0 &&
      y - screenPad <= this.height
    );
  }
}

export default Camera;
