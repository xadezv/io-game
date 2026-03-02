import { World } from '../core/World';
import { EntityType } from '../../../shared/packets';

const FIRE_SPREAD_CHANCE = 0.005;
const FIRE_DAMAGE_RATE   = 8; // HP/s
const FIRE_SPREAD_RADIUS = 80;

export function processFireSpread(world: World, dt: number): void {
  // Spread from campfires to nearby wood structures
  for (const campfire of world.structures.values()) {
    if (campfire.dead || campfire.type !== EntityType.FIRE) continue;
    const nearby = world.getNearbyStructures(campfire.x, campfire.y, FIRE_SPREAD_RADIUS);
    for (const s of nearby) {
      if (s.dead || s.burning) continue;
      if (s.type !== EntityType.WALL_WOOD && s.type !== EntityType.SPIKE) continue;
      if (Math.random() < FIRE_SPREAD_CHANCE) s.burning = true;
    }
  }

  // Also spread fire between burning structures
  for (const burner of world.structures.values()) {
    if (burner.dead || !burner.burning) continue;
    const nearby = world.getNearbyStructures(burner.x, burner.y, FIRE_SPREAD_RADIUS);
    for (const s of nearby) {
      if (s.dead || s.burning) continue;
      if (s.type !== EntityType.WALL_WOOD && s.type !== EntityType.SPIKE) continue;
      if (Math.random() < FIRE_SPREAD_CHANCE) s.burning = true;
    }
  }

  // Damage burning structures
  for (const s of world.structures.values()) {
    if (!s.burning || s.dead) continue;
    s.hp -= FIRE_DAMAGE_RATE * dt;
    if (s.hp <= 0) {
      s.hp   = 0;
      s.dead = true;
      world.removedEntityIds.push(s.id);
    }
  }
}
