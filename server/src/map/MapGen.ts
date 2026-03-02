import { MAP_SIZE, TILE_SIZE } from '../../../shared/constants';
import { BiomeType } from '../../../shared/packets';

export const TILES_COUNT = MAP_SIZE / TILE_SIZE; // 450

// ─── LCG (same constants as client for reproducibility) ───────────────────
export class RNG {
  private state: number;
  static readonly M = 0x80000000;
  static readonly A = 1103515245;
  static readonly C = 12345;

  constructor(seed: number) {
    this.state = (seed >>> 0) % RNG.M;
  }

  next(): number {
    this.state = (RNG.A * this.state + RNG.C) % RNG.M;
    return this.state / RNG.M;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  nextFloat(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }
}

// ─── Permutation-table Perlin noise (portable, no deps) ───────────────────
function buildPermTable(seed: number): Uint8Array {
  const p = new Uint8Array(512);
  const base = new Uint8Array(256);
  for (let i = 0; i < 256; i++) base[i] = i;

  // Seeded Fisher-Yates shuffle
  const rng = new RNG(seed);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    const tmp = base[i]; base[i] = base[j]; base[j] = tmp;
  }
  for (let i = 0; i < 512; i++) p[i] = base[i & 255];
  return p;
}

function fade(t: number): number { return t * t * t * (t * (t * 6 - 15) + 10); }
function grad(hash: number, x: number, y: number): number {
  const h = hash & 3;
  const u = h < 2 ? x : y;
  const v = h < 2 ? y : x;
  return ((h & 1) ? -u : u) + ((h & 2) ? -v : v);
}

function perlin2(px: Uint8Array, x: number, y: number): number {
  const X = Math.floor(x) & 255;
  const Y = Math.floor(y) & 255;
  x -= Math.floor(x);
  y -= Math.floor(y);
  const u = fade(x), v = fade(y);
  const a = px[X] + Y, b = px[X + 1] + Y;
  return (
    lerp(v,
      lerp(u, grad(px[a],   x,   y),   grad(px[b],   x - 1, y)),
      lerp(u, grad(px[a+1], x,   y-1), grad(px[b+1], x - 1, y - 1))
    ) * 0.5 + 0.5
  );
}

function lerp(t: number, a: number, b: number): number { return a + t * (b - a); }

// Fractal Brownian Motion — stacked octaves for natural-looking terrain
function fbm(px: Uint8Array, x: number, y: number, octaves: number): number {
  let val = 0, amp = 0.5, freq = 1, max = 0;
  for (let i = 0; i < octaves; i++) {
    val += perlin2(px, x * freq, y * freq) * amp;
    max += amp;
    amp  *= 0.5;
    freq *= 2.0;
  }
  return val / max;
}

// ─── Tile types ────────────────────────────────────────────────────────────
export type TileType = 0 | 1 | 2 | 3 | 4; // grass | sand | snow | water | dark-grass

export interface MapData {
  seed:   number;
  tiles:  Uint8Array; // [TILES_COUNT * TILES_COUNT]
  biomes: Uint8Array;
}

// ─── Core biome/tile function (used by both server and client) ─────────────
export function getTileAndBiome(
  tx: number, ty: number,
  elevPx: Uint8Array, moistPx: Uint8Array, tempPx: Uint8Array,
  SCALE = 0.004
): { tile: TileType; biome: BiomeType } {
  const cx = tx / TILES_COUNT;
  const cy = ty / TILES_COUNT;

  // Distance from center — fade to ocean at edges
  const dx = cx - 0.5, dy = cy - 0.5;
  const distFromCenter = Math.sqrt(dx * dx + dy * dy) * 2; // 0..√2

  const elev  = fbm(elevPx,  tx * SCALE * TILES_COUNT, ty * SCALE * TILES_COUNT, 6);
  const moist = fbm(moistPx, tx * SCALE * TILES_COUNT * 0.7, ty * SCALE * TILES_COUNT * 0.7, 4);
  const temp  = fbm(tempPx,  tx * SCALE * TILES_COUNT * 0.5, ty * SCALE * TILES_COUNT * 0.5, 3);

  // Ocean ring
  const oceanEdge = 0.82;
  const effectiveElev = elev * (1 - Math.pow(distFromCenter / oceanEdge, 3));

  if (effectiveElev < 0.25 || distFromCenter > 0.88) {
    return { tile: 3 as TileType, biome: BiomeType.OCEAN };
  }

  // Beach
  if (effectiveElev < 0.32) {
    return { tile: 1 as TileType, biome: BiomeType.DESERT };
  }

  // Biome by temperature + moisture
  if (temp < 0.3) {
    // Cold
    return { tile: 2 as TileType, biome: BiomeType.SNOW };
  }
  if (temp > 0.65 && moist < 0.45) {
    // Hot + dry
    return { tile: 1 as TileType, biome: BiomeType.DESERT };
  }
  if (moist > 0.6) {
    // Wet → forest
    return { tile: 4 as TileType, biome: BiomeType.FOREST };
  }

  return { tile: 0 as TileType, biome: BiomeType.PLAINS };
}

export function generateMap(seed: number): MapData {
  const elevPx  = buildPermTable(seed);
  const moistPx = buildPermTable(seed ^ 0xdeadbeef);
  const tempPx  = buildPermTable(seed ^ 0xcafebabe);

  const total  = TILES_COUNT * TILES_COUNT;
  const tiles  = new Uint8Array(total);
  const biomes = new Uint8Array(total);

  for (let ty = 0; ty < TILES_COUNT; ty++) {
    for (let tx = 0; tx < TILES_COUNT; tx++) {
      const { tile, biome } = getTileAndBiome(tx, ty, elevPx, moistPx, tempPx);
      const idx = ty * TILES_COUNT + tx;
      tiles[idx]  = tile;
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

export function getTileAt(mapData: MapData, worldX: number, worldY: number): TileType {
  const tx = Math.floor(worldX / TILE_SIZE);
  const ty = Math.floor(worldY / TILE_SIZE);
  if (tx < 0 || ty < 0 || tx >= TILES_COUNT || ty >= TILES_COUNT) return 3;
  return mapData.tiles[ty * TILES_COUNT + tx] as TileType;
}
