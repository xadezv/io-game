import { World } from '../core/World';
import { EntityType } from '../../../shared/packets';
import { ItemId } from '../../../shared/items';

export function processFireSpread(world: World, dt: number): void {
  for (const campfire of world.structures.values()) {
    if (campfire.dead || campfire.type !== EntityType.FIRE) continue;
    const nearby = world.getNearbyStructures(campfire.x, campfire.y, 80);
    for (const s of nearby) {
      if (s.id === campfire.id || s.dead || world.burningStructures.has(s.id)) continue;
      const burnable = s.type === EntityType.WALL_WOOD || (s.type === EntityType.SPIKE && s.itemId === ItemId.SPIKE_WOOD);
      if (!burnable) continue;
      if (Math.random() < 0.005) {
        world.burningStructures.add(s.id);
        s.isBurning = true;
      }
    }
  }

  for (const id of Array.from(world.burningStructures)) {
    const s = world.structures.get(id);
    if (!s || s.dead) {
      world.burningStructures.delete(id);
      continue;
    }
    const damage = 8 * dt;
    s.hp -= damage;
    world.fireDamageEvents.push({ targetId: s.id, damage: Math.max(1, Math.round(damage)) });
    if (s.hp <= 0) world.removeStructure(s.id);
  }
}
