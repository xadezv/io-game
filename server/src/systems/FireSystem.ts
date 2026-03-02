import { World } from '../core/World';
import { EntityType } from '../../../shared/packets';

export function processFireSpread(world: World, dt: number): number[] {
  const removed: number[] = [];
  for (const s of world.structures.values()) {
    if (s.dead || s.type !== EntityType.FIRE) continue;
    const near = world.getNearbyStructures(s.x, s.y, 80);
    for (const t of near) {
      if (t.dead) continue;
      if (t.type !== EntityType.WALL_WOOD && t.type !== EntityType.SPIKE) continue;
      if (Math.random() < 0.005) world.burningStructures.add(t.id);
    }
  }
  for (const id of Array.from(world.burningStructures)) {
    const t = world.structures.get(id);
    if (!t || t.dead) { world.burningStructures.delete(id); continue; }
    t.hp -= 8 * dt;
    if (t.hp <= 0) {
      t.dead = true;
      world.burningStructures.delete(id);
      removed.push(id);
    }
  }
  return removed;
}
