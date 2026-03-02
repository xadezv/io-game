import { Camera } from './Camera';

export class Renderer {
  readonly ctx:    CanvasRenderingContext2D;
  readonly camera: Camera;
  width  = 0;
  height = 0;

  private readonly canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('No 2D context');
    this.canvas = canvas;
    this.ctx    = ctx;
    this.camera = new Camera();
    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  resize(): void {
    this.width  = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width  = this.width;
    this.canvas.height = this.height;
    this.camera.resize(this.width, this.height);
  }

  // ─── Camera helpers ────────────────────────────────────────────────────────
  applyCamera():  void { this.camera.apply(this.ctx);   }
  resetCamera():  void { this.camera.restore(this.ctx); }

  // ─── Background ────────────────────────────────────────────────────────────
  clear(isNight: boolean): void {
    const { ctx, width, height } = this;
    ctx.fillStyle = isNight ? '#0a1520' : '#7ec850';
    ctx.fillRect(0, 0, width, height);
  }

  // ─── Primitives ────────────────────────────────────────────────────────────
  drawCircle(x: number, y: number, r: number, color: string, alpha = 1): void {
    const { ctx } = this;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
  }

  drawCircleStroke(x: number, y: number, r: number, color: string, lw = 2, alpha = 1): void {
    const { ctx } = this;
    ctx.save();
    ctx.globalAlpha  = alpha;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.strokeStyle  = color;
    ctx.lineWidth    = lw;
    ctx.stroke();
    ctx.restore();
  }

  drawRect(x: number, y: number, w: number, h: number, color: string, angle = 0, alpha = 1): void {
    const { ctx } = this;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    if (angle) ctx.rotate(angle);
    ctx.fillStyle = color;
    ctx.fillRect(-w * 0.5, -h * 0.5, w, h);
    ctx.restore();
  }

  drawImage(img: HTMLImageElement, x: number, y: number, w: number, h: number, angle = 0, alpha = 1): void {
    const { ctx } = this;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    if (angle) ctx.rotate(angle);
    ctx.drawImage(img, -w * 0.5, -h * 0.5, w, h);
    ctx.restore();
  }

  // Alias expected by EntityRenderer
  drawImageCentered(img: HTMLImageElement, x: number, y: number, w: number, h: number, angle = 0, alpha = 1): void {
    this.drawImage(img, x, y, w, h, angle, alpha);
  }

  drawText(
    text: string, x: number, y: number, size: number, color: string,
    align: CanvasTextAlign = 'center', font = 'bold {s}px "Segoe UI", sans-serif',
  ): void {
    const { ctx } = this;
    ctx.font         = font.replace('{s}', String(size));
    ctx.fillStyle    = color;
    ctx.textAlign    = align;
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y);
  }

  drawTextShadow(text: string, x: number, y: number, size: number, color: string, align: CanvasTextAlign = 'center'): void {
    const { ctx } = this;
    ctx.font         = `bold ${size}px "Segoe UI", sans-serif`;
    ctx.textAlign    = align;
    ctx.textBaseline = 'middle';
    ctx.fillStyle    = 'rgba(0,0,0,0.55)';
    ctx.fillText(text, x + 1, y + 1);
    ctx.fillStyle    = color;
    ctx.fillText(text, x, y);
  }

  /** Horizontal stat/HP bar */
  drawBar(
    x: number, y: number, w: number, h: number,
    value: number, max: number,
    fg: string, bg: string,
    alpha = 1,
  ): void {
    const { ctx } = this;
    const ratio = Math.max(0, Math.min(1, value / max));
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle   = bg;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle   = fg;
    ctx.fillRect(x, y, w * ratio, h);
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth   = 1;
    ctx.strokeRect(x, y, w, h);
    ctx.restore();
  }

  drawHealthBar(x: number, y: number, hp: number, maxHp: number, w: number): void {
    this.drawBar(x - w * 0.5, y, w, 5, hp, maxHp, '#2ecc71', '#c0392b');
  }

  save():    void { this.ctx.save();    }
  restore(): void { this.ctx.restore(); }
}

export default Renderer;
