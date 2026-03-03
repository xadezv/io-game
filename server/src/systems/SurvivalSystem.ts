import { Player } from '../entities/Player';
import { World } from '../core/World';
import { getBiomeAt } from '../map/MapGen';
import { BiomeType, EntityType } from '../../../shared/packets';
import { ItemId, ITEMS } from '../../../shared/items';
import {
  HUNGER_DRAIN, THIRST_DRAIN, TEMP_COLD_DRAIN, TEMP_HOT_DRAIN, TEMP_NORMAL,
} from '../../../shared/constants';

export function updateSurvival(player: Player, world: World, dt: number, isNight: boolean, stormActive: boolean = false): void {
  // Stat decay
  player.hunger = Math.max(0, player.hunger - HUNGER_DRAIN * dt);
  player.thirst = Math.max(0, player.thirst - THIRST_DRAIN * dt);

  // Biome temperature
  const biome = getBiomeAt(world.mapData, player.x, player.y);
  let tempTarget = TEMP_NORMAL;

  switch (biome) {
    case BiomeType.SNOW:
      tempTarget = isNight ? 8 : 22;
      break;
    case BiomeType.DESERT:
      tempTarget = isNight ? 42 : 82;
      break;
    default:
      tempTarget = isNight ? 32 : 50;
  }

  // Near campfire bonus
  const nearFire = world.getNearbyStructures(player.x, player.y, 180)
    .some(s => !s.dead && s.type === EntityType.FIRE);
  player.nearFire = nearFire;
  if (nearFire) tempTarget = Math.min(65, tempTarget + 45);

  // Hat bonus
  if (player.hatId !== -1) {
    const hat = ITEMS[player.hatId];
    if (hat?.tempBonus) {
      if (biome === BiomeType.SNOW)   tempTarget += hat.tempBonus;
      if (biome === BiomeType.DESERT) tempTarget -= hat.tempBonus * 0.5;
    }
  }

  // Lerp temp toward target (storm doubles drain rate in snow biome)
  const stormMult = (stormActive && biome === BiomeType.SNOW) ? 2 : 1;
  const rate = (biome === BiomeType.SNOW ? TEMP_COLD_DRAIN : TEMP_HOT_DRAIN) * stormMult;
  const diff = tempTarget - player.temp;
  player.temp = Math.max(0, Math.min(100, player.temp + diff * rate * dt * 0.12));

  // HP damage from critical stats
  if (player.hunger <= 0)           player.hp = Math.max(0, player.hp - 1.8 * dt);
  else if (player.hunger < 20)      player.hp = Math.max(0, player.hp - 0.5 * dt);
  else if (player.hunger > 50)      player.hp = Math.min(100, player.hp + 0.25 * dt); // regen

  if (player.thirst <= 0)           player.hp = Math.max(0, player.hp - 2.5 * dt);

  if (player.temp <= 5)             player.hp = Math.max(0, player.hp - 2.0 * dt);
  else if (player.temp >= 95)       player.hp = Math.max(0, player.hp - 1.5 * dt);

  // Poison DoT
  if (player.poisonTimer > 0) {
    player.hp = Math.max(0, player.hp - 2 * dt);
    player.poisonTimer = Math.max(0, player.poisonTimer - dt * 1000);
  }

  // Weapon poison coating timer
  if (player.poisonCoatTimer > 0) {
    player.poisonCoatTimer = Math.max(0, player.poisonCoatTimer - dt * 1000);
    if (player.poisonCoatTimer <= 0) player.poisonCoated = false;
  }
}

export function useFood(player: Player, itemId: ItemId): boolean {
  const item = ITEMS[itemId];
  if (!item?.isFood) return false;
  if (player.countItem(itemId) <= 0) return false;

  player.removeItem(itemId, 1);
  if (itemId === ItemId.MUSHROOM && (item.foodHp ?? 0) < 0) {
    player.poisonTimer = 10000;
  } else if (item.foodHp) {
    player.hp = Math.min(100, player.hp + item.foodHp);
  }
  if (item.foodHunger) player.hunger = Math.min(100, player.hunger + item.foodHunger);
  if (item.foodThirst) player.thirst = Math.min(100, player.thirst + item.foodThirst);

  return true;
}
