import { Player } from '../entities/Player';
import { World } from '../core/World';
import { getBiomeAt } from '../map/MapGen';
import { BiomeType } from '../../../shared/packets';
import { EntityType } from '../../../shared/packets';
import {
  HUNGER_DRAIN, THIRST_DRAIN, TEMP_COLD_DRAIN, TEMP_HOT_DRAIN, TEMP_NORMAL
} from '../../../shared/constants';
import { ItemId, ITEMS } from '../../../shared/items';

export function updateSurvival(player: Player, world: World, dt: number, isNight: boolean): void {
  if (player.dead) return;

  // Hunger & thirst drain
  player.hunger = Math.max(0, player.hunger - HUNGER_DRAIN * dt);
  player.thirst = Math.max(0, player.thirst - THIRST_DRAIN * dt);

  // Temperature based on biome
  const biome = getBiomeAt(world.mapData, player.x, player.y);
  let tempTarget = TEMP_NORMAL;

  if (biome === BiomeType.SNOW) {
    tempTarget = isNight ? 10 : 25;
  } else if (biome === BiomeType.DESERT) {
    tempTarget = isNight ? 45 : 80;
  } else {
    tempTarget = isNight ? 35 : 50;
  }

  // Near campfire bonus
  let nearFire = false;
  for (const s of world.structures.values()) {
    if (s.dead) continue;
    if (s.type === EntityType.FIRE) {
      const dist = player.distToPoint(s.x, s.y);
      if (dist < 150) {
        nearFire = true;
        break;
      }
    }
  }
  player.nearFire = nearFire;

  if (nearFire) {
    tempTarget = Math.min(TEMP_NORMAL + 20, tempTarget + 40);
  }

  // Hat bonus
  if (player.hatId !== (-1 as ItemId)) {
    const hat = ITEMS[player.hatId];
    if (hat?.tempBonus) {
      if (biome === BiomeType.SNOW) tempTarget += hat.tempBonus;
      else if (biome === BiomeType.DESERT) tempTarget -= hat.tempBonus * 0.5;
    }
  }

  // Move temp toward target
  const tempDiff = tempTarget - player.temp;
  const rate = biome === BiomeType.SNOW ? TEMP_COLD_DRAIN : TEMP_HOT_DRAIN;
  player.temp = Math.max(0, Math.min(100, player.temp + tempDiff * rate * dt * 0.1));

  // Stat damage
  if (player.hunger <= 0) {
    player.hp = Math.max(0, player.hp - 2 * dt);
  } else if (player.hunger < 20) {
    player.hp = Math.max(0, player.hp - 0.5 * dt);
  } else if (player.hunger > 50 && player.hp < 100) {
    // Regen when fed
    player.hp = Math.min(100, player.hp + 0.3 * dt);
  }

  if (player.thirst <= 0) {
    player.hp = Math.max(0, player.hp - 3 * dt);
  }

  if (player.temp <= 0 || player.temp >= 100) {
    player.hp = Math.max(0, player.hp - 2 * dt);
  }
}

export function useFood(player: Player, itemId: ItemId): boolean {
  const item = ITEMS[itemId];
  if (!item || !item.isFood) return false;
  if (player.countItem(itemId) <= 0) return false;

  player.removeItem(itemId, 1);
  if (item.foodHp) player.hp = Math.min(100, player.hp + item.foodHp);
  if (item.foodHunger) player.hunger = Math.min(100, player.hunger + item.foodHunger);
  if (item.foodThirst) player.thirst = Math.min(100, player.thirst + item.foodThirst);

  return true;
}
