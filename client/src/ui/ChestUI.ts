export default class ChestUI {
  private open = false;
  private slots: [number, number][] = [];

  show(slots: [number, number][]): void {
    this.slots = slots;
    this.open = true;
  }

  hide(): void {
    this.open = false;
  }

  render(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
    if (!this.open) return;

    const w = 320;
    const h = 220;
    const x = (canvas.width - w) / 2;
    const y = (canvas.height - h) / 2;

    ctx.fillStyle = 'rgba(10,10,20,0.88)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.strokeRect(x, y, w, h);

    ctx.fillStyle = '#fff';
    ctx.font = "16px 'Fredoka One', sans-serif";
    ctx.fillText('Chest', x + 12, y + 24);

    for (let i = 0; i < 10; i++) {
      const col = i % 5;
      const row = Math.floor(i / 5);
      const sx = x + 12 + col * 60;
      const sy = y + 40 + row * 80;

      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(sx, sy, 52, 52);

      const slot = this.slots[i] ?? [-1, 0];
      if (slot[1] > 0) {
        ctx.fillStyle = '#fbbf24';
        ctx.font = "11px 'Fredoka One', sans-serif";
        ctx.fillText(`#${slot[0]}`, sx + 6, sy + 22);
        ctx.fillStyle = '#fff';
        ctx.fillText(`x${slot[1]}`, sx + 6, sy + 40);
      }
    }

    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = "11px 'Fredoka One', sans-serif";
    ctx.fillText('Press E to refresh/close', x + 12, y + h - 10);
  }
}
