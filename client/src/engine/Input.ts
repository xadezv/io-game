import Camera from './Camera';

/**
 * Bitmask values for movement directions.
 * Matches the server-side protocol.
 */
export const MoveDir = {
  LEFT:  1,
  RIGHT: 2,
  DOWN:  4,
  UP:    8,
} as const;

export type MoveDirBitmask = number;

/**
 * Input — centralises keyboard and mouse state for a canvas-based game.
 */
export class Input {
  /** Live keyboard state: key name -> pressed. */
  readonly keys: Map<string, boolean> = new Map();

  /** Live mouse state in both screen and world space. */
  readonly mouse: {
    x: number;
    y: number;
    worldX: number;
    worldY: number;
    down: boolean;
    angle: number;
  } = {
    x: 0,
    y: 0,
    worldX: 0,
    worldY: 0,
    down: false,
    angle: 0,
  };

  private canvas: HTMLCanvasElement | null = null;

  /**
   * Attach keyboard and mouse event listeners to the given canvas.
   * Safe to call multiple times — previous listeners are removed first.
   */
  init(canvas: HTMLCanvasElement, camera: Camera): void {
    this.canvas = canvas;

    // ── Keyboard ────────────────────────────────────────────────────────────
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      this.keys.set(e.key, true);
    });

    window.addEventListener('keyup', (e: KeyboardEvent) => {
      this.keys.set(e.key, false);
    });

    // ── Mouse ────────────────────────────────────────────────────────────────
    canvas.addEventListener('mousemove', (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      this.mouse.x = e.clientX - rect.left;
      this.mouse.y = e.clientY - rect.top;
      this.updateMouseWorld(camera);
    });

    canvas.addEventListener('mousedown', () => {
      this.mouse.down = true;
    });

    canvas.addEventListener('mouseup', () => {
      this.mouse.down = false;
    });

    // Prevent the context menu from stealing mouseup events
    canvas.addEventListener('contextmenu', (e: Event) => {
      e.preventDefault();
    });
  }

  /**
   * Recalculate the world-space mouse position and cursor angle relative to
   * the canvas centre.  Call this after the camera has been updated.
   */
  updateMouseWorld(camera: Camera): void {
    const world = camera.screenToWorld(this.mouse.x, this.mouse.y);
    this.mouse.worldX = world.x;
    this.mouse.worldY = world.y;
    this.mouse.angle = Math.atan2(
      this.mouse.y - camera.height / 2,
      this.mouse.x - camera.width  / 2,
    );
  }

  /**
   * Build a movement bitmask from the current WASD / arrow-key state.
   *
   * LEFT=1  RIGHT=2  DOWN=4  UP=8
   */
  getMoveDirBitmask(): MoveDirBitmask {
    let mask = 0;

    const left  = this.keys.get('a') || this.keys.get('A') || this.keys.get('ArrowLeft')  || false;
    const right = this.keys.get('d') || this.keys.get('D') || this.keys.get('ArrowRight') || false;
    const down  = this.keys.get('s') || this.keys.get('S') || this.keys.get('ArrowDown')  || false;
    const up    = this.keys.get('w') || this.keys.get('W') || this.keys.get('ArrowUp')    || false;

    if (left)  mask |= MoveDir.LEFT;
    if (right) mask |= MoveDir.RIGHT;
    if (down)  mask |= MoveDir.DOWN;
    if (up)    mask |= MoveDir.UP;

    return mask;
  }
}

export default Input;
