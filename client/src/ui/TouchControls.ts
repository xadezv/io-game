export default class TouchControls {
  private moveCb: ((dir: number) => void) | null = null;
  private attackCb: ((angle: number) => void) | null = null;
  private baseX = 100;
  private baseY = 0;
  private knobX = 100;
  private knobY = 0;
  private touchId: number | null = null;

  init(): void {
    this.baseY = window.innerHeight - 110;
    this.knobY = this.baseY;
    window.addEventListener('touchstart', this.onStart, { passive: false });
    window.addEventListener('touchmove', this.onMove, { passive: false });
    window.addEventListener('touchend', this.onEnd, { passive: false });
  }

  onMoveDir(cb: (dir: number) => void): void { this.moveCb = cb; }
  onAttack(cb: (angle: number) => void): void { this.attackCb = cb; }

  private onStart = (e: TouchEvent): void => {
    for (const t of Array.from(e.changedTouches)) {
      if (t.clientX < window.innerWidth / 2 && this.touchId === null) this.touchId = t.identifier;
      if (t.clientX >= window.innerWidth / 2) {
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;
        this.attackCb?.(Math.atan2(t.clientY - cy, t.clientX - cx));
      }
    }
  }

  private onMove = (e: TouchEvent): void => {
    if (this.touchId === null) return;
    const t = Array.from(e.touches).find(x => x.identifier === this.touchId);
    if (!t) return;
    const dx = t.clientX - this.baseX;
    const dy = t.clientY - this.baseY;
    const th = 20;
    let dir = 0;
    if (dx < -th) dir |= 1;
    if (dx > th) dir |= 2;
    if (dy > th) dir |= 4;
    if (dy < -th) dir |= 8;
    this.moveCb?.(dir);
  }

  private onEnd = (e: TouchEvent): void => {
    if (this.touchId === null) return;
    for (const t of Array.from(e.changedTouches)) {
      if (t.identifier === this.touchId) {
        this.touchId = null;
        this.moveCb?.(0);
      }
    }
  }
}
