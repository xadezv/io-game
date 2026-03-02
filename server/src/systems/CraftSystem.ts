import { Player } from '../entities/Player';
import { ItemId, RECIPES, ITEMS } from '../../../shared/items';

export interface CraftResult {
  success: boolean;
  itemId?: ItemId;
  count?: number;
  error?: string;
}

export function processCraft(player: Player, resultItemId: number): CraftResult {
  const recipe = RECIPES.find(r => r.result === resultItemId);

  if (!recipe) {
    return { success: false, error: 'Unknown recipe' };
  }

  // Check ingredients
  for (const ing of recipe.ingredients) {
    if (player.countItem(ing.item) < ing.count) {
      return { success: false, error: `Not enough ${ItemId[ing.item]}` };
    }
  }

  // Consume ingredients
  for (const ing of recipe.ingredients) {
    player.removeItem(ing.item, ing.count);
  }

  // Give result
  const added = player.addItem(recipe.result, recipe.count);
  if (!added) {
    // Inventory full — refund
    for (const ing of recipe.ingredients) {
      player.addItem(ing.item, ing.count);
    }
    return { success: false, error: 'Inventory full' };
  }

  return { success: true, itemId: recipe.result, count: recipe.count };
}
