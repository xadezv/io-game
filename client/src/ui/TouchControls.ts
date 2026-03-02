export default class TouchControls {
  private moveCb: ((dir: number) => void) | null = null;
  private attackCb: ((angle: number) => void) | null = null;

  private baseX = 100;
  private baseY = 0;
  private knobX = 100;
  private knobY = 0;
  private touchId: number | null = null;

  private readonly baseRadius = 60;
  private readonly knobRadius = 30;

  private baseEl: HTMLDivElement | null = null;
  private knobEl: HTMLDivElement | null = null;

  init(): void {
    this.baseY = window.innerHeight - 110;
    this.knobY = this.baseY;
    this.createJoystickElements();
    this.updateJoystickVisual(false);

    window.addEventListener('touchstart', this.onStart, { passive: false });
    window.addEventListener('touchmove', this.onMove, { passive: false });
    window.addEventListener('touchend', this.onEnd, { passive: false });
    window.addEventListener('touchcancel', this.onEnd, { passive: false });
  }

  onMoveDir(cb: (dir: number) => void): void { this.moveCb = cb; }
  onAttack(cb: (angle: number) => void): void { this.attackCb = cb; }

  private createJoystickElements(): void {
    this.baseEl = document.createElement('div');
    this.baseEl.style.position = 'fixed';
    this.baseEl.style.width = `${this.baseRadius * 2}px`;
    this.baseEl.style.height = `${this.baseRadius * 2}px`;
    this.baseEl.style.borderRadius = '50%';
    this.baseEl.style.background = 'rgba(255, 255, 255, 0.18)';
    this.baseEl.style.border = '2px solid rgba(255, 255, 255, 0.35)';
    this.baseEl.style.pointerEvents = 'none';
    this.baseEl.style.zIndex = '30';

    this.knobEl = document.createElement('div');
    this.knobEl.style.position = 'fixed';
    this.knobEl.style.width = `${this.knobRadius * 2}px`;
    this.knobEl.style.height = `${this.knobRadius * 2}px`;
    this.knobEl.style.borderRadius = '50%';
    this.knobEl.style.background = 'rgba(255, 255, 255, 0.3)';
    this.knobEl.style.border = '2px solid rgba(255, 255, 255, 0.45)';
    this.knobEl.style.pointerEvents = 'none';
    this.knobEl.style.zIndex = '31';

    document.body.appendChild(this.baseEl);
    document.body.appendChild(this.knobEl);
  }

  private updateJoystickVisual(visible: boolean): void {
    if (!this.baseEl || !this.knobEl) return;

    this.baseEl.style.left = `${this.baseX - this.baseRadius}px`;
    this.baseEl.style.top = `${this.baseY - this.baseRadius}px`;
    this.knobEl.style.left = `${this.knobX - this.knobRadius}px`;
    this.knobEl.style.top = `${this.knobY - this.knobRadius}px`;

    this.baseEl.style.display = visible ? 'block' : 'none';
    this.knobEl.style.display = visible ? 'block' : 'none';
  }

  private onStart = (e: TouchEvent): void => {
    e.preventDefault();

    for (const t of Array.from(e.changedTouches)) {
      if (t.clientX < window.innerWidth / 2 && this.touchId === null) {
        this.touchId = t.identifier;
        this.baseX = t.clientX;
        this.baseY = t.clientY;
        this.knobX = t.clientX;
        this.knobY = t.clientY;
        this.updateJoystickVisual(true);
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

    const rawDx = t.clientX - this.baseX;
    const rawDy = t.clientY - this.baseY;
    const dist = Math.hypot(rawDx, rawDy);
    const maxDist = this.baseRadius;
    const scale = dist > maxDist ? maxDist / dist : 1;
    const dx = rawDx * scale;
    const dy = rawDy * scale;

    this.knobX = this.baseX + dx;
    this.knobY = this.baseY + dy;
    this.updateJoystickVisual(true);

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
        this.knobX = this.baseX;
        this.knobY = this.baseY;
        this.updateJoystickVisual(false);
        this.moveCb?.(0);
      }
    }
  }
}
