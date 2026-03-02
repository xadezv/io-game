import { Entity } from '../entities/Entity';
import { Player } from '../entities/Player';
import { Resource } from '../entities/Resource';
import { Animal } from '../entities/Animal';
import { Structure } from '../entities/Structure';
import { generateMap, MapData, getBiomeAt, RNG } from '../map/MapGen';
import { EntityType, BiomeType } from '../../../shared/packets';
import {
  MAP_SIZE, VIEW_DISTANCE,
  TREE_COUNT, STONE_COUNT, GOLD_COUNT, BERRY_COUNT, ANIMAL_COUNT,
  RESOURCE_RESPAWN_TIME
} from '../../../shared/constants';

// ─── Spatial Grid ──────────────────────────────────────────────────────────
// Divides the world into cells for O(1) neighbour lookups instead of O(n)
const CELL_SIZE = 200; // px — slightly larger than player interaction range
const GRID_W = Math.ceil(MAP_SIZE / CELL_SIZE);
const GRID_H = Math.ceil(MAP_SIZE / CELL_SIZE);

class SpatialGrid {
  private cells = new Map<number, Set<number>>();

  private key(cx: number, cy: number): number {
    return cy * GRID_W + cx;
  }

  add(id: number, x: number, y: number): void {
    const cx = Math.floor(x / CELL_SIZE);
    const cy = Math.floor(y / CELL_SIZE);
    const k  = this.key(cx, cy);
    let cell = this.cells.get(k);
    if (!cell) { cell = new Set(); this.cells.set(k, cell); }
    cell.add(id);
  }

  remove(id: number, x: number, y: number): void {
    const cx = Math.floor(x / CELL_SIZE);
    const cy = Math.floor(y / CELL_SIZE);
    this.cells.get(this.key(cx, cy))?.delete(id);
  }

  move(id: number, oldX: number, oldY: number, newX: number, newY: number): void {
    const oldCx = Math.floor(oldX / CELL_SIZE);
    const oldCy = Math.floor(oldY / CELL_SIZE);
    const newCx = Math.floor(newX / CELL_SIZE);
    const newCy = Math.floor(newY / CELL_SIZE);
    if (oldCx === newCx && oldCy === newCy) return;
    this.remove(id, oldX, oldY);
    this.add(id, newX, newY);
  }

  // Returns entity IDs in cells overlapping a circle (cx,cy,r)
  query(cx: number, cy: number, r: number): number[] {
    const minCx = Math.max(0, Math.floor((cx - r) / CELL_SIZE));
    const maxCx = Math.min(GRID_W - 1, Math.floor((cx + r) / CELL_SIZE));
    const minCy = Math.max(0, Math.floor((cy - r) / CELL_SIZE));
    const maxCy = Math.min(GRID_H - 1, Math.floor((cy + r) / CELL_SIZE));
    const out: number[] = [];
    for (let gcy = minCy; gcy <= maxCy; gcy++) {
      for (let gcx = minCx; gcx <= maxCx; gcx++) {
        const cell = this.cells.get(this.key(gcx, gcy));
        if (cell) for (const id of cell) out.push(id);
      }
    }
    return out;
  }
}

// ─── World ─────────────────────────────────────────────────────────────────
export class World {
  mapData:    MapData;
  players:    Map<string, Player>    = new Map();
  resources:  Map<number, Resource>  = new Map();
  animals:    Map<number, Animal>    = new Map();
  structures: Map<number, Structure> = new Map();

  // BUG-17: spike damage events collected each tick for Game.ts to broadcast
  spikeHits: Array<{ socketId: string; damage: number; playerId: number }> = [];

  // Fast lookup by entity id (all types)
  private allById: Map<number, Entity> = new Map();

  // Spatial grids per category
  private playerGrid:    SpatialGrid = new SpatialGrid();
  private resourceGrid:  SpatialGrid = new SpatialGrid();
  private animalGrid:    SpatialGrid = new SpatialGrid();
  private structureGrid: SpatialGrid = new SpatialGrid();


  private rng: RNG;

  constructor(seed?: number) {
    const s = seed ?? Math.floor(Math.random() * 0x7fffffff);
    this.rng = new RNG(s);
    console.log(`[MapGen] Generating world with seed ${s}...`);
    const t0 = Date.now();
    this.mapData = generateMap(s);
    console.log(`[MapGen] Done in ${Date.now() - t0}ms`);
    this.spawnResources();
    this.spawnAnimals();
  }

  // ─── Spawn helpers ────────────────────────────────────────────────────────

  private randPos(biomeFilter?: BiomeType[]): { x: number; y: number } | null {
    for (let attempt = 0; attempt < 300; attempt++) {
      const x = this.rng.nextFloat(300, MAP_SIZE - 300);
      const y = this.rng.nextFloat(300, MAP_SIZE - 300);
      const biome = getBiomeAt(this.mapData, x, y);
      if (biome === BiomeType.OCEAN) continue;
      if (!biomeFilter || biomeFilter.includes(biome)) return { x, y };
    }
    return null;
  }

  private addResource(r: Resource): void {
    this.resources.set(r.id, r);
    this.allById.set(r.id, r);
    this.resourceGrid.add(r.id, r.x, r.y);
  }

  addAnimal(a: Animal): void {
    this.animals.set(a.id, a);
    this.allById.set(a.id, a);
    this.animalGrid.add(a.id, a.x, a.y);
  }

  addStructure(s: Structure): void {
    this.structures.set(s.id, s);
    this.allById.set(s.id, s);
    this.structureGrid.add(s.id, s.x, s.y);
  }

  private spawnResources(): void {
    const spawn = (type: EntityType, count: number, biomes: BiomeType[]) => {
      for (let i = 0; i < count; i++) {
        const pos = this.randPos(biomes);
        if (!pos) continue;
        this.addResource(new Resource(type, pos.x, pos.y));
      }
    };

    spawn(EntityType.TREE,      TREE_COUNT,                    [BiomeType.PLAINS, BiomeType.FOREST]);
    spawn(EntityType.SNOW_TREE, Math.floor(TREE_COUNT * 0.35), [BiomeType.SNOW]);
    spawn(EntityType.STONE,     STONE_COUNT,                   [BiomeType.PLAINS, BiomeType.FOREST, BiomeType.SNOW, BiomeType.DESERT]);
    spawn(EntityType.GOLD,      GOLD_COUNT,                    [BiomeType.PLAINS, BiomeType.SNOW, BiomeType.DESERT]);
    spawn(EntityType.BERRY,     BERRY_COUNT,                   [BiomeType.PLAINS, BiomeType.FOREST]);
    spawn(EntityType.CACTUS,    Math.floor(BERRY_COUNT * 0.6), [BiomeType.DESERT]);
  }

  private spawnAnimals(): void {
    const spawn = (type: EntityType, count: number, biomes: BiomeType[]) => {
      for (let i = 0; i < count; i++) {
        const pos = this.randPos(biomes);
        if (!pos) continue;
        this.addAnimal(new Animal(type, pos.x, pos.y));
      }
    };

    spawn(EntityType.RABBIT,  Math.floor(ANIMAL_COUNT * 0.5), [BiomeType.PLAINS, BiomeType.FOREST]);
    spawn(EntityType.WOLF,    Math.floor(ANIMAL_COUNT * 0.35), [BiomeType.PLAINS, BiomeType.FOREST, BiomeType.SNOW]);
    spawn(EntityType.MAMMOTH, 10, [BiomeType.SNOW]);
  }

  // ─── Player management ────────────────────────────────────────────────────

  addPlayer(p: Player): void {
    this.players.set(p.socketId, p);
    this.allById.set(p.id, p);
    this.playerGrid.add(p.id, p.x, p.y);
  }

  removePlayer(socketId: string): void {
    const p = this.players.get(socketId);
    if (!p) return;
    this.playerGrid.remove(p.id, p.x, p.y);
    this.allById.delete(p.id);
    this.players.delete(socketId);
  }

  // ─── Queries ─────────────────────────────────────────────────────────────

  getEntitiesInView(cx: number, cy: number): Entity[] {
    const vd = VIEW_DISTANCE;
    const result: Entity[] = [];

    for (const p of this.players.values()) {
      if (!p.dead && Math.abs(p.x - cx) < vd && Math.abs(p.y - cy) < vd) result.push(p);
    }
    for (const r of this.resources.values()) {
      if (!r.dead && Math.abs(r.x - cx) < vd && Math.abs(r.y - cy) < vd) result.push(r);
    }
    for (const a of this.animals.values()) {
      if (!a.dead && Math.abs(a.x - cx) < vd && Math.abs(a.y - cy) < vd) result.push(a);
    }
    for (const s of this.structures.values()) {
      if (!s.dead && Math.abs(s.x - cx) < vd && Math.abs(s.y - cy) < vd) result.push(s);
    }

    return result;
  }

  getNearbyEntities(x: number, y: number, r: number): Entity[] {
    const ids = [
      ...this.playerGrid.query(x, y, r),
      ...this.resourceGrid.query(x, y, r),
      ...this.animalGrid.query(x, y, r),
      ...this.structureGrid.query(x, y, r),
    ];
    const result: Entity[] = [];
    for (const id of ids) {
      const e = this.allById.get(id);
      if (e && !e.dead) result.push(e);
    }
    return result;
  }

  getNearbyPlayers(x: number, y: number, r: number): Player[] {
    const ids = this.playerGrid.query(x, y, r);
    const result: Player[] = [];
    for (const id of ids) {
      const e = this.allById.get(id);
      if (e && !e.dead && e instanceof Player) result.push(e);
    }
    return result;
  }

  getNearbyResources(x: number, y: number, r: number): Resource[] {
    const ids = this.resourceGrid.query(x, y, r);
    const result: Resource[] = [];
    for (const id of ids) {
      const e = this.allById.get(id);
      if (e && e instanceof Resource) result.push(e);
    }
    return result;
  }

  getNearbyAnimals(x: number, y: number, r: number): Animal[] {
    const ids = this.animalGrid.query(x, y, r);
    const result: Animal[] = [];
    for (const id of ids) {
      const e = this.allById.get(id);
      if (e && e instanceof Animal) result.push(e);
    }
    return result;
  }

  getNearbyStructures(x: number, y: number, r: number): Structure[] {
    const ids = this.structureGrid.query(x, y, r);
    const result: Structure[] = [];
    for (const id of ids) {
      const e = this.allById.get(id);
      if (e && e instanceof Structure) result.push(e);
    }
    return result;
  }

  getLeaderboard(): { id: number; nickname: string; points: number }[] {
    return Array.from(this.players.values())
      .sort((a, b) => b.points - a.points)
      .slice(0, 10)
      .map(p => ({ id: p.id, nickname: p.nickname, points: p.points }));
  }

  findSpawnPos(): { x: number; y: number } {
    return this.randPos([BiomeType.PLAINS]) ?? { x: MAP_SIZE / 2, y: MAP_SIZE / 2 };
  }

  // ─── Update ───────────────────────────────────────────────────────────────

  removedEntityIds: number[] = [];

  update(dt: number): void {
    this.removedEntityIds = [];
    // BUG-17: clear spike hits at start of each tick
    this.spikeHits = [];

    // Respawn dead resources
    for (const r of this.resources.values()) {
      if (!r.dead) continue;
      r.respawnTimer += dt * 1000;
      if (r.respawnTimer >= RESOURCE_RESPAWN_TIME) {
        r.respawn();
        // Broadcast respawn via entity update (hp > 0 now)
      }
    }

    // Update animals + track grid movement
    for (const a of this.animals.values()) {
      if (a.dead) {
        a.despawnTimer -= dt * 1000;
        if (a.despawnTimer <= 0) {
          this.animals.delete(a.id);
          this.allById.delete(a.id);
          this.animalGrid.remove(a.id, a.x, a.y);
          this.removedEntityIds.push(a.id);
        }
        continue;
      }
      const ox = a.x, oy = a.y;
      a.update(dt, this.players);
      this.animalGrid.move(a.id, ox, oy, a.x, a.y);
      this.resolveAnimalCollisions(a);
    }

    // BUG-18: decrement spike damageTimer each tick so it can fire again
    for (const s of this.structures.values()) {
      if (s.damageTimer > 0) s.damageTimer -= dt * 1000;
    }

    // Update players + grid
    for (const p of this.players.values()) {
      if (p.dead) continue;
      const ox = p.x, oy = p.y;
      p.update(dt);
      this.playerGrid.move(p.id, ox, oy, p.x, p.y);
      this.resolvePlayerCollisions(p);
    }
  }

  // ─── Collision resolution (uses spatial grid) ────────────────────────────

  private resolvePlayerCollisions(player: Player): void {
    const nearby = this.getNearbyEntities(player.x, player.y, 150);

    for (const e of nearby) {
      if (e === player) continue;

      // Skip other players for performance (just nudge)
      if (e instanceof Player) {
        this.nudge(player, e, 0.5);
        continue;
      }

      if (e instanceof Resource && !e.dead) {
        this.pushOut(player, e.x, e.y, player.radius + e.radius);
        continue;
      }

      if (e instanceof Structure && !e.dead) {
        this.pushOut(player, e.x, e.y, player.radius + e.radius);

        // Spike damage — BUG-17: collect hit for Game.ts to emit DAMAGE + killPlayer
        if ((e.type === EntityType.SPIKE) && e.ownerId !== player.id) {
          if (e.damageTimer <= 0) {
            const dmg = e.spikeDamage ?? 20;
            player.hp = Math.max(0, player.hp - dmg);
            e.damageTimer = 1000;
            this.spikeHits.push({ socketId: player.socketId, damage: dmg, playerId: player.id });
          }
        }

        // Campfire warmth handled in SurvivalSystem
      }
    }
  }

  private resolveAnimalCollisions(animal: Animal): void {
    const nearby = this.getNearbyPlayers(animal.x, animal.y, 80);
    for (const p of nearby) {
      this.nudge(animal, p, 0.5);
    }
  }

  private pushOut(mover: Entity, ox: number, oy: number, minDist: number): void {
    const dx = mover.x - ox, dy = mover.y - oy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < minDist && dist > 0.001) {
      const overlap = minDist - dist;
      mover.x += (dx / dist) * overlap;
      mover.y += (dy / dist) * overlap;
      // Clamp to map
      mover.x = Math.max(mover.radius, Math.min(MAP_SIZE - mover.radius, mover.x));
      mover.y = Math.max(mover.radius, Math.min(MAP_SIZE - mover.radius, mover.y));
    }
  }

  private nudge(a: Entity, b: Entity, factor: number): void {
    const dx = a.x - b.x, dy = a.y - b.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const minDist = a.radius + b.radius;
    if (dist < minDist && dist > 0.001) {
      const overlap = (minDist - dist) * factor;
      const nx = dx / dist, ny = dy / dist;
      a.x += nx * overlap; a.y += ny * overlap;
      b.x -= nx * overlap; b.y -= ny * overlap;
    }
  }
}
