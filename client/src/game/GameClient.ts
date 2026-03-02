import { Renderer } from '../engine/Renderer';
import { Camera } from '../engine/Camera';
import { Input } from '../engine/Input';
import { AssetLoader, ASSET_URLS } from '../engine/AssetLoader';
import { WorldRenderer, WorldData } from './WorldRenderer';
import { EntityRenderer, ClientEntity } from './EntityRenderer';
import { ParticleSystem } from './ParticleSystem';
import { WSClient } from '../network/WSClient';
import HUD, { PlayerStats } from '../ui/HUD';
import Lobby from '../ui/Lobby';
import DeathScreen from '../ui/DeathScreen';
import Leaderboard, { LeaderboardEntry } from '../ui/Leaderboard';
import Chat from '../ui/Chat';
import CraftMenu, { RecipeEntry } from '../ui/CraftMenu';
import Minimap, { MinimapEntity } from '../ui/Minimap';
import { MAP_SIZE, PLAYER_MAX_HP, PLAYER_MAX_HUNGER, PLAYER_MAX_THIRST, PLAYER_MAX_TEMP } from '../../../shared/constants';
import { RECIPES } from '../../../shared/items';

// ---------------------------------------------------------------------------
// Packet type numeric constants
// Using plain numbers instead of const enum to work across esbuild boundaries.
// ---------------------------------------------------------------------------

const PT_CHAT               = 0;
const PT_HANDSHAKE          = 1;
const PT_MOVE               = 2;
const PT_HANDSHAKE_RESPONSE = 3;
const PT_ENTITY_UPDATE      = 4;
const PT_ATTACK             = 5;
const PT_PLAYER_STATS       = 6;
const PT_SELECT_ITEM        = 7;
const PT_USE_ITEM           = 9;
const PT_CRAFT              = 11;
const PT_ENTITY_REMOVE      = 8;
const PT_CRAFT_RESULT       = 16;
const PT_DAMAGE             = 12;
const PT_CHAT_BROADCAST     = 13;
const PT_LEADERBOARD        = 14;
const PT_TIME_UPDATE        = 15;
const PT_DEATH              = 17;
const PT_RESPAWN            = 22;

// ---------------------------------------------------------------------------
// Damage particle colours per entity type
// ---------------------------------------------------------------------------

const DAMAGE_COLORS: Record<number, string> = {
  0:  '#e74c3c', // player — blood
  1:  '#8B5E3C', // tree   — wood chip
  2:  '#7f8c8d', // stone  — stone chip
  3:  '#d4ac0d', // gold   — gold spark
  4:  '#2d6a1f', // berry
  5:  '#e74c3c', // rabbit
  6:  '#c0392b', // wolf
  11: '#4caf50', // cactus
  12: '#dce9f5', // snow tree
};

// ---------------------------------------------------------------------------
// GameClient
// ---------------------------------------------------------------------------

export class GameClient {
  // Core engine
  private readonly renderer:  Renderer;
  private get camera(): Camera { return this.renderer.camera; }
  private readonly input:     Input;
  private readonly assets:    AssetLoader;

  // Network
  private readonly ws: WSClient;

  // Game subsystems (set after handshake)
  private worldRenderer:  WorldRenderer  | null = null;
  private entityRenderer: EntityRenderer | null = null;
  private readonly particles: ParticleSystem;

  // UI
  private readonly hud:         HUD;
  private readonly lobby:       Lobby;
  private readonly deathScreen: DeathScreen;
  private readonly leaderboard: Leaderboard;
  private readonly chat:        Chat;
  private readonly craftMenu:   CraftMenu;
  private readonly minimap:     Minimap;

  // Crafting recipes (derived from shared RECIPES + live inventory)
  private craftRecipes: RecipeEntry[] = [];

  // State
  private myId:      number = -1;
  private myPlayer:  ClientEntity | null = null;
  private entities:  Map<number, ClientEntity> = new Map();
  private isNight:   boolean = false;
  private gameTime:  number  = 0;
  private cycleMax:  number  = 60000;
  private mapData:   WorldData | null = null;
  private nickname:  string  = 'Anonymous';

  // Player stats (updated from PLAYER_STATS packets)
  private stats: PlayerStats = {
    hp:           PLAYER_MAX_HP,
    maxHp:        PLAYER_MAX_HP,
    hunger:       PLAYER_MAX_HUNGER,
    thirst:       PLAYER_MAX_THIRST,
    temp:         PLAYER_MAX_TEMP,
    xp:           0,
    level:        1,
    points:       0,
    inventory:    Array.from({ length: 10 }, () => [0, 0] as [number, number]),
    selectedSlot: 0,
    hatId:        -1,
  };

  // Leaderboard data
  private leaderboardEntries: LeaderboardEntry[] = [];

  // Game loop
  private animFrameId: number = 0;
  private lastTs:      number = 0;
  private running:     boolean = false;

  // Input state
  private lastMoveDir: number = 0;

  // ---------------------------------------------------------------------------

  constructor(private readonly canvas: HTMLCanvasElement, serverUrl: string) {
    // Engine
    this.renderer = new Renderer(canvas);
    this.input    = new Input();
    this.assets   = new AssetLoader();
    this.particles = new ParticleSystem();

    // Network
    this.ws = new WSClient(serverUrl);

    // UI (initialised but not yet mounted)
    this.hud         = new HUD(this.renderer.ctx, canvas);
    this.lobby       = new Lobby();
    this.deathScreen = new DeathScreen();
    this.leaderboard = new Leaderboard();
    this.chat        = new Chat();
    this.craftMenu   = new CraftMenu(this.renderer.ctx, canvas);
    this.minimap     = new Minimap();
    // Renderer already handles resize; no additional listener needed.
  }

  // ---------------------------------------------------------------------------
  // Startup
  // ---------------------------------------------------------------------------

  start(): void {
    // Mount UI
    this.lobby.init();
    this.deathScreen.init();
    this.leaderboard.init();
    this.chat.init();

    // Attach input
    this.input.attach(this.canvas, this.camera);

    // Kick off asset loading in the background — non-blocking
    this._loadAssets();

    // Lobby "Play" → send handshake
    this.lobby.onPlay((nick) => {
      this.nickname = nick;
      this.lobby.hide();
      this._connectAndHandshake(nick);
    });

    // Death screen → send RESPAWN packet to server (server will re-send handshake)
    this.deathScreen.onRespawn(() => {
      this.deathScreen.hide();
      this.ws.send([PT_RESPAWN]);
    });

    // Chat → send chat packet
    this.chat.onSend((msg) => {
      this.ws.send([PT_CHAT, msg]);
    });

    // Input mouse click → attack or craft menu click
    this.input.onMouseClick = (x, y, angle, button) => {
      if (!this.running) return;
      if (this.chat.isFocused()) return;
      if (button === 0) {
        // Try craft menu click first
        const resultId = this.craftMenu.handleClick(x, y, this.craftRecipes);
        if (resultId >= 0) {
          this.ws.send([PT_CRAFT, resultId]);
        } else {
          this.sendAttack(angle);
        }
      }
    };

    // Key bindings: slot selection (1-9, 0→slot9) and food use (R)
    this.input.onKeyPress = (key) => {
      if (!this.running || this.chat.isFocused()) return;
      if (key >= '1' && key <= '9') {
        const slot = parseInt(key) - 1;
        this.ws.send([PT_SELECT_ITEM, slot]);
      } else if (key === '0') {
        this.ws.send([PT_SELECT_ITEM, 9]);
      } else if (key === 'r' || key === 'R') {
        // Use selected item (food)
        const slot = this.stats.inventory[this.stats.selectedSlot];
        if (slot && slot[0] >= 0) {
          this.ws.send([PT_USE_ITEM, slot[0]]);
        }
      }
    };

    // Show lobby to start
    this.lobby.show();
  }

  // ---------------------------------------------------------------------------
  // Networking
  // ---------------------------------------------------------------------------

  private _connectAndHandshake(nick: string): void {
    this.ws.onMessage((data) => this.handleMessage(data));

    this.ws.onDisconnect(() => {
      this.running = false;
      cancelAnimationFrame(this.animFrameId);
      // Show lobby again so the player can reconnect
      this.entities.clear();
      this.lobby.show();
    });

    this.ws.onConnect(() => {
      // Send handshake once connected
      this.ws.send([PT_HANDSHAKE, nick, this.canvas.width, this.canvas.height]);
    });

    this.ws.connect();
  }

  private async _loadAssets(): Promise<void> {
    const list = Object.entries(ASSET_URLS).map(([key, url]) => ({ key, url }));
    await this.assets.loadAll(list);
  }

  // ---------------------------------------------------------------------------
  // Message dispatch
  // ---------------------------------------------------------------------------

  handleMessage(data: unknown[]): void {
    if (!Array.isArray(data) || data.length === 0) return;
    const type = data[0] as number;

    switch (type) {
      case PT_HANDSHAKE_RESPONSE: this._onHandshakeResponse(data); break;
      case PT_ENTITY_UPDATE:      this._onEntityUpdate(data);      break;
      case PT_PLAYER_STATS:       this._onPlayerStats(data);       break;
      case PT_TIME_UPDATE:        this._onTimeUpdate(data);        break;
      case PT_ENTITY_REMOVE:      this._onEntityRemove(data);      break;
      case PT_DAMAGE:             this._onDamage(data);            break;
      case PT_CRAFT_RESULT:       this._onCraftResult(data);       break;
      case PT_DEATH:              this._onDeath(data);             break;
      case PT_LEADERBOARD:        this._onLeaderboard(data);       break;
      case PT_CHAT_BROADCAST:     this._onChatBroadcast(data);     break;
    }
  }

  // ---------------------------------------------------------------------------
  // Packet handlers
  // ---------------------------------------------------------------------------

  // Server: [3, myId, x, y, mapSeed, isNight(0|1), gameTime, leaderboard[], entities[]]
  private _onHandshakeResponse(data: unknown[]): void {
    this.myId = data[1] as number;
    const spawnX  = data[2] as number;
    const spawnY  = data[3] as number;
    const seed    = data[4] as number;
    this.isNight  = (data[5] as number) !== 0;
    this.gameTime = (data[6] as number | undefined) ?? 0;

    // Build blank tile/biome arrays — client will render background colour only
    // until map sync is implemented. WorldRenderer handles missing data gracefully.
    const TILES_SIDE  = Math.floor(MAP_SIZE / 32); // 450
    const TOTAL       = TILES_SIDE * TILES_SIDE;
    const tilesRaw    = new Uint8Array(TOTAL);
    const biomesRaw   = new Uint8Array(TOTAL);
    this.mapData = { seed, tiles: tilesRaw, biomes: biomesRaw };

    // Initialise rendering subsystems
    this.worldRenderer  = new WorldRenderer(this.renderer, this.mapData, this.assets);
    this.entityRenderer = new EntityRenderer(this.renderer, this.particles, this.assets);

    // Minimap — init once per session
    this.minimap.init(seed);
    this.minimap.viewWidth  = this.canvas.width;
    this.minimap.viewHeight = this.canvas.height;

    // Seed the leaderboard if bundled (index 7)
    const lbRaw = data[7];
    if (Array.isArray(lbRaw)) {
      this.leaderboardEntries = (lbRaw as unknown[]).map((entry) => {
        const e = entry as unknown[];
        return { id: e[0] as number, nickname: e[1] as string, points: e[2] as number };
      });
      this.leaderboard.update(this.leaderboardEntries);
    }

    // Process initial entity list if bundled (index 8)
    const entRaw = data[8];
    if (Array.isArray(entRaw)) {
      this._onEntityUpdate([PT_ENTITY_UPDATE, entRaw]);
    }

    // Camera to spawn point — snap immediately then follow
    this.camera.x = spawnX;
    this.camera.y = spawnY;
    this.camera.follow(spawnX, spawnY);

    // Reset stats for new session
    this.stats.hp     = PLAYER_MAX_HP;
    this.stats.hunger = PLAYER_MAX_HUNGER;
    this.stats.thirst = PLAYER_MAX_THIRST;
    this.stats.temp   = PLAYER_MAX_TEMP;
    this.stats.inventory = Array.from({ length: 10 }, () => [-1, 0] as [number, number]);

    // Start game loop
    this.running     = true;
    this.lastMoveDir = -1; // force re-send on first frame
    this.lastTs      = performance.now();
    this.animFrameId = requestAnimationFrame((ts) => this.gameLoop(ts));
  }

  // Server: [4, [[id,type,x,y,angle,hp,itemId,hatId,nick,level,isAtk,atkAngle], ...]]
  private _onEntityUpdate(data: unknown[]): void {
    const list = (data[1] as unknown[] | undefined) ?? [];
    for (const raw of list as unknown[][]) {
      if (!Array.isArray(raw) || raw.length < 6) continue;

      const id        = raw[0]  as number;
      const type      = raw[1]  as number;
      const x         = raw[2]  as number;
      const y         = raw[3]  as number;
      const angle     = raw[4]  as number;
      const hp        = raw[5]  as number;
      const itemId    = (raw[6]  as number | undefined) ?? -1;
      const hatId     = (raw[7]  as number | undefined) ?? -1;
      const nickname  = (raw[8]  as string | undefined) ?? '';
      const level     = (raw[9]  as number | undefined) ?? 1;
      const attacking = (raw[10] as number | undefined) ?? 0;
      const atkAngle  = (raw[11] as number | undefined) ?? 0;

      const existing = this.entities.get(id);
      const maxHp    = existing?.maxHp ?? this._defaultMaxHp(type);

      const entity: ClientEntity = {
        id,
        type,
        x,
        y,
        angle,
        hp,
        maxHp:       Math.max(maxHp, hp),
        itemId,
        hatId,
        nickname,
        level,
        isAttacking: attacking !== 0,
        attackAngle: atkAngle,
        renderX:     existing?.renderX ?? x,
        renderY:     existing?.renderY ?? y,
      };

      this.entities.set(id, entity);

      // Keep myPlayer in sync
      if (id === this.myId) {
        this.myPlayer = entity;
        // Track camera on local player
        this.camera.follow(x, y);
      }
    }
  }

  // Server: [6, [hp,hunger,thirst,temp,xp,level,points,inv[],selectedSlot,hatId]]
  // (serializeStats() returns an array, which becomes data[1])
  private _onPlayerStats(data: unknown[]): void {
    const s = data[1] as unknown[];
    if (!Array.isArray(s)) return;

    this.stats.hp           = (s[0] as number | undefined) ?? this.stats.hp;
    this.stats.hunger       = (s[1] as number | undefined) ?? this.stats.hunger;
    this.stats.thirst       = (s[2] as number | undefined) ?? this.stats.thirst;
    this.stats.temp         = (s[3] as number | undefined) ?? this.stats.temp;
    this.stats.xp           = (s[4] as number | undefined) ?? this.stats.xp;
    this.stats.level        = (s[5] as number | undefined) ?? this.stats.level;
    this.stats.points       = (s[6] as number | undefined) ?? this.stats.points;

    // s[7] = inventory [[itemId,count], ...]
    const rawInv = s[7];
    if (Array.isArray(rawInv)) {
      this.stats.inventory = (rawInv as unknown[]).map((slot) => {
        const sl = slot as unknown[];
        return [sl[0] as number, sl[1] as number] as [number, number];
      });
    }

    this.stats.selectedSlot = (s[8] as number | undefined) ?? this.stats.selectedSlot;
    this.stats.hatId        = (s[9] as number | undefined) ?? this.stats.hatId;

    // Keep myPlayer in sync
    if (this.myPlayer) {
      this.myPlayer.hatId = this.stats.hatId;
      this.myPlayer.level = this.stats.level;
      this.myPlayer.hp    = this.stats.hp;
    }

    // Rebuild craft recipes with current inventory counts
    this._buildCraftRecipes();
  }

  // [15, isNight (0|1), gameTime, cycleMax?]
  private _onTimeUpdate(data: unknown[]): void {
    this.isNight  = (data[1] as number) !== 0;
    this.gameTime = (data[2] as number | undefined) ?? this.gameTime;
    if (data[3] !== undefined) {
      this.cycleMax = data[3] as number;
    }
  }

  // [8, id, ...]
  private _onEntityRemove(data: unknown[]): void {
    for (let i = 1; i < data.length; i++) {
      this.entities.delete(data[i] as number);
    }
  }

  // [12, entityId, damage, x?, y?]
  private _onDamage(data: unknown[]): void {
    const entityId = data[1] as number;
    const entity   = this.entities.get(entityId);

    // Use provided coords, fall back to entity position
    const px = (data[3] as number | undefined) ?? entity?.x ?? 0;
    const py = (data[4] as number | undefined) ?? entity?.y ?? 0;

    if (entity) {
      const color = DAMAGE_COLORS[entity.type] ?? '#ffffff';
      this.particles.emit(px, py, color, 8, 140, 4);
    } else {
      this.particles.emitSparks(px, py);
    }
  }

  // [17, points?]
  private _onDeath(data: unknown[]): void {
    this.running = false;
    cancelAnimationFrame(this.animFrameId);

    const points = (data[1] as number | undefined) ?? this.stats.points;
    this.deathScreen.show(points);
    this.entities.clear();
    this.myPlayer = null;
    this.myId     = -1;
  }

  // [14, [[id, nickname, points], ...]]
  private _onLeaderboard(data: unknown[]): void {
    const raw = data[1];
    if (!Array.isArray(raw)) return;

    this.leaderboardEntries = (raw as unknown[]).map((entry) => {
      const e = entry as unknown[];
      return { id: e[0] as number, nickname: e[1] as string, points: e[2] as number };
    });
    this.leaderboard.update(this.leaderboardEntries);
  }

  // [13, playerId, nickname, message]
  private _onChatBroadcast(data: unknown[]): void {
    const playerId = data[1] as number;
    const nickname = data[2] as string;
    const message  = data[3] as string;
    this.chat.addMessage(playerId, nickname, message);
  }

  // [16, success(bool), itemId, count]
  private _onCraftResult(data: unknown[]): void {
    const success = Boolean(data[1]);
    if (!success) {
      this.chat.addMessage(-1, 'System', 'Cannot craft — not enough resources.');
    }
  }

  // ---------------------------------------------------------------------------
  // Game loop
  // ---------------------------------------------------------------------------

  gameLoop(ts: number): void {
    if (!this.running) return;
    this.animFrameId = requestAnimationFrame((t) => this.gameLoop(t));

    const dt = Math.min((ts - this.lastTs) / 1000, 0.1); // cap at 100ms
    this.lastTs = ts;

    // --- Input ---
    if (!this.chat.isFocused()) {
      this._handleMovement();
    }

    // --- Camera ---
    this.camera.update(dt);

    // --- Clear ---
    this.renderer.clear(this.isNight);

    // --- World tiles ---
    if (this.worldRenderer) {
      this.worldRenderer.render(this.camera, this.isNight);
    }

    // --- Entities + particles ---
    if (this.entityRenderer) {
      this.entityRenderer.renderAll(this.entities, this.myId, this.camera, dt);
    }

    // Update standalone particles (entity renderer also calls particles.render)
    this.particles.update(dt);

    // --- HUD (screen-space, drawn last) ---
    this.renderer.resetCamera();
    this.hud.render(this.stats, this.isNight);
    this.hud.renderInventory(this.stats);

    // --- Craft menu (overlaid on canvas) ---
    this.craftMenu.render(this.craftRecipes);

    // --- Minimap ---
    if (this.myPlayer) {
      const minimapEntities = new Map<number, MinimapEntity>();
      this.entities.forEach((e, id) => {
        const mmType = e.type === 0 ? 0 : (e.type <= 4 || e.type === 11 || e.type === 12) ? 2
          : (e.type === 5 || e.type === 6 || e.type === 13) ? 1 : 3;
        minimapEntities.set(id, { x: e.x, y: e.y, type: mmType });
      });
      this.minimap.render(minimapEntities, this.myId, this.myPlayer.x, this.myPlayer.y);
    }
  }

  // ---------------------------------------------------------------------------
  // Crafting helpers
  // ---------------------------------------------------------------------------

  private _buildCraftRecipes(): void {
    // Item name lookup (abbreviated)
    const ITEM_NAMES: Record<number, string> = {
      0: 'Hand', 1: 'Axe', 2: 'Pick', 3: 'Sword', 4: 'Big Axe', 5: 'Big Pick',
      6: 'Gold Axe', 7: 'Gold Sword', 8: 'Gold Pick',
      20: 'Berries', 21: 'Cooked Meat', 22: 'Raw Meat', 23: 'Cookie',
      30: 'Wood', 31: 'Stone', 32: 'Gold', 33: 'Thread', 34: 'Coal', 35: 'Cactus', 36: 'Wheat',
      40: 'Campfire', 41: 'Wall', 42: 'Stone Wall', 43: 'Spike', 44: 'Stone Spike',
      45: 'Windmill', 46: 'Chest',
      50: 'Winter Hat', 51: 'Cowboy Hat', 52: 'Hood', 53: 'Coat',
    };

    this.craftRecipes = RECIPES.map((recipe) => ({
      result: recipe.result,
      name:   ITEM_NAMES[recipe.result] ?? `Item ${recipe.result}`,
      ingredients: recipe.ingredients.map((ing) => ({
        item:  ing.item,
        name:  ITEM_NAMES[ing.item] ?? `Item ${ing.item}`,
        count: ing.count,
        have:  this._countItem(ing.item),
      })),
    }));
  }

  private _countItem(itemId: number): number {
    let n = 0;
    for (const slot of this.stats.inventory) {
      if (slot[0] === itemId) n += slot[1];
    }
    return n;
  }

  // ---------------------------------------------------------------------------
  // Movement
  // ---------------------------------------------------------------------------

  private _handleMovement(): void {
    const dir = this.input.updateMoveDir();
    if (dir !== this.lastMoveDir) {
      this.lastMoveDir = dir;
      this.sendMove(dir);
    }
  }

  sendMove(dir: number): void {
    this.ws.send([PT_MOVE, dir]);
  }

  sendAttack(angle: number): void {
    this.ws.send([PT_ATTACK, angle]);
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private _defaultMaxHp(type: number): number {
    const table: Record<number, number> = {
      0:  100, // player
      1:  200, // tree
      2:  300, // stone
      3:  200, // gold
      4:   80, // berry
      5:   50, // rabbit
      6:  120, // wolf
      7:  100, // fire
      8:  200, // wall_wood
      9:  400, // wall_stone
      10: 150, // spike
      11: 100, // cactus
      12: 200, // snow_tree
      13: 500, // mammoth
    };
    return table[type] ?? 100;
  }

  // ---------------------------------------------------------------------------
  // Public accessors (useful for debug consoles)
  // ---------------------------------------------------------------------------

  get entityCount(): number { return this.entities.size; }
  get particleCount(): number { return this.particles.count; }
}
