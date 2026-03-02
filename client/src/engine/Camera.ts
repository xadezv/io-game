export class Camera {
  x      = 0;
  y      = 0;
  zoom   = 1;
  width  = 800;
  height = 600;

  private _targetX = 0;
  private _targetY = 0;
  private _targetZ = 1;

  constructor(w = 800, h = 600) { this.width = w; this.height = h; }

  follow(x: number, y: number): void { this._targetX = x; this._targetY = y; }
  setZoom(z: number): void           { this._targetZ = z; }

  update(dt: number): void {
    const ps = 1 - Math.exp(-8 * dt);
    const zs = 1 - Math.exp(-6 * dt);
    this.x    += (this._targetX - this.x)    * ps;
    this.y    += (this._targetY - this.y)    * ps;
    this.zoom += (this._targetZ - this.zoom) * zs;
  }

  apply(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.width * 0.5, this.height * 0.5);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-this.x, -this.y);
  }

  restore(ctx: CanvasRenderingContext2D): void { ctx.restore(); }

  worldToScreen(wx: number, wy: number): { x: number; y: number } {
    return {
      x: (wx - this.x) * this.zoom + this.width  * 0.5,
      y: (wy - this.y) * this.zoom + this.height * 0.5,
    };
  }

  screenToWorld(sx: number, sy: number): { x: number; y: number } {
    return {
      x: (sx - this.width  * 0.5) / this.zoom + this.x,
      y: (sy - this.height * 0.5) / this.zoom + this.y,
    };
  }

  isVisible(wx: number, wy: number, r: number): boolean {
    const { x, y } = this.worldToScreen(wx, wy);
    const sr = r * this.zoom;
    return x + sr > 0 && x - sr < this.width && y + sr > 0 && y - sr < this.height;
  }

  resize(w: number, h: number): void { this.width = w; this.height = h; }
}

export default Camera;
