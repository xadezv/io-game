export interface MinimapEntity {
  x: number;
  y: number;
  type: number; // raw EntityType value from shared/packets.ts
}

const MAP_SIZE = 14400;
const MINIMAP_SIZE = 160;
const PADDING = 4;
const DRAW_SIZE = MINIMAP_SIZE - PADDING * 2;

// EntityType constants (mirrored from shared/packets.ts — no import to avoid cross-bundle issues)
const ET_PLAYER    = 0;
const ET_BERRY     = 4;
const ET_RABBIT    = 5;
const ET_WOLF      = 6;
const ET_MAMMOTH   = 13;

// Set of entity types to show on the minimap (excludes resources/structures)
const SHOW_ON_MAP = new Set<number>([ET_PLAYER, ET_BERRY, ET_RABBIT, ET_WOLF, ET_MAMMOTH]);

// Dot color per raw EntityType
const DOT_COLORS: Record<number, string> = {
  [ET_PLAYER]:  "#22c55e", // other players — green
  [ET_BERRY]:   "#facc15", // berry bushes — yellow
  [ET_RABBIT]:  "#ffffff", // rabbits — white
  [ET_WOLF]:    "#ef4444", // wolves — red
  [ET_MAMMOTH]: "#ef4444", // mammoths — red
};

// Dot radius per raw EntityType
const DOT_RADIUS: Record<number, number> = {
  [ET_PLAYER]:  2,
  [ET_BERRY]:   2,
  [ET_RABBIT]:  2,
  [ET_WOLF]:    2,
  [ET_MAMMOTH]: 2,
};

const MAX_DOTS_PER_FRAME = 200;

// Biome approximation colors for background grid
const BIOME_COLORS = [
  { x: 0,    y: 0,    w: 1,    h: 0.5,  color: "#2d6a4f" }, // forest top
  { x: 0,    y: 0.5,  w: 0.5,  h: 0.5,  color: "#1b4332" }, // deep forest
  { x: 0.5,  y: 0.5,  w: 0.5,  h: 0.5,  color: "#d4e6b5" }, // plains
  { x: 0.6,  y: 0.0,  w: 0.4,  h: 0.35, color: "#cce0f5" }, // snow/cold
  { x: 0.0,  y: 0.0,  w: 0.35, h: 0.35, color: "#52b788" }, // meadow
];

export default class Minimap {
  private canvasEl: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private mapSeed: number = 0;

  // Camera / viewport info (set externally or passed via render)
  public viewWidth: number = 0;
  public viewHeight: number = 0;

  constructor() {}

  init(mapSeed: number): void {
    this.mapSeed = mapSeed;

    this.canvasEl = document.createElement("canvas");
    this.canvasEl.className = "minimap-canvas";
    this.canvasEl.width = MINIMAP_SIZE;
    this.canvasEl.height = MINIMAP_SIZE;
    this.canvasEl.style.cssText = [
      "position: fixed",
      "top: 14px",
      "left: 14px",
      "width: 160px",
      "height: 160px",
      "border-radius: 10px",
      "border: 2px solid rgba(255,255,255,0.18)",
      "box-shadow: 0 4px 20px rgba(0,0,0,0.55)",
      "z-index: 100",
      "pointer-events: none",
      "image-rendering: pixelated",
    ].join(";");

    this.ctx = this.canvasEl.getContext("2d")!;
    document.body.appendChild(this.canvasEl);
  }

  render(
    entities: Map<number, MinimapEntity>,
    myId: number,
    myX: number,
    myY: number
  ): void {
    const ctx = this.ctx;
    if (!ctx || !this.canvasEl) return;

    ctx.clearRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE);

    // ---- Background ----
    this._drawBackground(ctx);

    // ---- Entities ----
    let dotCount = 0;
    entities.forEach((ent, id) => {
      if (id === myId) return; // draw self last
      if (!SHOW_ON_MAP.has(ent.type)) return; // skip resources/structures
      if (dotCount >= MAX_DOTS_PER_FRAME) return; // cap per frame
      dotCount++;
      const color  = DOT_COLORS[ent.type] ?? "#ffffff";
      const radius = DOT_RADIUS[ent.type] ?? 2;
      this._drawDot(ctx, ent.x, ent.y, color, radius);
    });

    // ---- Self (blue, larger) ----
    this._drawDot(ctx, myX, myY, "#3b82f6", 3, true);

    // ---- Camera view rectangle ----
    if (this.viewWidth > 0 && this.viewHeight > 0) {
      this._drawViewRect(ctx, myX, myY);
    }

    // ---- Border/vignette ----
    this._drawVignette(ctx);
  }

  private _drawBackground(ctx: CanvasRenderingContext2D): void {
    // Base green
    const bgGrad = ctx.createLinearGradient(0, 0, MINIMAP_SIZE, MINIMAP_SIZE);
    bgGrad.addColorStop(0, "#1e3a2f");
    bgGrad.addColorStop(0.4, "#2d5a3d");
    bgGrad.addColorStop(0.7, "#3a7a52");
    bgGrad.addColorStop(1, "#1a2f22");
    ctx.fillStyle = bgGrad;
    ctx.beginPath();
    this._roundRect(ctx, 0, 0, MINIMAP_SIZE, MINIMAP_SIZE, 10);
    ctx.fill();

    // Biome patches
    for (const b of BIOME_COLORS) {
      ctx.fillStyle = b.color + "55"; // semi-transparent
      ctx.fillRect(
        PADDING + b.x * DRAW_SIZE,
        PADDING + b.y * DRAW_SIZE,
        b.w * DRAW_SIZE,
        b.h * DRAW_SIZE
      );
    }

    // Grid lines (very subtle)
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 0.5;
    const gridStep = DRAW_SIZE / 4;
    for (let i = 0; i <= 4; i++) {
      const pos = PADDING + i * gridStep;
      ctx.beginPath();
      ctx.moveTo(pos, PADDING);
      ctx.lineTo(pos, PADDING + DRAW_SIZE);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(PADDING, pos);
      ctx.lineTo(PADDING + DRAW_SIZE, pos);
      ctx.stroke();
    }
  }

  private _drawDot(
    ctx: CanvasRenderingContext2D,
    worldX: number,
    worldY: number,
    color: string,
    radius: number,
    glow: boolean = false
  ): void {
    const mx = PADDING + (worldX / MAP_SIZE) * DRAW_SIZE;
    const my = PADDING + (worldY / MAP_SIZE) * DRAW_SIZE;

    if (glow) {
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;
    }

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(mx, my, radius, 0, Math.PI * 2);
    ctx.fill();

    // White outline for visibility
    ctx.strokeStyle = "rgba(255,255,255,0.6)";
    ctx.lineWidth = 0.8;
    ctx.stroke();

    if (glow) ctx.restore();
  }

  private _drawViewRect(
    ctx: CanvasRenderingContext2D,
    myX: number,
    myY: number
  ): void {
    const scale = DRAW_SIZE / MAP_SIZE;
    const rw = this.viewWidth * scale;
    const rh = this.viewHeight * scale;
    const rx = PADDING + myX * scale - rw / 2;
    const ry = PADDING + myY * scale - rh / 2;

    ctx.strokeStyle = "rgba(255,255,255,0.45)";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 2]);
    ctx.strokeRect(rx, ry, rw, rh);
    ctx.setLineDash([]);
  }

  private _drawVignette(ctx: CanvasRenderingContext2D): void {
    const grad = ctx.createRadialGradient(
      MINIMAP_SIZE / 2, MINIMAP_SIZE / 2, MINIMAP_SIZE * 0.3,
      MINIMAP_SIZE / 2, MINIMAP_SIZE / 2, MINIMAP_SIZE * 0.72
    );
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(1, "rgba(0,0,0,0.4)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    this._roundRect(ctx, 0, 0, MINIMAP_SIZE, MINIMAP_SIZE, 10);
    ctx.fill();
  }

  private _roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ): void {
    r = Math.min(r, w / 2, h / 2);
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }
}
