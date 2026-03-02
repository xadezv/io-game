export interface RecipeIngredient {
  item: number;
  name: string;
  count: number;
  have: number;
}

export interface RecipeEntry {
  result: number;
  name: string;
  ingredients: RecipeIngredient[];
  requiresWorkbench?: boolean;
}

// Layout constants
const PANEL_WIDTH = 220;
const PANEL_PADDING = 12;
const RECIPE_HEIGHT = 72;
const RECIPE_GAP = 6;
const HEADER_H = 36;
const SCROLL_BTN_H = 24;

// Colors
const COLOR_BG = "rgba(8,6,20,0.93)";
const COLOR_BORDER = "rgba(255,255,255,0.1)";
const COLOR_CRAFTABLE = "#4ade80";
const COLOR_UNCRAFTABLE = "rgba(255,255,255,0.35)";
const COLOR_SELECTED = "rgba(124,58,237,0.3)";
const COLOR_HOVER = "rgba(255,255,255,0.06)";

export default class CraftMenu {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private open: boolean = false;
  private scrollOffset: number = 0;
  private hoveredIndex: number = -1;
  private selectedIndex: number = -1;

  // Panel geometry (updated each render)
  private panelX: number = 0;
  private panelY: number = 0;
  private panelH: number = 0;
  private visibleCount: number = 0;

  constructor(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
    this.ctx = ctx;
    this.canvas = canvas;
    this._bindKeys();
    this._bindMouse();
  }

  // ---- Public API ----

  show(): void {
    this.open = true;
  }

  hide(): void {
    this.open = false;
  }

  isOpen(): boolean {
    return this.open;
  }

  render(recipes: RecipeEntry[]): void {
    if (!this.open) return;
    const ctx = this.ctx;
    const cw = this.canvas.width;
    const ch = this.canvas.height;

    const maxPanelH = ch - 80;
    this.visibleCount = Math.floor(
      (maxPanelH - HEADER_H - SCROLL_BTN_H * 2 - PANEL_PADDING * 2) /
        (RECIPE_HEIGHT + RECIPE_GAP)
    );
    this.panelH =
      HEADER_H +
      SCROLL_BTN_H * 2 +
      PANEL_PADDING * 2 +
      this.visibleCount * (RECIPE_HEIGHT + RECIPE_GAP) -
      RECIPE_GAP;

    this.panelX = cw - PANEL_WIDTH - 14;
    this.panelY = (ch - this.panelH) / 2;

    // ---- Panel background ----
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.7)";
    ctx.shadowBlur = 24;
    ctx.fillStyle = COLOR_BG;
    ctx.beginPath();
    this._roundRect(this.panelX, this.panelY, PANEL_WIDTH, this.panelH, 12);
    ctx.fill();
    ctx.restore();

    // Panel border
    ctx.strokeStyle = COLOR_BORDER;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    this._roundRect(this.panelX, this.panelY, PANEL_WIDTH, this.panelH, 12);
    ctx.stroke();

    // ---- Header ----
    ctx.fillStyle = "rgba(124,58,237,0.4)";
    ctx.beginPath();
    this._roundRect(this.panelX, this.panelY, PANEL_WIDTH, HEADER_H, 12);
    ctx.fill();
    // Bottom edge of header
    ctx.fillRect(this.panelX, this.panelY + HEADER_H - 12, PANEL_WIDTH, 12);

    ctx.fillStyle = "#fff";
    ctx.font = "bold 15px 'Fredoka One', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("⚒ Crafting", this.panelX + PANEL_WIDTH / 2, this.panelY + HEADER_H / 2);

    // Header border bottom
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.panelX, this.panelY + HEADER_H);
    ctx.lineTo(this.panelX + PANEL_WIDTH, this.panelY + HEADER_H);
    ctx.stroke();

    // ---- Scroll up button ----
    const scrollUpY = this.panelY + HEADER_H;
    this._drawScrollBtn(
      this.panelX,
      scrollUpY,
      PANEL_WIDTH,
      SCROLL_BTN_H,
      "▲",
      this.scrollOffset > 0
    );

    // ---- Recipes ----
    const listStartY = scrollUpY + SCROLL_BTN_H + PANEL_PADDING;

    // Clip to recipe area
    ctx.save();
    ctx.beginPath();
    ctx.rect(
      this.panelX,
      listStartY,
      PANEL_WIDTH,
      this.visibleCount * (RECIPE_HEIGHT + RECIPE_GAP)
    );
    ctx.clip();

    const maxScroll = Math.max(0, recipes.length - this.visibleCount);
    this.scrollOffset = Math.max(0, Math.min(this.scrollOffset, maxScroll));

    for (let i = 0; i < this.visibleCount; i++) {
      const ri = i + this.scrollOffset;
      if (ri >= recipes.length) break;
      const recipe = recipes[ri];
      const ry =
        listStartY + i * (RECIPE_HEIGHT + RECIPE_GAP);
      this._drawRecipe(recipe, ri, this.panelX + PANEL_PADDING, ry);
    }

    ctx.restore();

    // ---- Scroll down button ----
    const scrollDownY =
      listStartY + this.visibleCount * (RECIPE_HEIGHT + RECIPE_GAP) + PANEL_PADDING - RECIPE_GAP;
    this._drawScrollBtn(
      this.panelX,
      scrollDownY,
      PANEL_WIDTH,
      SCROLL_BTN_H,
      "▼",
      this.scrollOffset < maxScroll
    );

    // ---- Close hint ----
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.font = "10px 'Fredoka One', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(
      "C to close",
      this.panelX + PANEL_WIDTH / 2,
      this.panelY + this.panelH - 4
    );

    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
  }

  handleClick(mouseX: number, mouseY: number, recipes: RecipeEntry[]): number {
    if (!this.open) return -1;

    const listStartY =
      this.panelY + HEADER_H + SCROLL_BTN_H + PANEL_PADDING;

    // Scroll up button
    const scrollUpY = this.panelY + HEADER_H;
    if (
      mouseX >= this.panelX &&
      mouseX <= this.panelX + PANEL_WIDTH &&
      mouseY >= scrollUpY &&
      mouseY <= scrollUpY + SCROLL_BTN_H
    ) {
      this.scrollOffset = Math.max(0, this.scrollOffset - 1);
      return -1;
    }

    // Scroll down button
    const scrollDownY =
      listStartY +
      this.visibleCount * (RECIPE_HEIGHT + RECIPE_GAP) +
      PANEL_PADDING -
      RECIPE_GAP;
    if (
      mouseX >= this.panelX &&
      mouseX <= this.panelX + PANEL_WIDTH &&
      mouseY >= scrollDownY &&
      mouseY <= scrollDownY + SCROLL_BTN_H
    ) {
      const maxScroll = Math.max(0, recipes.length - this.visibleCount);
      this.scrollOffset = Math.min(maxScroll, this.scrollOffset + 1);
      return -1;
    }

    // Recipe rows
    for (let i = 0; i < this.visibleCount; i++) {
      const ri = i + this.scrollOffset;
      if (ri >= recipes.length) break;
      const ry = listStartY + i * (RECIPE_HEIGHT + RECIPE_GAP);
      if (
        mouseX >= this.panelX + PANEL_PADDING &&
        mouseX <= this.panelX + PANEL_WIDTH - PANEL_PADDING &&
        mouseY >= ry &&
        mouseY <= ry + RECIPE_HEIGHT
      ) {
        const recipe = recipes[ri];
        const craftable = recipe.ingredients.every((ing) => ing.have >= ing.count);
        if (craftable) {
          this.selectedIndex = ri;
          return recipe.result;
        }
        return -1;
      }
    }

    return -1;
  }

  // ---- Private draw helpers ----

  private _drawRecipe(
    recipe: RecipeEntry,
    index: number,
    x: number,
    y: number
  ): void {
    const ctx = this.ctx;
    const w = PANEL_WIDTH - PANEL_PADDING * 2;
    const craftable = recipe.ingredients.every((ing) => ing.have >= ing.count);
    const isHovered = index === this.hoveredIndex;
    const isSelected = index === this.selectedIndex;

    // Background
    ctx.fillStyle = isSelected
      ? COLOR_SELECTED
      : isHovered
      ? COLOR_HOVER
      : "rgba(255,255,255,0.03)";
    ctx.beginPath();
    this._roundRect(x, y, w, RECIPE_HEIGHT, 7);
    ctx.fill();

    // Border
    ctx.strokeStyle = craftable
      ? isHovered
        ? "rgba(74,222,128,0.6)"
        : "rgba(74,222,128,0.2)"
      : "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    this._roundRect(x, y, w, RECIPE_HEIGHT, 7);
    ctx.stroke();

    // Item color swatch
    const swatchSize = 32;
    ctx.fillStyle = craftable ? "#4ade80" : "#374151";
    ctx.beginPath();
    this._roundRect(x + 6, y + (RECIPE_HEIGHT - swatchSize) / 2, swatchSize, swatchSize, 5);
    ctx.fill();

    // Item symbol in swatch
    ctx.fillStyle = "#fff";
    ctx.font = "bold 11px 'Fredoka One', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
      recipe.name.slice(0, 3).toUpperCase(),
      x + 6 + swatchSize / 2,
      y + RECIPE_HEIGHT / 2
    );

    // Recipe name
    ctx.fillStyle = craftable ? "#fff" : "rgba(255,255,255,0.4)";
    ctx.font = `bold 12px 'Fredoka One', sans-serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(recipe.name, x + swatchSize + 14, y + 8);

    // Craftable badge / workshop hint
    if (craftable) {
      ctx.fillStyle = "#4ade80";
      ctx.font = "9px 'Fredoka One', sans-serif";
      ctx.fillText("✓ Craftable", x + swatchSize + 14, y + 22);
    } else if (recipe.requiresWorkbench) {
      ctx.fillStyle = "#f59e0b";
      ctx.font = "9px 'Fredoka One', sans-serif";
      ctx.fillText("(workshop)", x + swatchSize + 14, y + 22);
    }

    // Ingredients
    let ingX = x + swatchSize + 14;
    const ingY = y + RECIPE_HEIGHT - 18;
    for (let i = 0; i < recipe.ingredients.length; i++) {
      const ing = recipe.ingredients[i];
      const ok = ing.have >= ing.count;
      const ingText = `${ing.name.slice(0, 5)}:${ing.have}/${ing.count}`;
      ctx.font = "9px 'Fredoka One', sans-serif";
      ctx.fillStyle = ok ? "#86efac" : "#f87171";
      ctx.textBaseline = "top";
      ctx.textAlign = "left";
      ctx.fillText(ingText, ingX, ingY);
      ingX += ctx.measureText(ingText).width + 8;
      if (ingX > x + w - 10) break; // overflow guard
    }

    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
  }

  private _drawScrollBtn(
    x: number,
    y: number,
    w: number,
    h: number,
    symbol: string,
    active: boolean
  ): void {
    const ctx = this.ctx;
    ctx.fillStyle = active
      ? "rgba(255,255,255,0.07)"
      : "rgba(255,255,255,0.02)";
    ctx.fillRect(x, y, w, h);

    ctx.fillStyle = active
      ? "rgba(255,255,255,0.6)"
      : "rgba(255,255,255,0.15)";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(symbol, x + w / 2, y + h / 2);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
  }

  private _roundRect(
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ): void {
    const ctx = this.ctx;
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

  private _bindKeys(): void {
    document.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === "c" || e.key === "C") {
        this.open = !this.open;
      }
      if (this.open) {
        if (e.key === "Escape") this.open = false;
        if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
          this.scrollOffset = Math.max(0, this.scrollOffset - 1);
        }
        if (e.key === "ArrowDown" || e.key === "ArrowRight") {
          this.scrollOffset++;
        }
      }
    });
  }

  private _bindMouse(): void {
    this.canvas.addEventListener("mousemove", (e: MouseEvent) => {
      if (!this.open) return;
      const rect = this.canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const listStartY =
        this.panelY + HEADER_H + SCROLL_BTN_H + PANEL_PADDING;
      this.hoveredIndex = -1;
      for (let i = 0; i < this.visibleCount; i++) {
        const ri = i + this.scrollOffset;
        const ry = listStartY + i * (RECIPE_HEIGHT + RECIPE_GAP);
        if (
          mx >= this.panelX + PANEL_PADDING &&
          mx <= this.panelX + PANEL_WIDTH - PANEL_PADDING &&
          my >= ry &&
          my <= ry + RECIPE_HEIGHT
        ) {
          this.hoveredIndex = ri;
          break;
        }
      }
    });

    this.canvas.addEventListener("wheel", (e: WheelEvent) => {
      if (!this.open) return;
      const rect = this.canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      if (mx >= this.panelX && mx <= this.panelX + PANEL_WIDTH) {
        e.preventDefault();
        this.scrollOffset = Math.max(
          0,
          this.scrollOffset + (e.deltaY > 0 ? 1 : -1)
        );
      }
    }, { passive: false });
  }
}
