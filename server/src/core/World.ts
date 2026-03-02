import { Entity } from '../entities/Entity';
import { Player } from '../entities/Player';
import { Resource, RESOURCE_CONFIGS } from '../entities/Resource';
import { Animal, ANIMAL_CONFIGS } from '../entities/Animal';
import { Structure } from '../entities/Structure';
import { generateMap, MapData, getBiomeAt, RNG } from '../map/MapGen';
import { EntityType, BiomeType } from '../../../shared/packets';
import { ItemId } from '../../../shared/items';
import {
  MAP_SIZE, VIEW_DISTANCE,
  TREE_COUNT, STONE_COUNT, GOLD_COUNT, BERRY_COUNT, ANIMAL_COUNT,
  RESOURCE_RESPAWN_TIME
} from '../../../shared/constants';

export class World {
  mapData: MapData;
  players: Map<string, Player> = new Map();
  resources: Map<number, Resource> = new Map();
  animals: Map<number, Animal> = new Map();
  structures: Map<number, Structure> = new Map();
  
  private rng: RNG;

  constructor(seed?: number) {
    const s = seed ?? Math.floor(Math.random() * 0x7fffffff);
    this.rng = new RNG(s);
    this.mapData = generateMap(s);
    this.spawnResources();
    this.spawnAnimals();
  }

  private randPos(biomeFilter?: BiomeType[]): { x: number; y: number } {
    for (let attempt = 0; attempt < 200; attempt++) {
      const x = this.rng.nextFloat(200, MAP_SIZE - 200);
      const y = this.rng.nextFloat(200, MAP_SIZE - 200);
      const biome = getBiomeAt(this.mapData, x, y);
      if (!biomeFilter || biomeFilter.includes(biome)) {
        // Check not ocean
        if (biome !== BiomeType.OCEAN) return { x, y };
      }
    }
    return { x: MAP_SIZE / 2, y: MAP_SIZE / 2 };
  }

  private spawnResources(): void {
    // Trees in plains/forest
    for (let i = 0; i < TREE_COUNT; i++) {
      const pos = this.randPos([BiomeType.PLAINS, BiomeType.FOREST]);
      const r = new Resource(EntityType.TREE, pos.x, pos.y);
      this.resources.set(r.id, r);
    }

    // Snow trees
    for (let i = 0; i < Math.floor(TREE_COUNT * 0.3); i++) {
      const pos = this.randPos([BiomeType.SNOW]);
      const r = new Resource(EntityType.SNOW_TREE, pos.x, pos.y);
      this.resources.set(r.id, r);
    }

    // Stones in all land biomes
    for (let i = 0; i < STONE_COUNT; i++) {
      const pos = this.randPos([BiomeType.PLAINS, BiomeType.FOREST, BiomeType.SNOW, BiomeType.DESERT]);
      const r = new Resource(EntityType.STONE, pos.x, pos.y);
      this.resources.set(r.id, r);
    }

    // Gold
    for (let i = 0; i < GOLD_COUNT; i++) {
      const pos = this.randPos([BiomeType.PLAINS, BiomeType.SNOW, BiomeType.DESERT]);
      const r = new Resource(EntityType.GOLD, pos.x, pos.y);
      this.resources.set(r.id, r);
    }

    // Berries in plains/forest
    for (let i = 0; i < BERRY_COUNT; i++) {
      const pos = this.randPos([BiomeType.PLAINS, BiomeType.FOREST]);
      const r = new Resource(EntityType.BERRY, pos.x, pos.y);
      this.resources.set(r.id, r);
    }

    // Cactus in desert
    for (let i = 0; i < Math.floor(BERRY_COUNT * 0.5); i++) {
      const pos = this.randPos([BiomeType.DESERT]);
      const r = new Resource(EntityType.CACTUS, pos.x, pos.y);
      this.resources.set(r.id, r);
    }
  }

  private spawnAnimals(): void {
    for (let i = 0; i < Math.floor(ANIMAL_COUNT * 0.6); i++) {
      const pos = this.randPos([BiomeType.PLAINS, BiomeType.FOREST]);
      const a = new Animal(EntityType.RABBIT, pos.x, pos.y);
      this.animals.set(a.id, a);
    }

    for (let i = 0; i < Math.floor(ANIMAL_COUNT * 0.4); i++) {
      const pos = this.randPos([BiomeType.PLAINS, BiomeType.FOREST, BiomeType.SNOW]);
      const a = new Animal(EntityType.WOLF, pos.x, pos.y);
      this.animals.set(a.id, a);
    }
  }

  getEntitiesInView(cx: number, cy: number): Entity[] {
    const result: Entity[] = [];
    const vd = VIEW_DISTANCE;

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

  getLeaderboard(): { id: number; nickname: string; points: number }[] {
    const entries = Array.from(this.players.values())
      .filter(p => !p.dead)
      .sort((a, b) => b.points - a.points)
      .slice(0, 10)
      .map(p => ({ id: p.id, nickname: p.nickname, points: p.points }));
    return entries;
  }

  findSpawnPos(): { x: number; y: number } {
    return this.randPos([BiomeType.PLAINS]);
  }

  update(dt: number): void {
    // Update resources (respawn)
    for (const r of this.resources.values()) {
      if (r.dead) {
        r.respawnTimer += dt * 1000;
        if (r.respawnTimer >= RESOURCE_RESPAWN_TIME) {
          r.respawn();
        }
      }
    }

    // Update animals
    for (const a of this.animals.values()) {
      if (!a.dead) {
        a.update(dt, this.players);
        // Check for collision with players
        this.resolveAnimalPlayerCollisions(a);
      }
    }

    // Update players
    for (const p of this.players.values()) {
      if (!p.dead) {
        p.update(dt);
        this.resolvePlayerCollisions(p);
      }
    }
  }

  private resolvePlayerCollisions(player: Player): void {
    // Resources
    for (const r of this.resources.values()) {
      if (r.dead) continue;
      const dist = player.distToPoint(r.x, r.y);
      const minDist = player.radius + r.radius;
      if (dist < minDist && dist > 0) {
        const nx = (player.x - r.x) / dist;
        const ny = (player.y - r.y) / dist;
        const overlap = minDist - dist;
        player.x += nx * overlap;
        player.y += ny * overlap;
      }
    }

    // Structures
    for (const s of this.structures.values()) {
      if (s.dead) continue;
      const dist = player.distToPoint(s.x, s.y);
      const minDist = player.radius + s.radius;
      if (dist < minDist && dist > 0) {
        const nx = (player.x - s.x) / dist;
        const ny = (player.y - s.y) / dist;
        const overlap = minDist - dist;
        player.x += nx * overlap;
        player.y += ny * overlap;

        // Spike damage
        if ((s.type === EntityType.SPIKE_WOOD || s.type === EntityType.SPIKE_STONE) && s.ownerId !== player.id) {
          if (s.damageTimer <= 0) {
            player.hp -= 20;
            s.damageTimer = 1000;
          }
        }
      }
      if (s.damageTimer > 0) s.damageTimer -= 16;
    }

    // Other players
    for (const other of this.players.values()) {
      if (other === player || other.dead) continue;
      const dist = player.distToPoint(other.x, other.y);
      const minDist = player.radius + other.radius;
      if (dist < minDist && dist > 0) {
        const nx = (player.x - other.x) / dist;
        const ny = (player.y - other.y) / dist;
        const overlap = (minDist - dist) * 0.5;
        player.x += nx * overlap;
        player.y += ny * overlap;
        other.x -= nx * overlap;
        other.y -= ny * overlap;
      }
    }
  }

  private resolveAnimalPlayerCollisions(animal: Animal): void {
    for (const p of this.players.values()) {
      if (p.dead) continue;
      const dist = animal.distTo(p);
      const minDist = animal.radius + p.radius;
      if (dist < minDist && dist > 0) {
        const nx = (animal.x - p.x) / dist;
        const ny = (animal.y - p.y) / dist;
        const overlap = (minDist - dist) * 0.5;
        animal.x += nx * overlap;
        animal.y += ny * overlap;
        p.x -= nx * overlap;
        p.y -= ny * overlap;
      }
    }
  }
}
