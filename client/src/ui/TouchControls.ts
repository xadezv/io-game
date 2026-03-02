export default class TouchControls {
  private moveCb: ((dir: number) => void) | null = null;
  private attackCb: ((angle: number) => void) | null = null;

  private baseX = 0;
  private baseY = 0;
  private knobX = 0;
  private knobY = 0;
  private touchId: number | null = null;

  private readonly baseRadius = 60;
  private readonly knobRadius = 30;

  private overlay: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private visible = false;

  init(): void {
    this.ensureOverlay();
    window.addEventListener('touchstart', this.onStart, { passive: false });
    window.addEventListener('touchmove', this.onMove, { passive: false });
    window.addEventListener('touchend', this.onEnd, { passive: false });
    window.addEventListener('touchcancel', this.onEnd, { passive: false });
    window.addEventListener('resize', this.onResize);
  }

  onMoveDir(cb: (dir: number) => void): void { this.moveCb = cb; }
  onAttack(cb: (angle: number) => void): void { this.attackCb = cb; }

  private ensureOverlay(): void {
    if (this.overlay) return;
    const c = document.createElement('canvas');
    c.style.position = 'fixed';
    c.style.left = '0';
    c.style.top = '0';
    c.style.width = '100vw';
    c.style.height = '100vh';
    c.style.pointerEvents = 'none';
    c.style.zIndex = '20';
    document.body.appendChild(c);
    this.overlay = c;
    this.ctx = c.getContext('2d');
    this.onResize();
  }

  private onResize = (): void => {
    if (!this.overlay) return;
    this.overlay.width = window.innerWidth;
    this.overlay.height = window.innerHeight;
    this.draw();
  };

  private onStart = (e: TouchEvent): void => {
    e.preventDefault();
    for (const t of Array.from(e.changedTouches)) {
      if (t.clientX < window.innerWidth / 2 && this.touchId === null) {
        this.touchId = t.identifier;
        this.baseX = t.clientX;
        this.baseY = t.clientY;
        this.knobX = this.baseX;
        this.knobY = this.baseY;
        this.visible = true;
        this.draw();
      }

      if (t.clientX >= window.innerWidth / 2) {
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;
        this.attackCb?.(Math.atan2(t.clientY - cy, t.clientX - cx));
      }
    }
  };

  private onMove = (e: TouchEvent): void => {
    e.preventDefault();
    if (this.touchId === null) return;
    const t = Array.from(e.touches).find((x) => x.identifier === this.touchId);
    if (!t) return;

    const dx = t.clientX - this.baseX;
    const dy = t.clientY - this.baseY;
    const dist = Math.hypot(dx, dy);

    if (dist > this.baseRadius) {
      const k = this.baseRadius / Math.max(dist, 1e-6);
      this.knobX = this.baseX + dx * k;
      this.knobY = this.baseY + dy * k;
    } else {
      this.knobX = t.clientX;
      this.knobY = t.clientY;
    }

    const th = 20;
    let dir = 0;
    if (dx < -th) dir |= 1;
    if (dx > th) dir |= 2;
    if (dy > th) dir |= 4;
    if (dy < -th) dir |= 8;
    this.moveCb?.(dir);

    this.draw();
  };

  private onEnd = (e: TouchEvent): void => {
    e.preventDefault();
    if (this.touchId === null) return;
    for (const t of Array.from(e.changedTouches)) {
      if (t.identifier === this.touchId) {
        this.touchId = null;
        this.visible = false;
        this.moveCb?.(0);
        this.draw();
      }
    }
  };

  private draw(): void {
    if (!this.overlay || !this.ctx) return;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.overlay.width, this.overlay.height);
    if (!this.visible) return;

    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(this.baseX, this.baseY, this.baseRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.beginPath();
    ctx.arc(this.knobX, this.knobY, this.knobRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
