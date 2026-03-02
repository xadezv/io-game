import { Player } from '../entities/Player';
import { World } from '../core/World';
import { Structure } from '../entities/Structure';
import { EntityType } from '../../../shared/packets';
import { ItemId, ITEMS } from '../../../shared/items';

const STRUCTURE_MAP: Partial<Record<ItemId, { type: EntityType; radius: number }>> = {
  [ItemId.CAMPFIRE]:   { type: EntityType.FIRE,       radius: 32 },
  [ItemId.WALL_WOOD]:  { type: EntityType.WALL_WOOD,  radius: 36 },
  [ItemId.WALL_STONE]: { type: EntityType.WALL_STONE, radius: 36 },
  [ItemId.SPIKE_WOOD]: { type: EntityType.SPIKE,      radius: 28 },
};

export function processPlace(
  player: Player,
  itemId: number,
  angle: number,
  world: World,
): Structure | null {
  const info = STRUCTURE_MAP[itemId as ItemId];
  if (!info) return null;

  const itemDef = ITEMS[itemId];
  if (!itemDef || !itemDef.isStructure) return null;
  if (player.countItem(itemId as ItemId) <= 0) return null;

  // Place in front of player
  const dist = info.radius + player.radius + 10;
  const px = player.x + Math.cos(angle) * dist;
  const py = player.y + Math.sin(angle) * dist;

  // Check overlap with existing structures
  for (const s of world.structures.values()) {
    if (s.dead) continue;
    const d = Math.sqrt((s.x - px) ** 2 + (s.y - py) ** 2);
    if (d < s.radius + info.radius - 5) return null; // overlap
  }

  player.removeItem(itemId as ItemId, 1);

  const structure = new Structure(
    info.type,
    px,
    py,
    itemDef.structureHp ?? 100,
    info.radius,
    player.id,
    itemId as ItemId,
  );
  structure.angle = angle;
  world.structures.set(structure.id, structure);

  return structure;
}
