import { Player } from '../entities/Player';
import { World } from '../core/World';
import { Structure } from '../entities/Structure';
import { EntityType } from '../../../shared/packets';
import { ItemId, ITEMS } from '../../../shared/items';

const STRUCTURE_MAP: Partial<Record<number, { type: EntityType; radius: number; spikeDmg?: number }>> = {
  [ItemId.CAMPFIRE]:    { type: EntityType.FIRE,        radius: 32 },
  [ItemId.WALL_WOOD]:   { type: EntityType.WALL_WOOD,   radius: 36 },
  [ItemId.WALL_STONE]:  { type: EntityType.WALL_STONE,  radius: 36 },
  [ItemId.SPIKE_WOOD]:  { type: EntityType.SPIKE,       radius: 28, spikeDmg: 20 },
  [ItemId.SPIKE_STONE]: { type: EntityType.SPIKE,       radius: 28, spikeDmg: 30 },
  [ItemId.CHEST]:       { type: EntityType.CHEST,       radius: 34 },
  [ItemId.WORKSHOP]:    { type: EntityType.WORKSHOP,    radius: 40 },
  [ItemId.FURNACE]:     { type: EntityType.FURNACE,     radius: 36 },
};

export function processPlace(
  player: Player,
  itemId: number,
  angle: number,
  world: World,
): Structure | null {
  const info    = STRUCTURE_MAP[itemId];
  if (!info) return null;
  const itemDef = ITEMS[itemId];
  if (!itemDef?.isStructure) return null;
  if (player.countItem(itemId as ItemId) <= 0) return null;

  const dist = info.radius + player.radius + 12;
  const px   = player.x + Math.cos(angle) * dist;
  const py   = player.y + Math.sin(angle) * dist;

  // Overlap check
  for (const s of world.structures.values()) {
    if (s.dead) continue;
    const d = Math.sqrt((s.x - px) ** 2 + (s.y - py) ** 2);
    if (d < s.radius + info.radius - 4) return null;
  }

  player.removeItem(itemId as ItemId, 1);

  const s = new Structure(
    info.type, px, py,
    itemDef.structureHp ?? 100,
    info.radius,
    player.id,
    itemId as ItemId,
    info.spikeDmg ?? 0,
  );
  s.angle = angle;
  world.addStructure(s);
  return s;
}
