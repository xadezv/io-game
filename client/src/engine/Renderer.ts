import Camera from './Camera';

/**
 * Renderer — thin wrapper around a 2-D canvas context that owns the Camera
 * and provides draw helpers used throughout the game.
 */
export class Renderer {
  readonly ctx: CanvasRenderingContext2D;
  width:  number;
  height: number;
  readonly camera: Camera;

  private readonly canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to obtain 2D canvas context.');

    this.canvas = canvas;
    this.ctx    = ctx;
    this.width  = canvas.width;
    this.height = canvas.height;
    this.camera = new Camera(this.width, this.height);

    // Keep canvas size in sync with the browser window
    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  /**
   * Resize the canvas to fill the window and update camera dimensions.
   */
  resize(): void {
    this.width  = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width  = this.width;
    this.canvas.height = this.height;
    this.camera.width  = this.width;
    this.camera.height = this.height;
  }

  /**
   * Clear the canvas and paint a sky/ground background that reacts to the
   * day/night cycle.
   *
   * Day:   light-blue sky, soft green ground
   * Night: deep navy sky, dark green ground
   */
  clear(isNight: boolean): void {
    const ctx = this.ctx;
    const { width, height } = this;

    if (isNight) {
      // Sky
      ctx.fillStyle = '#0d1b2a';
      ctx.fillRect(0, 0, width, height);
      // Ground tint (lower half)
      ctx.fillStyle = '#1a2e1a';
      ctx.fillRect(0, height / 2, width, height / 2);
    } else {
      // Sky
      ctx.fillStyle = '#87ceeb';
      ctx.fillRect(0, 0, width, height);
      // Ground tint
      ctx.fillStyle = '#90ee90';
      ctx.fillRect(0, height / 2, width, height / 2);
    }
  }

  // ── Primitive draw helpers ─────────────────────────────────────────────────

  /**
   * Draw a filled circle at screen position (x, y).
   */
  drawCircle(x: number, y: number, r: number, color: string): void {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }

  /**
   * Draw a filled, optionally-rotated rectangle centred on (x, y).
   * @param angle - rotation in radians (optional)
   */
  drawRect(
    x: number,
    y: number,
    w: number,
    h: number,
    color: string,
    angle: number = 0,
  ): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);
    if (angle !== 0) ctx.rotate(angle);
    ctx.fillStyle = color;
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.restore();
  }

  /**
   * Draw an image centred on (x, y), scaled to w×h, with optional rotation.
   * @param angle - rotation in radians (optional)
   */
  drawImage(
    img: HTMLImageElement,
    x: number,
    y: number,
    w: number,
    h: number,
    angle: number = 0,
  ): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);
    if (angle !== 0) ctx.rotate(angle);
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();
  }

  /**
   * Draw a text string at (x, y).
   * @param align - canvas textAlign value (default 'center')
   */
  drawText(
    text: string,
    x: number,
    y: number,
    size: number,
    color: string,
    align: CanvasTextAlign = 'center',
  ): void {
    const ctx = this.ctx;
    ctx.font      = `${size}px sans-serif`;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y);
  }

  /**
   * Draw a health bar centred above (x, y).
   * The bar has a red background and a green foreground proportional to hp/maxHp.
   *
   * @param width  - total width of the bar in pixels
   */
  drawHealthBar(
    x: number,
    y: number,
    hp: number,
    maxHp: number,
    width: number,
  ): void {
    const ctx    = this.ctx;
    const height = 6;
    const left   = x - width / 2;
    const ratio  = Math.max(0, Math.min(1, hp / maxHp));

    // Background (lost health)
    ctx.fillStyle = '#c0392b';
    ctx.fillRect(left, y, width, height);

    // Foreground (remaining health)
    ctx.fillStyle = '#27ae60';
    ctx.fillRect(left, y, width * ratio, height);

    // Thin border
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth   = 1;
    ctx.strokeRect(left, y, width, height);
  }
}

export default Renderer;
