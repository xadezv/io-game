import { World } from '../core/World';
import { EntityType } from '../../../shared/packets';

const IGNITE_RANGE = 80;
const IGNITE_CHANCE = 0.005;
const BURN_DPS = 8;

/**
 * Campfires can ignite nearby wood structures. Burning structures take DoT and
 * are removed when destroyed.
 */
export function processFireSpread(world: World): number[] {
  for (const campfire of world.structures.values()) {
    if (campfire.dead || campfire.type !== EntityType.FIRE) continue;

    const nearby = world.getNearbyStructures(campfire.x, campfire.y, IGNITE_RANGE);
    for (const s of nearby) {
      if (s.dead) continue;
      if (s.type !== EntityType.WALL_WOOD && s.type !== EntityType.SPIKE) continue;
      if (world.burningStructures.has(s.id)) continue;

      if (Math.random() < IGNITE_CHANCE) {
        world.burningStructures.add(s.id);
      }
    }
  }

  const removedIds: number[] = [];
  for (const id of Array.from(world.burningStructures)) {
    const s = world.structures.get(id);
    if (!s || s.dead) {
      world.burningStructures.delete(id);
      continue;
    }

    s.hp -= BURN_DPS * world.lastDt;
    if (s.hp <= 0) {
      s.hp = 0;
      s.dead = true;
      world.burningStructures.delete(id);
      world.removeStructure(id);
      removedIds.push(id);
    }
  }

  return removedIds;
}
