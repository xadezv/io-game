import { Camera } from './Camera';

export const MoveDir = { LEFT: 1, RIGHT: 2, DOWN: 4, UP: 8 } as const;

export class Input {
  readonly keys = new Map<string, boolean>();
  mouse = { x: 0, y: 0, worldX: 0, worldY: 0, down: false, angle: 0 };

  /** Current move bitmask — updated each frame */
  moveDir = 0;

  onMouseClick?: (x: number, y: number, angle: number, button: number) => void;
  onKeyPress?:   (key: string) => void;

  private _canvas: HTMLCanvasElement | null = null;
  private _kd!: (e: KeyboardEvent) => void;
  private _ku!: (e: KeyboardEvent) => void;
  private _mm!: (e: MouseEvent) => void;
  private _md!: (e: MouseEvent) => void;
  private _mu!: (e: MouseEvent) => void;
  private _cm!: (e: Event) => void;
  private _camera: Camera | null = null;

  /** Attach all event listeners */
  attach(canvas: HTMLCanvasElement, camera: Camera): void {
    this.detach();
    this._canvas = canvas;
    this._camera = camera;

    this._kd = (e) => {
      if (!this.keys.get(e.key)) this.onKeyPress?.(e.key);
      this.keys.set(e.key, true);
    };
    this._ku = (e) => this.keys.set(e.key, false);
    this._mm = (e) => {
      const rect = canvas.getBoundingClientRect();
      this.mouse.x = e.clientX - rect.left;
      this.mouse.y = e.clientY - rect.top;
      this.updateMouseWorld(camera);
    };
    this._md = (e) => {
      this.mouse.down = true;
      const rect = canvas.getBoundingClientRect();
      const sx   = e.clientX - rect.left;
      const sy   = e.clientY - rect.top;
      const angle = Math.atan2(sy - camera.height * 0.5, sx - camera.width * 0.5);
      this.onMouseClick?.(sx, sy, angle, e.button);
    };
    this._mu = () => { this.mouse.down = false; };
    this._cm = (e) => e.preventDefault();

    window.addEventListener('keydown', this._kd);
    window.addEventListener('keyup',   this._ku);
    canvas.addEventListener('mousemove',   this._mm);
    canvas.addEventListener('mousedown',   this._md);
    canvas.addEventListener('mouseup',     this._mu);
    canvas.addEventListener('contextmenu', this._cm);
  }

  /** Remove all event listeners */
  detach(): void {
    if (!this._canvas) return;
    window.removeEventListener('keydown', this._kd);
    window.removeEventListener('keyup',   this._ku);
    this._canvas.removeEventListener('mousemove',   this._mm);
    this._canvas.removeEventListener('mousedown',   this._md);
    this._canvas.removeEventListener('mouseup',     this._mu);
    this._canvas.removeEventListener('contextmenu', this._cm);
    this._canvas = null;
  }

  /** Compute bitmask from current keys and store in moveDir */
  updateMoveDir(): number {
    let m = 0;
    if (this.keys.get('a') || this.keys.get('ArrowLeft'))  m |= MoveDir.LEFT;
    if (this.keys.get('d') || this.keys.get('ArrowRight')) m |= MoveDir.RIGHT;
    if (this.keys.get('s') || this.keys.get('ArrowDown'))  m |= MoveDir.DOWN;
    if (this.keys.get('w') || this.keys.get('ArrowUp'))    m |= MoveDir.UP;
    this.moveDir = m;
    return m;
  }

  getMoveDirBitmask(): number { return this.updateMoveDir(); }

  updateMouseWorld(camera: Camera): void {
    const w = camera.screenToWorld(this.mouse.x, this.mouse.y);
    this.mouse.worldX = w.x;
    this.mouse.worldY = w.y;
    this.mouse.angle  = Math.atan2(
      this.mouse.y - camera.height * 0.5,
      this.mouse.x - camera.width  * 0.5,
    );
  }

  isDown(key: string): boolean { return this.keys.get(key) === true; }
}

export default Input;
