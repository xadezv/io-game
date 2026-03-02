import { Renderer } from '../engine/Renderer';
import { Camera } from '../engine/Camera';
import { ParticleSystem } from './ParticleSystem';
import { AssetLoader } from '../engine/AssetLoader';
import { lerp } from '../engine/AnimationSystem';
import { PLAYER_RADIUS } from '../../../shared/constants';

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

export interface ClientEntity {
  id:           number;
  type:         number;   // EntityType numeric value
  x:            number;   // authoritative server world-x
  y:            number;   // authoritative server world-y
  angle:        number;
  hp:           number;
  maxHp:        number;
  itemId:       number;   // -1 = hand / none
  hatId:        number;   // -1 = no hat
  nickname:     string;
  level:        number;
  isAttacking:  boolean;
  attackAngle:  number;
  renderX:      number;   // smoothed render position
  renderY:      number;
}

export interface AssetLoaderIface {
  images: Map<string, HTMLImageElement>;
}

// ---------------------------------------------------------------------------
// EntityType constants  (const enum cannot cross esbuild boundaries)
// ---------------------------------------------------------------------------

const ET_PLAYER     = 0;
const ET_TREE       = 1;
const ET_STONE      = 2;
const ET_GOLD       = 3;
const ET_BERRY      = 4;
const ET_RABBIT     = 5;
const ET_WOLF       = 6;
const ET_FIRE       = 7;
const ET_WALL_WOOD  = 8;
const ET_WALL_STONE = 9;
const ET_SPIKE      = 10;
const ET_CACTUS     = 11;
const ET_SNOW_TREE  = 12;
const ET_MAMMOTH    = 13;

// ---------------------------------------------------------------------------
// Default maxHP per entity type
// ---------------------------------------------------------------------------

const DEFAULT_MAX_HP: Record<number, number> = {
  [ET_PLAYER]:     100,
  [ET_TREE]:       200,
  [ET_STONE]:      300,
  [ET_GOLD]:       200,
  [ET_BERRY]:       80,
  [ET_RABBIT]:      50,
  [ET_WOLF]:       120,
  [ET_FIRE]:       100,
  [ET_WALL_WOOD]:  200,
  [ET_WALL_STONE]: 400,
  [ET_SPIKE]:      150,
  [ET_CACTUS]:     100,
  [ET_SNOW_TREE]:  200,
  [ET_MAMMOTH]:    500,
};

// ---------------------------------------------------------------------------
// Sprite definitions for non-player entities
// ---------------------------------------------------------------------------

interface SpriteDef {
  key:    string;
  w:      number;
  h:      number;
  rotate: boolean; // whether to rotate sprite to entity.angle
}

const SPRITE_DEFS: Record<number, SpriteDef> = {
  [ET_TREE]:       { key: 'tree',       w: 80, h: 80, rotate: false },
  [ET_SNOW_TREE]:  { key: 'tree_snow',  w: 80, h: 80, rotate: false },
  [ET_STONE]:      { key: 'stone',      w: 60, h: 60, rotate: false },
  [ET_GOLD]:       { key: 'gold',       w: 55, h: 55, rotate: false },
  [ET_BERRY]:      { key: 'berry_bush', w: 50, h: 50, rotate: false },
  [ET_RABBIT]:     { key: 'rabbit',     w: 44, h: 44, rotate: true  },
  [ET_WOLF]:       { key: 'wolf',       w: 56, h: 56, rotate: true  },
  [ET_MAMMOTH]:    { key: 'mammoth',    w: 96, h: 96, rotate: true  },
  [ET_FIRE]:       { key: 'campfire',   w: 64, h: 64, rotate: false },
  [ET_WALL_WOOD]:  { key: 'wall_wood',  w: 72, h: 72, rotate: false },
  [ET_WALL_STONE]: { key: 'wall_stone', w: 72, h: 72, rotate: false },
  [ET_SPIKE]:      { key: 'spike_wood', w: 60, h: 60, rotate: false },
  [ET_CACTUS]:     { key: 'cactus',     w: 52, h: 52, rotate: false },
};

// Weapon sprite lookup by itemId numeric value
const WEAPON_SPRITES: Record<number, string> = {
  0: 'hand',
  1: 'axe',
  2: 'pick',
  3: 'sword',
  4: 'big_axe',
  5: 'big_axe',    // BIG_PICK shares sprite for now
  6: 'gold_axe',
  7: 'gold_sword',
  8: 'gold_axe',   // GOLD_PICK
};

// Hat sprite lookup by hatId (ItemId) numeric value
const HAT_SPRITES: Record<number, string> = {
  50: 'hat_winter',
  51: 'hat_cowboy',
};

// ---------------------------------------------------------------------------
// EntityRenderer
// ---------------------------------------------------------------------------

export class EntityRenderer {
  private readonly renderer:  Renderer;
  private readonly particles: ParticleSystem;
  private readonly assets:    AssetLoader;

  // Tracks fire flicker animation time per entity id
  private readonly fireTimes = new Map<number, number>();

  constructor(renderer: Renderer, particles: ParticleSystem, assets: AssetLoader) {
    this.renderer  = renderer;
    this.particles = particles;
    this.assets    = assets;
  }

  // -------------------------------------------------------------------------
  // Main render pass
  // -------------------------------------------------------------------------

  renderAll(
    entities: Map<number, ClientEntity>,
    myId:     number,
    camera:   Camera,
    dt:       number,
  ): void {
    const LERP_SPEED = 10;

    // 1. Interpolate render positions toward server positions
    for (const e of entities.values()) {
      const t   = Math.min(1, LERP_SPEED * dt);
      e.renderX = lerp(e.renderX, e.x, t);
      e.renderY = lerp(e.renderY, e.y, t);
    }

    // 2. Update fire animation timers
    for (const e of entities.values()) {
      if (e.type === ET_FIRE) {
        this.fireTimes.set(e.id, (this.fireTimes.get(e.id) ?? 0) + dt);
      }
    }

    // 3. Sort: resources first (by Y), then animals, then players on top
    const sorted = Array.from(entities.values()).sort((a, b) => {
      const rankA = a.type === ET_PLAYER ? 2 : (a.type === ET_RABBIT || a.type === ET_WOLF || a.type === ET_MAMMOTH ? 1 : 0);
      const rankB = b.type === ET_PLAYER ? 2 : (b.type === ET_RABBIT || b.type === ET_WOLF || b.type === ET_MAMMOTH ? 1 : 0);
      if (rankA !== rankB) return rankA - rankB;
      return a.renderY - b.renderY;
    });

    // 4. Draw each entity
    for (const e of sorted) {
      if (!camera.isVisible(e.renderX, e.renderY, 100)) continue;

      switch (e.type) {
        case ET_PLAYER:     this.renderPlayer(e, e.id === myId, camera); break;
        case ET_TREE:       this.renderTree(e, camera);    break;
        case ET_SNOW_TREE:  this.renderTree(e, camera);    break;
        case ET_STONE:      this.renderStone(e, camera);   break;
        case ET_GOLD:       this.renderGold(e, camera);    break;
        case ET_BERRY:      this.renderBerry(e, camera);   break;
        case ET_RABBIT:
        case ET_WOLF:
        case ET_MAMMOTH:    this.renderAnimal(e, camera);  break;
        case ET_FIRE:       this.renderFire(e, camera);    break;
        case ET_WALL_WOOD:
        case ET_WALL_STONE: this.renderWall(e, camera);    break;
        case ET_SPIKE:      this.renderSpike(e, camera);   break;
        case ET_CACTUS:     this.renderCactus(e, camera);  break;
        default:            this._renderGeneric(e, camera);break;
      }
    }

    // 5. Particles on top of everything
    this.particles.render(this.renderer.ctx, camera);
  }

  // -------------------------------------------------------------------------
  // Player
  // -------------------------------------------------------------------------

  renderPlayer(e: ClientEntity, isMe: boolean, camera: Camera): void {
    const { renderer } = this;
    const { ctx }      = renderer;
    const z            = camera.zoom;
    const screen       = camera.worldToScreen(e.renderX, e.renderY);
    const sx           = screen.x;
    const sy           = screen.y;
    const r            = PLAYER_RADIUS * z;

    // Highlight ring for the local player
    if (isMe) {
      ctx.save();
      ctx.globalAlpha  = 0.32;
      ctx.fillStyle    = '#ffe640';
      ctx.beginPath();
      ctx.arc(sx, sy, r + 6 * z, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Attack swing arc
    if (e.isAttacking) {
      this._drawSwingArc(ctx, sx, sy, e.attackAngle, (r + 30 * z));
    }

    // Body — try sprite, fall back to coloured circle
    const playerImg = this.assets.get('player');
    const bodyDiam  = PLAYER_RADIUS * 2.4 * z;

    if (playerImg) {
      renderer.drawImageCentered(playerImg, sx, sy, bodyDiam, bodyDiam, e.angle);
    } else {
      const bodyColor = isMe ? '#3a9bdc' : '#e05252';
      renderer.drawCircle(sx, sy, r, bodyColor);

      // Direction indicator
      ctx.save();
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.beginPath();
      ctx.arc(
        sx + Math.cos(e.angle) * r * 0.55,
        sy + Math.sin(e.angle) * r * 0.55,
        r * 0.28,
        0, Math.PI * 2,
      );
      ctx.fill();
      ctx.restore();
    }

    // Held weapon / tool
    if (e.itemId > 0) {
      const weaponKey = WEAPON_SPRITES[e.itemId];
      const weaponImg = weaponKey ? this.assets.get(weaponKey) : null;
      if (weaponImg) {
        const weaponOffset = 28 * z;
        const wx = sx + Math.cos(e.angle) * weaponOffset;
        const wy = sy + Math.sin(e.angle) * weaponOffset;
        const ws = 34 * z;
        renderer.drawImageCentered(weaponImg, wx, wy, ws, ws, e.angle + Math.PI * 0.5);
      }
    }

    // Hat
    if (e.hatId > 0) {
      const hatKey = HAT_SPRITES[e.hatId];
      const hatImg = hatKey ? this.assets.get(hatKey) : null;
      if (hatImg) {
        // Position hat slightly in facing direction
        const hx = sx + Math.cos(e.angle) * (-18 * z);
        const hy = sy + Math.sin(e.angle) * (-18 * z);
        const hs = 34 * z;
        renderer.drawImageCentered(hatImg, hx, hy, hs, hs, e.angle);
      }
    }

    // Nickname
    if (e.nickname) {
      const nameY    = sy - (r + 18 * z);
      const fontSize = Math.max(10, Math.round(13 * z));

      // Shadow pass
      ctx.save();
      ctx.globalAlpha  = 0.55;
      ctx.font         = `bold ${fontSize}px Arial`;
      ctx.fillStyle    = '#000';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(e.nickname, sx + 1, nameY + 1);
      ctx.restore();

      // Main text
      renderer.drawText(e.nickname, sx, nameY, fontSize, '#ffffff', 'center');
    }

    // HP bar (only when below max)
    if (e.hp < e.maxHp) {
      const barW = 50 * z;
      const barH = 5  * z;
      renderer.drawBar(
        sx - barW * 0.5,
        sy - (r + 10 * z),
        barW, barH,
        e.hp, e.maxHp,
        '#2ecc40', '#333333',
      );
    }
  }

  // -------------------------------------------------------------------------
  // Tree  (regular and snow)
  // -------------------------------------------------------------------------

  renderTree(e: ClientEntity, camera: Camera): void {
    const def    = SPRITE_DEFS[e.type];
    const screen = camera.worldToScreen(e.renderX, e.renderY);
    const z      = camera.zoom;
    const img    = this.assets.get(def.key);

    if (img) {
      this.renderer.drawImageCentered(img, screen.x, screen.y, def.w * z, def.h * z, 0);
    } else {
      // Fallback: trunk + canopy
      const { ctx } = this.renderer;
      const trunkW  = 8 * z;
      const trunkH  = 20 * z;
      ctx.fillStyle = '#7a4f2e';
      ctx.fillRect(screen.x - trunkW * 0.5, screen.y - trunkH * 0.5, trunkW, trunkH);

      const leafColor = e.type === ET_SNOW_TREE ? '#a0c8e0' : '#2d6a1f';
      this.renderer.drawCircle(screen.x, screen.y - 18 * z, 22 * z, leafColor);
      this.renderer.drawCircle(screen.x, screen.y - 28 * z, 16 * z, leafColor);
    }

    this._drawHpBar(e, screen.x, screen.y, def.h * camera.zoom * 0.5 + 8 * camera.zoom, camera);
  }

  // -------------------------------------------------------------------------
  // Stone
  // -------------------------------------------------------------------------

  renderStone(e: ClientEntity, camera: Camera): void {
    const screen = camera.worldToScreen(e.renderX, e.renderY);
    const z      = camera.zoom;
    const img    = this.assets.get('stone');

    if (img) {
      this.renderer.drawImageCentered(img, screen.x, screen.y, 60 * z, 60 * z, 0);
    } else {
      this.renderer.drawCircle(screen.x, screen.y, 22 * z, '#7f8c8d');
      this.renderer.drawCircle(screen.x - 5 * z, screen.y - 4 * z, 10 * z, '#95a5a6');
    }

    this._drawHpBar(e, screen.x, screen.y, 30 * z + 8 * z, camera);
  }

  // -------------------------------------------------------------------------
  // Gold
  // -------------------------------------------------------------------------

  renderGold(e: ClientEntity, camera: Camera): void {
    const screen = camera.worldToScreen(e.renderX, e.renderY);
    const z      = camera.zoom;
    const img    = this.assets.get('gold');

    if (img) {
      this.renderer.drawImageCentered(img, screen.x, screen.y, 55 * z, 55 * z, 0);
    } else {
      this.renderer.drawCircle(screen.x, screen.y, 20 * z, '#d4ac0d');
      this.renderer.drawCircle(screen.x - 4 * z, screen.y - 3 * z, 9 * z, '#f7dc6f');
    }

    this._drawHpBar(e, screen.x, screen.y, 28 * z + 8 * z, camera);
  }

  // -------------------------------------------------------------------------
  // Berry bush
  // -------------------------------------------------------------------------

  renderBerry(e: ClientEntity, camera: Camera): void {
    const screen = camera.worldToScreen(e.renderX, e.renderY);
    const z      = camera.zoom;
    const img    = this.assets.get('berry_bush');

    if (img) {
      this.renderer.drawImageCentered(img, screen.x, screen.y, 50 * z, 50 * z, 0);
    } else {
      // Dark green bush
      this.renderer.drawCircle(screen.x, screen.y, 18 * z, '#1e6b20');

      // Red berry dots
      const { ctx } = this.renderer;
      ctx.save();
      ctx.fillStyle = '#c0392b';
      const berryPositions = [
        [-7, -6], [5, -8], [-4, 4], [7, 2], [0, -10],
      ];
      for (const [bx, by] of berryPositions) {
        ctx.beginPath();
        ctx.arc(screen.x + bx * z, screen.y + by * z, 3.5 * z, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    this._drawHpBar(e, screen.x, screen.y, 22 * z + 8 * z, camera);
  }

  // -------------------------------------------------------------------------
  // Animals (rabbit & wolf)
  // -------------------------------------------------------------------------

  renderAnimal(e: ClientEntity, camera: Camera): void {
    const def    = SPRITE_DEFS[e.type];
    const screen = camera.worldToScreen(e.renderX, e.renderY);
    const z      = camera.zoom;
    const img    = def ? this.assets.get(def.key) : null;

    if (img && def) {
      this.renderer.drawImageCentered(img, screen.x, screen.y, def.w * z, def.h * z, e.angle);
    } else {
      // Fallback coloured ellipse
      const color = e.type === ET_MAMMOTH ? '#4a4a4a' : (e.type === ET_WOLF ? '#5d4037' : '#f5f0e8');
      const r     = (e.type === ET_MAMMOTH ? 40 : (e.type === ET_WOLF ? 22 : 14)) * z;
      this.renderer.drawCircle(screen.x, screen.y, r, color);

      // Mammoth tusks
      const { ctx } = this.renderer;
      if (e.type === ET_MAMMOTH) {
        ctx.save();
        ctx.strokeStyle = '#f5f0e8';
        ctx.lineWidth = 3 * z;
        ctx.beginPath();
        ctx.moveTo(screen.x + 14 * z, screen.y + 6 * z);
        ctx.lineTo(screen.x + 26 * z, screen.y + 16 * z);
        ctx.moveTo(screen.x + 8 * z, screen.y + 10 * z);
        ctx.lineTo(screen.x + 20 * z, screen.y + 22 * z);
        ctx.stroke();
        ctx.restore();
      }

      // Eyes
      const eyeColor = e.type === ET_WOLF ? '#ef5350' : '#333';
      ctx.save();
      ctx.fillStyle = eyeColor;
      const eyeR   = 3 * z;
      const eyeOff = 8 * z;
      const perp   = e.angle + Math.PI * 0.5;
      ctx.beginPath();
      ctx.arc(
        screen.x + Math.cos(e.angle) * (r * 0.5) + Math.cos(perp) * eyeOff,
        screen.y + Math.sin(e.angle) * (r * 0.5) + Math.sin(perp) * eyeOff,
        eyeR, 0, Math.PI * 2,
      );
      ctx.fill();
      ctx.beginPath();
      ctx.arc(
        screen.x + Math.cos(e.angle) * (r * 0.5) - Math.cos(perp) * eyeOff,
        screen.y + Math.sin(e.angle) * (r * 0.5) - Math.sin(perp) * eyeOff,
        eyeR, 0, Math.PI * 2,
      );
      ctx.fill();
      ctx.restore();
    }

    this._drawHpBar(e, screen.x, screen.y, (def ? def.h * 0.5 : 22) * z + 8 * z, camera);
  }

  // -------------------------------------------------------------------------
  // Campfire / fire
  // -------------------------------------------------------------------------

  renderFire(e: ClientEntity, camera: Camera): void {
    const screen  = camera.worldToScreen(e.renderX, e.renderY);
    const z       = camera.zoom;
    const elapsed = this.fireTimes.get(e.id) ?? 0;

    // Flicker radius using a pair of sine waves
    const flicker  = Math.sin(elapsed * 8.7) * 0.12 + Math.sin(elapsed * 13.3) * 0.07;
    const baseR    = 20 * z;
    const fireR    = baseR * (1 + flicker);

    const img = this.assets.get('campfire');
    if (img) {
      const sz = 64 * z * (1 + flicker * 0.5);
      this.renderer.drawImageCentered(img, screen.x, screen.y, sz, sz, 0);
    } else {
      // Outer glow
      this.renderer.drawCircle(screen.x, screen.y, fireR + 8 * z, 'rgba(255,140,0,0.25)');
      // Main flame body
      this.renderer.drawCircle(screen.x, screen.y, fireR, '#e67e22');
      // Inner bright core
      this.renderer.drawCircle(screen.x, screen.y, fireR * 0.55, '#f9ca24');
    }

    // Emit smoke particles periodically (driven by elapsed time)
    if (Math.floor(elapsed * 6) !== Math.floor((elapsed - 0.016) * 6)) {
      this.particles.emitSmoke(e.x, e.y - 20);
    }
  }

  // -------------------------------------------------------------------------
  // Walls (wood & stone)
  // -------------------------------------------------------------------------

  renderWall(e: ClientEntity, camera: Camera): void {
    const def    = SPRITE_DEFS[e.type];
    const screen = camera.worldToScreen(e.renderX, e.renderY);
    const z      = camera.zoom;
    const img    = def ? this.assets.get(def.key) : null;
    const size   = (def?.w ?? 72) * z;

    if (img) {
      this.renderer.drawImageCentered(img, screen.x, screen.y, size, size, e.angle);
    } else {
      const { ctx } = this.renderer;
      ctx.save();
      ctx.translate(screen.x, screen.y);
      ctx.rotate(e.angle);
      ctx.fillStyle = e.type === ET_WALL_STONE ? '#7f8c8d' : '#8B5E3C';
      ctx.fillRect(-size * 0.5, -size * 0.5, size, size);

      // Edge highlight
      ctx.strokeStyle = e.type === ET_WALL_STONE ? '#95a5a6' : '#c4956a';
      ctx.lineWidth   = 2 * z;
      ctx.strokeRect(-size * 0.5 + z, -size * 0.5 + z, size - 2 * z, size - 2 * z);
      ctx.restore();
    }

    this._drawHpBar(e, screen.x, screen.y, size * 0.5 + 8 * z, camera);
  }

  // -------------------------------------------------------------------------
  // Spike
  // -------------------------------------------------------------------------

  renderSpike(e: ClientEntity, camera: Camera): void {
    const screen = camera.worldToScreen(e.renderX, e.renderY);
    const z      = camera.zoom;
    const img    = this.assets.get('spike_wood');

    if (img) {
      this.renderer.drawImageCentered(img, screen.x, screen.y, 60 * z, 60 * z, e.angle);
    } else {
      const { ctx } = this.renderer;
      const r       = 20 * z;
      const spikes  = 8;

      // Base circle
      this.renderer.drawCircle(screen.x, screen.y, r, '#6d4c41');

      // Spike triangles
      ctx.save();
      ctx.fillStyle = '#8d6e63';
      ctx.translate(screen.x, screen.y);
      ctx.rotate(e.angle);
      for (let i = 0; i < spikes; i++) {
        const a = (i / spikes) * Math.PI * 2;
        ctx.save();
        ctx.rotate(a);
        ctx.beginPath();
        ctx.moveTo(0, -r);
        ctx.lineTo(-4 * z, -r * 0.6);
        ctx.lineTo(4 * z,  -r * 0.6);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    }

    this._drawHpBar(e, screen.x, screen.y, 30 * z + 8 * z, camera);
  }

  // -------------------------------------------------------------------------
  // Cactus (desert only)
  // -------------------------------------------------------------------------

  private renderCactus(e: ClientEntity, camera: Camera): void {
    const screen = camera.worldToScreen(e.renderX, e.renderY);
    const z      = camera.zoom;
    const img    = this.assets.get('cactus');

    if (img) {
      this.renderer.drawImageCentered(img, screen.x, screen.y, 52 * z, 52 * z, 0);
    } else {
      const { ctx } = this.renderer;
      // Main trunk
      ctx.save();
      ctx.fillStyle = '#4caf50';
      ctx.fillRect(screen.x - 6 * z, screen.y - 22 * z, 12 * z, 44 * z);
      // Left arm
      ctx.fillRect(screen.x - 18 * z, screen.y - 10 * z, 12 * z, 8 * z);
      // Right arm
      ctx.fillRect(screen.x + 6 * z, screen.y - 14 * z, 12 * z, 8 * z);
      // Spine dots
      ctx.fillStyle = '#fff';
      for (let i = -3; i <= 3; i++) {
        ctx.beginPath();
        ctx.arc(screen.x + 7 * z, screen.y + i * 6 * z, 1.5 * z, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    this._drawHpBar(e, screen.x, screen.y, 26 * z + 8 * z, camera);
  }

  // -------------------------------------------------------------------------
  // Fallback for unknown entity types
  // -------------------------------------------------------------------------

  private _renderGeneric(e: ClientEntity, camera: Camera): void {
    const screen = camera.worldToScreen(e.renderX, e.renderY);
    this.renderer.drawCircle(screen.x, screen.y, 18 * camera.zoom, '#aaaaaa');
  }

  // -------------------------------------------------------------------------
  // Shared helpers
  // -------------------------------------------------------------------------

  /** Draw a health bar above the entity if it has taken damage. */
  private _drawHpBar(
    e:        ClientEntity,
    sx:       number,
    sy:       number,
    yOffset:  number,
    camera:   Camera,
  ): void {
    const maxHp = e.maxHp || DEFAULT_MAX_HP[e.type] || 100;
    if (e.hp >= maxHp || e.hp <= 0) return;

    const z    = camera.zoom;
    const barW = 44 * z;
    const barH = 4  * z;
    this.renderer.drawBar(
      sx - barW * 0.5,
      sy - yOffset,
      barW, barH,
      e.hp, maxHp,
      '#e74c3c', '#333333',
    );
  }

  /** Draw a weapon-swing arc centred at (sx, sy). */
  private _drawSwingArc(
    ctx:    CanvasRenderingContext2D,
    sx:     number,
    sy:     number,
    angle:  number,
    radius: number,
  ): void {
    const arcSpan = Math.PI * 0.6;
    ctx.save();
    ctx.globalAlpha  = 0.55;
    ctx.strokeStyle  = '#ffffff';
    ctx.lineWidth    = 3;
    ctx.lineCap      = 'round';
    ctx.beginPath();
    ctx.arc(sx, sy, radius, angle - arcSpan * 0.5, angle + arcSpan * 0.5);
    ctx.stroke();
    ctx.restore();
  }
}
