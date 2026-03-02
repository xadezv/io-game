export interface PlayerStats {
  hp: number;
  maxHp: number;
  hunger: number;
  thirst: number;
  temp: number;
  xp: number;
  level: number;
  points: number;
  inventory: [number, number][];
  selectedSlot: number;
  hatId: number;
  killStreak: number;
  durability: number[];
}

interface Bar {
  label: string;
  value: number;
  max: number;
  color: string;
  trackColor: string;
}

const BAR_WIDTH = 150;
const BAR_HEIGHT = 14;
const BAR_GAP = 20;
const BAR_X = 14;
const SLOT_SIZE = 52;
const SLOT_GAP = 6;
const SLOT_COUNT = 10;

// Item name lookup (simplified)
const ITEM_NAMES: Record<number, string> = {
  0: "Empty",
  1: "Wood",
  2: "Stone",
  3: "Food",
  4: "Sword",
  5: "Pickaxe",
  6: "Axe",
  7: "Spear",
  8: "Hammer",
  9: "Bow",
  10: "Arrow",
  11: "Fire",
  12: "Workbench",
  13: "Chest",
  14: "Spike",
  15: "Windmill",
  16: "Mine",
  17: "Apple",
  18: "Cooked Meat",
  19: "Raw Meat",
  20: "Thread",
  21: "Cloth",
  22: "Leather",
  23: "Winter Hat",
  24: "Cape",
};

export default class HUD {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private hoveredSlot: number = -1;

  constructor(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
    this.ctx = ctx;
    this.canvas = canvas;
    this._bindHover();
  }

  private _bindHover(): void {
    this.canvas.addEventListener("mousemove", (e: MouseEvent) => {
      const rect = this.canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      this.hoveredSlot = this._slotAtPoint(mx, my);
    });
  }

  private _slotAtPoint(mx: number, my: number): number {
    const totalWidth = SLOT_COUNT * SLOT_SIZE + (SLOT_COUNT - 1) * SLOT_GAP;
    const startX = (this.canvas.width - totalWidth) / 2;
    const startY = this.canvas.height - SLOT_SIZE - 14;

    for (let i = 0; i < SLOT_COUNT; i++) {
      const sx = startX + i * (SLOT_SIZE + SLOT_GAP);
      if (mx >= sx && mx <= sx + SLOT_SIZE && my >= startY && my <= startY + SLOT_SIZE) {
        return i;
      }
    }
    return -1;
  }

  render(stats: PlayerStats, isNight: boolean): void {
    const ctx = this.ctx;
    const h = this.canvas.height;

    const bars: Bar[] = [
      { label: "HP",     value: stats.hp,     max: stats.maxHp, color: "#e74c3c", trackColor: "#5c1a1a" },
      { label: "Hunger", value: stats.hunger,  max: 100,         color: "#e67e22", trackColor: "#5c3a0a" },
      { label: "Thirst", value: stats.thirst,  max: 100,         color: "#2980b9", trackColor: "#0a2a4a" },
      { label: "Temp",   value: stats.temp,    max: 100,         color: "#1abc9c", trackColor: "#0a3a30" },
    ];

    const totalBarsHeight = bars.length * BAR_HEIGHT + (bars.length - 1) * (BAR_GAP - BAR_HEIGHT);
    // stacked: each bar occupies BAR_GAP px vertically
    const barsBlockHeight = bars.length * BAR_GAP - (BAR_GAP - BAR_HEIGHT);
    // bottom of bars block sits just above inventory
    const inventoryY = h - SLOT_SIZE - 14;
    const barsBottomY = inventoryY - 48; // leave room for level/xp bar
    const firstBarY = barsBottomY - barsBlockHeight;

    // --- Draw level + XP bar ---
    const xpBarY = firstBarY - 28;
    this._drawLevelXP(stats, BAR_X, xpBarY);

    // Equipped hat indicator
    if (stats.hatId !== -1) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.beginPath();
      this._roundRect(BAR_X + BAR_WIDTH + 10, xpBarY - 2, 42, 24, 6);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.font = "10px 'Fredoka One', sans-serif";
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const label = stats.hatId === 50 ? 'WINTER' : (stats.hatId === 51 ? 'COWBOY' : `HAT ${stats.hatId}`);
      ctx.fillText('🎩', BAR_X + BAR_WIDTH + 22, xpBarY + 10);
      ctx.fillText(label.slice(0,6), BAR_X + BAR_WIDTH + 31, xpBarY + 10);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
    }

    // --- Draw status bars ---
    bars.forEach((bar, i) => {
      const by = firstBarY + i * BAR_GAP;
      this._drawBar(bar, BAR_X, by);
    });

    // --- Day/Night indicator top-right ---
    this._drawDayNight(isNight);

    // --- Kill streak badge ---
    if (stats.killStreak >= 2) {
      this._drawKillStreak(stats.killStreak);
    }
  }

  private _drawBar(bar: Bar, x: number, y: number): void {
    const ctx = this.ctx;
    const ratio = Math.max(0, Math.min(1, bar.value / bar.max));

    // Shadow
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = 4;

    // Track
    ctx.fillStyle = bar.trackColor;
    ctx.beginPath();
    this._roundRect(x, y, BAR_WIDTH, BAR_HEIGHT, 4);
    ctx.fill();

    ctx.restore();

    // Fill
    if (ratio > 0) {
      ctx.save();
      ctx.beginPath();
      this._roundRect(x, y, BAR_WIDTH * ratio, BAR_HEIGHT, 4);
      ctx.clip();
      const grad = ctx.createLinearGradient(x, y, x, y + BAR_HEIGHT);
      grad.addColorStop(0, this._lighten(bar.color, 40));
      grad.addColorStop(1, bar.color);
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, BAR_WIDTH * ratio, BAR_HEIGHT);
      ctx.restore();
    }

    // Border
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    this._roundRect(x, y, BAR_WIDTH, BAR_HEIGHT, 4);
    ctx.stroke();

    // Label
    ctx.fillStyle = "#fff";
    ctx.font = "bold 10px 'Fredoka One', sans-serif";
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.fillText(bar.label, x + 4, y + BAR_HEIGHT / 2);

    // Value text right-aligned inside bar
    ctx.textAlign = "right";
    ctx.font = "10px 'Fredoka One', sans-serif";
    const valStr = `${Math.ceil(bar.value)}/${bar.max}`;
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillText(valStr, x + BAR_WIDTH - 4, y + BAR_HEIGHT / 2);
    ctx.textAlign = "left";
  }

  private _drawLevelXP(stats: PlayerStats, x: number, y: number): void {
    const ctx = this.ctx;
    const xpToNext = stats.level * 100;
    const ratio = Math.min(1, stats.xp / xpToNext);

    // XP track
    ctx.fillStyle = "#1a1a3a";
    ctx.beginPath();
    this._roundRect(x, y + 14, BAR_WIDTH, 8, 3);
    ctx.fill();

    // XP fill
    if (ratio > 0) {
      ctx.save();
      ctx.beginPath();
      this._roundRect(x, y + 14, BAR_WIDTH * ratio, 8, 3);
      ctx.clip();
      const grad = ctx.createLinearGradient(x, y + 14, x + BAR_WIDTH, y + 14);
      grad.addColorStop(0, "#a855f7");
      grad.addColorStop(1, "#7c3aed");
      ctx.fillStyle = grad;
      ctx.fillRect(x, y + 14, BAR_WIDTH * ratio, 8);
      ctx.restore();
    }

    // XP border
    ctx.strokeStyle = "rgba(168,85,247,0.4)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    this._roundRect(x, y + 14, BAR_WIDTH, 8, 3);
    ctx.stroke();

    // Level badge
    ctx.fillStyle = "#7c3aed";
    ctx.beginPath();
    this._roundRect(x, y, 26, 12, 3);
    ctx.fill();

    ctx.fillStyle = "#fff";
    ctx.font = "bold 9px 'Fredoka One', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`LV${stats.level}`, x + 13, y + 6);

    // XP text
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = "9px 'Fredoka One', sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`${stats.xp}/${xpToNext} XP`, x + BAR_WIDTH, y + 6);

    // Points
    ctx.fillStyle = "#f1c40f";
    ctx.font = "bold 10px 'Fredoka One', sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`⭐ ${stats.points} pts`, x + 30, y + 6);

    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
  }

  private _drawDayNight(isNight: boolean): void {
    const ctx = this.ctx;
    const cx = this.canvas.width - 44;
    const cy = 44;
    const r = 22;

    // Outer glow
    ctx.save();
    ctx.shadowBlur = 20;
    ctx.shadowColor = isNight ? "#a78bfa" : "#fbbf24";

    // Circle background
    const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    if (isNight) {
      bgGrad.addColorStop(0, "#1e1b4b");
      bgGrad.addColorStop(1, "#0f0a1e");
    } else {
      bgGrad.addColorStop(0, "#fef3c7");
      bgGrad.addColorStop(1, "#d97706");
    }
    ctx.fillStyle = bgGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Icon
    ctx.save();
    ctx.fillStyle = isNight ? "#c4b5fd" : "#fbbf24";
    ctx.font = `${r}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(isNight ? "🌙" : "☀️", cx, cy);
    ctx.restore();

    // Border
    ctx.strokeStyle = isNight ? "rgba(167,139,250,0.6)" : "rgba(251,191,36,0.6)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    // Label
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = "10px 'Fredoka One', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(isNight ? "Night" : "Day", cx, cy + r + 4);
    ctx.textBaseline = "alphabetic";
  }

  renderInventory(stats: PlayerStats): void {
    const ctx = this.ctx;
    const totalWidth = SLOT_COUNT * SLOT_SIZE + (SLOT_COUNT - 1) * SLOT_GAP;
    const startX = (this.canvas.width - totalWidth) / 2;
    const startY = this.canvas.height - SLOT_SIZE - 14;

    for (let i = 0; i < SLOT_COUNT; i++) {
      const sx = startX + i * (SLOT_SIZE + SLOT_GAP);
      const sy = startY;
      const [itemId, count] = stats.inventory[i] ?? [0, 0];
      const isSelected = i === stats.selectedSlot;
      const isHovered = i === this.hoveredSlot;

      // Slot shadow
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.6)";
      ctx.shadowBlur = 8;

      // Slot background
      if (isSelected) {
        const grad = ctx.createLinearGradient(sx, sy, sx, sy + SLOT_SIZE);
        grad.addColorStop(0, "rgba(60,50,10,0.92)");
        grad.addColorStop(1, "rgba(30,25,5,0.92)");
        ctx.fillStyle = grad;
      } else if (isHovered) {
        ctx.fillStyle = "rgba(255,255,255,0.15)";
      } else {
        ctx.fillStyle = "rgba(20,20,30,0.82)";
      }
      ctx.beginPath();
      this._roundRect(sx, sy, SLOT_SIZE, SLOT_SIZE, 6);
      ctx.fill();
      ctx.restore();

      // Border
      ctx.lineWidth = isSelected ? 2.5 : 1.5;
      ctx.strokeStyle = isSelected
        ? "#f1c40f"
        : isHovered
        ? "rgba(255,255,255,0.5)"
        : "rgba(255,255,255,0.18)";
      ctx.beginPath();
      this._roundRect(sx, sy, SLOT_SIZE, SLOT_SIZE, 6);
      ctx.stroke();

      // Slot number
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.font = "9px 'Fredoka One', sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText(String(i === 9 ? 0 : i + 1), sx + 4, sy + 3);

      // Item content
      if (itemId > 0) {
        // Item icon placeholder — colored square with item id
        const itemColor = this._itemColor(itemId);
        ctx.fillStyle = itemColor;
        ctx.beginPath();
        this._roundRect(sx + 8, sy + 10, SLOT_SIZE - 16, SLOT_SIZE - 22, 4);
        ctx.fill();

        // Item id text (center)
        ctx.fillStyle = "#fff";
        ctx.font = "bold 11px 'Fredoka One', sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(
          ITEM_NAMES[itemId]?.slice(0, 4) ?? `#${itemId}`,
          sx + SLOT_SIZE / 2,
          sy + SLOT_SIZE / 2 - 2
        );

        const maxDurability = this._maxDurability(itemId);
        const remainingDurability = this._durabilityForSlot(stats, i);
        if (maxDurability > 0 && remainingDurability >= 0 && remainingDurability < maxDurability * 0.5) {
          const ratio = Math.max(0, Math.min(1, remainingDurability / maxDurability));
          const barX = sx + 7;
          const barY = sy + SLOT_SIZE - 12;
          const barW = SLOT_SIZE - 14;
          const barH = 4;
          ctx.fillStyle = 'rgba(0,0,0,0.7)';
          ctx.fillRect(barX, barY, barW, barH);
          ctx.fillStyle = '#f59e0b';
          ctx.fillRect(barX, barY, barW * ratio, barH);
        }

        // Count badge
        if (count > 1) {
          const badgeX = sx + SLOT_SIZE - 5;
          const badgeY = sy + SLOT_SIZE - 5;
          ctx.fillStyle = "rgba(0,0,0,0.75)";
          ctx.beginPath();
          ctx.arc(badgeX - 7, badgeY - 7, 9, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = "#fff";
          ctx.font = "bold 9px 'Fredoka One', sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(String(count), badgeX - 7, badgeY - 7);
        }
      }

      // Hover tooltip: item name below slots
      if (isHovered && itemId > 0) {
        const name = ITEM_NAMES[itemId] ?? `Item ${itemId}`;
        const tooltipY = startY + SLOT_SIZE + 6;
        ctx.fillStyle = "rgba(0,0,0,0.8)";
        const tw = ctx.measureText(name).width + 14;
        ctx.beginPath();
        this._roundRect(sx + SLOT_SIZE / 2 - tw / 2, tooltipY, tw, 18, 4);
        ctx.fill();

        ctx.fillStyle = "#fff";
        ctx.font = "11px 'Fredoka One', sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(name, sx + SLOT_SIZE / 2, tooltipY + 9);
      }
    }

    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
  }

  private _drawKillStreak(streak: number): void {
    const ctx = this.ctx;
    const label = `${streak}x STREAK`;
    ctx.font = "bold 18px 'Fredoka One', sans-serif";
    const textW = ctx.measureText(label).width;
    const padX = 16;
    const padY = 10;
    const badgeW = textW + padX * 2;
    const badgeH = 36;
    const cx = this.canvas.width / 2;
    const by = 14;

    // Glow
    ctx.save();
    ctx.shadowColor = "#f1c40f";
    ctx.shadowBlur = 18;

    // Badge background
    ctx.fillStyle = "rgba(30, 20, 0, 0.88)";
    ctx.beginPath();
    this._roundRect(cx - badgeW / 2, by, badgeW, badgeH, 8);
    ctx.fill();
    ctx.restore();

    // Badge border
    ctx.strokeStyle = "#f1c40f";
    ctx.lineWidth = 2;
    ctx.beginPath();
    this._roundRect(cx - badgeW / 2, by, badgeW, badgeH, 8);
    ctx.stroke();

    // Badge text
    ctx.fillStyle = "#f1c40f";
    ctx.font = "bold 18px 'Fredoka One', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, cx, by + badgeH / 2);

    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
  }

  // ---- Helpers ----

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

  private _lighten(hex: string, amount: number): string {
    const num = parseInt(hex.slice(1), 16);
    const r = Math.min(255, (num >> 16) + amount);
    const g = Math.min(255, ((num >> 8) & 0xff) + amount);
    const b = Math.min(255, (num & 0xff) + amount);
    return `rgb(${r},${g},${b})`;
  }


  private _durabilityForSlot(stats: PlayerStats, slotIndex: number): number {
    for (let i = 0; i < stats.durability.length; i += 2) {
      if (stats.durability[i] === slotIndex) return stats.durability[i + 1] ?? -1;
    }
    return -1;
  }

  private _maxDurability(itemId: number): number {
    if (itemId === 6 || itemId === 7 || itemId === 8) return 200;
    return 0;
  }

  private _itemColor(itemId: number): string {
    const palette = [
      "#4ade80", "#60a5fa", "#f87171", "#fbbf24", "#a78bfa",
      "#34d399", "#fb923c", "#38bdf8", "#e879f9", "#a3e635",
    ];
    return palette[itemId % palette.length];
  }
}
