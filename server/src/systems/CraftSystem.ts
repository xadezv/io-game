import { Player } from '../entities/Player';
import { World } from '../core/World';
import { ItemId, RECIPES } from '../../../shared/items';
import { EntityType } from '../../../shared/packets';

export interface CraftResult {
  success: boolean;
  itemId?:  ItemId;
  count?:   number;
  error?:   string;
}

const WORKSHOP_RANGE = 200;

export function processCraft(player: Player, resultItemId: number, world: World): CraftResult {
  const recipe = RECIPES.find(r => (r.result as number) === resultItemId);
  if (!recipe) return { success: false, error: 'Unknown recipe' };

  for (const ing of recipe.ingredients) {
    if (player.countItem(ing.item) < ing.count) {
      return { success: false, error: `Need more ${ing.item}` };
    }
  }

  if (recipe.requiresWorkbench) {
    const nearby = world.getNearbyStructures(player.x, player.y, WORKSHOP_RANGE);
    const hasWorkshop = nearby.some(s => !s.dead && s.type === EntityType.WORKSHOP);
    if (!hasWorkshop) {
      return { success: false, error: 'Requires a Workshop nearby' };
    }
  }

  // Consume
  for (const ing of recipe.ingredients) player.removeItem(ing.item, ing.count);

  if (!player.addItem(recipe.result, recipe.count)) {
    // Inventory full — refund
    for (const ing of recipe.ingredients) player.addItem(ing.item, ing.count);
    return { success: false, error: 'Inventory full' };
  }

  return { success: true, itemId: recipe.result, count: recipe.count };
}
