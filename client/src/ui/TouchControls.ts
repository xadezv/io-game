export default class TouchControls {
  private moveCb: ((dir: number) => void) | null = null;
  private attackCb: ((angle: number) => void) | null = null;
  private baseX = 0;
  private baseY = 0;
  private knobX = 0;
  private knobY = 0;
  private touchId: number | null = null;
  private overlay: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;

  init(): void {
    this.overlay = document.createElement('canvas');
    this.overlay.width = window.innerWidth;
    this.overlay.height = window.innerHeight;
    this.overlay.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:90;';
    document.body.appendChild(this.overlay);
    this.ctx = this.overlay.getContext('2d');

    window.addEventListener('resize', () => {
      if (!this.overlay) return;
      this.overlay.width = window.innerWidth;
      this.overlay.height = window.innerHeight;
    });

    window.addEventListener('touchstart', this.onStart, { passive: false });
    window.addEventListener('touchmove', this.onMove, { passive: false });
    window.addEventListener('touchend', this.onEnd, { passive: false });
    window.addEventListener('touchcancel', this.onEnd, { passive: false });

    this.loop();
  }

  onMoveDir(cb: (dir: number) => void): void { this.moveCb = cb; }
  onAttack(cb: (angle: number) => void): void { this.attackCb = cb; }

  private loop = (): void => {
    requestAnimationFrame(this.loop);
    if (!this.ctx || !this.overlay) return;

    this.ctx.clearRect(0, 0, this.overlay.width, this.overlay.height);
    if (this.touchId === null) return;

    this.ctx.fillStyle = 'rgba(255,255,255,0.18)';
    this.ctx.beginPath();
    this.ctx.arc(this.baseX, this.baseY, 60, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = 'rgba(255,255,255,0.35)';
    this.ctx.beginPath();
    this.ctx.arc(this.knobX, this.knobY, 30, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private onStart = (e: TouchEvent): void => {
    e.preventDefault();
    for (const t of Array.from(e.changedTouches)) {
      if (t.clientX < window.innerWidth / 2 && this.touchId === null) {
        this.touchId = t.identifier;
        this.baseX = this.knobX = t.clientX;
        this.baseY = this.knobY = t.clientY;
      }
      if (t.clientX >= window.innerWidth / 2) {
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;
        this.attackCb?.(Math.atan2(t.clientY - cy, t.clientX - cx));
      }
    }
  }

  private onMove = (e: TouchEvent): void => {
    e.preventDefault();
    if (this.touchId === null) return;
    const t = Array.from(e.touches).find(x => x.identifier === this.touchId);
    if (!t) return;

    const dx0 = t.clientX - this.baseX;
    const dy0 = t.clientY - this.baseY;
    const len = Math.hypot(dx0, dy0);
    const max = 60;
    const dx = len > max ? (dx0 / len) * max : dx0;
    const dy = len > max ? (dy0 / len) * max : dy0;

    this.knobX = this.baseX + dx;
    this.knobY = this.baseY + dy;

    const th = 20;
    let dir = 0;
    if (dx < -th) dir |= 1;
    if (dx > th) dir |= 2;
    if (dy > th) dir |= 4;
    if (dy < -th) dir |= 8;
    this.moveCb?.(dir);
  }

  private onEnd = (e: TouchEvent): void => {
    e.preventDefault();
    if (this.touchId === null) return;
    for (const t of Array.from(e.changedTouches)) {
      if (t.identifier === this.touchId) {
        this.touchId = null;
        this.moveCb?.(0);
      }
    }
  }
}
