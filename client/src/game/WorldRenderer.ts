import { Renderer } from '../engine/Renderer';
import { Camera } from '../engine/Camera';
import { AssetLoader } from '../engine/AssetLoader';
import { MAP_SIZE, TILE_SIZE } from '../../../shared/constants';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WorldData {
  seed:   number;
  tiles:  Uint8Array; // flat [TILES_COUNT × TILES_COUNT], values 0–4
  biomes: Uint8Array; // same layout, BiomeType values
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TILES_COUNT = MAP_SIZE / TILE_SIZE; // 450 × 450

/**
 * Colours per tile type index (0–4).
 * 0 grass | 1 sand | 2 snow | 3 water | 4 dark-grass
 */
const TILE_COLORS: readonly string[] = [
  '#7ec850', // 0 grass
  '#e8d06c', // 1 sand
  '#dce9f5', // 2 snow
  '#5b9bd5', // 3 water
  '#5a9e35', // 4 dark-grass (dense forest floor)
];

/** Asset-loader sprite key per tile type index. */
const TILE_IMAGE_KEYS: readonly string[] = [
  'ground_grass',
  'ground_sand',
  'ground_snow',
  'ground_water',
  'ground_dark',
];

// ---------------------------------------------------------------------------
// WorldRenderer
// ---------------------------------------------------------------------------

export class WorldRenderer {
  private readonly renderer:  Renderer;
  private readonly assets:    AssetLoader;
  private worldData:          WorldData | null = null;

  constructor(
    renderer: Renderer,
    mapData:  { seed: number; tiles: Uint8Array; biomes: Uint8Array },
    assets:   AssetLoader,
  ) {
    this.renderer  = renderer;
    this.assets    = assets;
    this.worldData = mapData;
  }

  // Allow the GameClient to swap in map data after the handshake arrives.
  setWorldData(data: WorldData): void {
    this.worldData = data;
  }

  // -------------------------------------------------------------------------
  // Main render entry-point
  // -------------------------------------------------------------------------

  render(camera: Camera, isNight: boolean): void {
    if (!this.worldData) return;

    const { ctx }  = this.renderer;
    const { tiles } = this.worldData;

    // ------------------------------------------------------------------
    // Visible tile range — viewport culling
    // ------------------------------------------------------------------
    const halfW = (camera.width  * 0.5) / camera.zoom;
    const halfH = (camera.height * 0.5) / camera.zoom;

    const minTX = Math.max(0,               Math.floor((camera.x - halfW) / TILE_SIZE));
    const maxTX = Math.min(TILES_COUNT - 1,  Math.ceil((camera.x + halfW) / TILE_SIZE));
    const minTY = Math.max(0,               Math.floor((camera.y - halfH) / TILE_SIZE));
    const maxTY = Math.min(TILES_COUNT - 1,  Math.ceil((camera.y + halfH) / TILE_SIZE));

    // Pixel size of one tile on screen (constant for this frame)
    const tileScreenSize = TILE_SIZE * camera.zoom;

    // ------------------------------------------------------------------
    // Draw tiles row-by-row
    // ------------------------------------------------------------------
    for (let ty = minTY; ty <= maxTY; ty++) {
      for (let tx = minTX; tx <= maxTX; tx++) {
        const tileVal = Math.max(0, Math.min(4, tiles[ty * TILES_COUNT + tx]));

        // World-space top-left corner of this tile
        const screen = camera.worldToScreen(tx * TILE_SIZE, ty * TILE_SIZE);
        const sx = screen.x;
        const sy = screen.y;

        // +0.5 px overlap eliminates sub-pixel seams between tiles
        const sz = tileScreenSize + 0.5;

        const imgKey = TILE_IMAGE_KEYS[tileVal];
        const img    = this.assets.get(imgKey);

        if (img && img.complete && img.naturalWidth > 0) {
          ctx.drawImage(img, sx, sy, sz, sz);
        } else {
          ctx.fillStyle = TILE_COLORS[tileVal];
          ctx.fillRect(sx, sy, sz, sz);
        }

        // Water tiles: add a subtle inner-stroke shimmer
        if (tileVal === 3) {
          ctx.save();
          ctx.globalAlpha  = 0.14;
          ctx.strokeStyle  = '#ffffff';
          ctx.lineWidth    = Math.max(0.5, camera.zoom * 0.5);
          ctx.strokeRect(sx + 1, sy + 1, tileScreenSize - 2, tileScreenSize - 2);
          ctx.restore();
        }
      }
    }

    // ------------------------------------------------------------------
    // Optional grid lines — only visible when zoomed in
    // ------------------------------------------------------------------
    if (camera.zoom > 1.5) {
      ctx.save();
      ctx.strokeStyle = 'rgba(0,0,0,0.07)';
      ctx.lineWidth   = 0.5;
      ctx.beginPath();

      // Vertical lines
      for (let tx = minTX; tx <= maxTX + 1; tx++) {
        const wx  = tx * TILE_SIZE;
        const top = camera.worldToScreen(wx, minTY * TILE_SIZE);
        const bot = camera.worldToScreen(wx, (maxTY + 1) * TILE_SIZE);
        ctx.moveTo(top.x, top.y);
        ctx.lineTo(bot.x, bot.y);
      }
      // Horizontal lines
      for (let ty = minTY; ty <= maxTY + 1; ty++) {
        const wy  = ty * TILE_SIZE;
        const lft = camera.worldToScreen(minTX * TILE_SIZE, wy);
        const rgt = camera.worldToScreen((maxTX + 1) * TILE_SIZE, wy);
        ctx.moveTo(lft.x, lft.y);
        ctx.lineTo(rgt.x, rgt.y);
      }

      ctx.stroke();
      ctx.restore();
    }

    // ------------------------------------------------------------------
    // Night overlay — drawn on top of tiles, below entities
    // ------------------------------------------------------------------
    if (isNight) {
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,30,0.5)';
      ctx.fillRect(0, 0, camera.width, camera.height);
      ctx.restore();
    }
  }
}
