import { Player } from '../entities/Player';
import { ItemId, RECIPES } from '../../../shared/items';

export interface CraftResult {
  success: boolean;
  itemId?:  ItemId;
  count?:   number;
  error?:   string;
}

export function processCraft(player: Player, resultItemId: number): CraftResult {
  const recipe = RECIPES.find(r => (r.result as number) === resultItemId);
  if (!recipe) return { success: false, error: 'Unknown recipe' };

  for (const ing of recipe.ingredients) {
    if (player.countItem(ing.item) < ing.count) {
      return { success: false, error: `Need more ${ing.item}` };
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
