import { MAP_SIZE, TILE_SIZE, CHUNK_SIZE } from '../../../shared/constants';
import { BiomeType } from '../../../shared/packets';

// LCG — same as original client for reproducibility
export class RNG {
  private state: number;
  private readonly m = 0x80000000;
  private readonly a = 1103515245;
  private readonly c = 12345;

  constructor(seed: number) {
    this.state = seed;
  }

  next(): number {
    this.state = (this.a * this.state + this.c) % this.m;
    return this.state / this.m;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  nextFloat(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }
}

const TILES_COUNT = MAP_SIZE / TILE_SIZE;

export type TileType = 0 | 1 | 2 | 3 | 4; // grass, sand, snow, water, dark-grass

export interface MapData {
  seed: number;
  tiles: Uint8Array; // flat array [TILES_COUNT x TILES_COUNT]
  biomes: Uint8Array;
}

export function generateMap(seed: number): MapData {
  const rng = new RNG(seed);
  const total = TILES_COUNT * TILES_COUNT;
  const tiles = new Uint8Array(total);
  const biomes = new Uint8Array(total);

  // Simple Perlin-like noise using LCG — simplified for MVP
  // In real starve.io Perlin noise is used — we approximate with multi-octave LCG
  const NOISE_SCALE = 0.003;

  // Pre-generate noise
  for (let ty = 0; ty < TILES_COUNT; ty++) {
    for (let tx = 0; tx < TILES_COUNT; tx++) {
      const idx = ty * TILES_COUNT + tx;
      const cx = tx / TILES_COUNT;
      const cy = ty / TILES_COUNT;

      // Biome determination — radial zones like starve.io
      const distFromCenter = Math.sqrt((cx - 0.5) ** 2 + (cy - 0.5) ** 2);

      // Noise for variation
      const n = simplexApprox(tx * NOISE_SCALE, ty * NOISE_SCALE, seed);

      let biome: BiomeType;
      let tile: TileType;

      if (distFromCenter > 0.47) {
        // Ocean border
        biome = BiomeType.OCEAN;
        tile = 3; // water
      } else if (distFromCenter > 0.40) {
        // Beach / sand transition
        biome = BiomeType.DESERT;
        tile = 1; // sand
      } else {
        // Inner zones by angle + noise
        const angle = Math.atan2(cy - 0.5, cx - 0.5);
        // Divide map into zones: NE = snow, SE = desert, SW/NW = plains
        if (angle > -0.5 && angle < 1.2) {
          // East: desert
          biome = BiomeType.DESERT;
          tile = 1;
        } else if (angle > 1.2 || angle < -2.0) {
          // North: snow
          biome = BiomeType.SNOW;
          tile = 2;
        } else {
          // West/South: plains
          biome = n > 0.55 ? BiomeType.FOREST : BiomeType.PLAINS;
          tile = n > 0.55 ? 4 : 0; // dark-grass vs grass
        }
      }

      tiles[idx] = tile;
      biomes[idx] = biome;
    }
  }

  return { seed, tiles, biomes };
}

export function getBiomeAt(mapData: MapData, worldX: number, worldY: number): BiomeType {
  const tx = Math.floor(worldX / TILE_SIZE);
  const ty = Math.floor(worldY / TILE_SIZE);
  if (tx < 0 || ty < 0 || tx >= TILES_COUNT || ty >= TILES_COUNT) return BiomeType.OCEAN;
  return mapData.biomes[ty * TILES_COUNT + tx] as BiomeType;
}

// Approximated smooth noise without importing heavy libs
function simplexApprox(x: number, y: number, seed: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7 + seed * 0.001) * 43758.5453123;
  const n2 = Math.sin(x * 269.5 + y * 183.3 + seed * 0.002) * 43758.5453123;
  const n3 = Math.sin(x * 55.7 + y * 426.1 + seed * 0.003) * 43758.5453123;
  return ((n - Math.floor(n)) * 0.5 + (n2 - Math.floor(n2)) * 0.3 + (n3 - Math.floor(n3)) * 0.2);
}

export function getTileAt(mapData: MapData, worldX: number, worldY: number): TileType {
  const tx = Math.floor(worldX / TILE_SIZE);
  const ty = Math.floor(worldY / TILE_SIZE);
  if (tx < 0 || ty < 0 || tx >= TILES_COUNT || ty >= TILES_COUNT) return 3;
  return mapData.tiles[ty * TILES_COUNT + tx] as TileType;
}
