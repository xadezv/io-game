export const ItemId = {
  // Tools / Weapons
  HAND:         0,
  AXE:          1,
  PICK:         2,
  SWORD:        3,
  BIG_AXE:      4,
  BIG_PICK:     5,
  GOLD_AXE:     6,
  GOLD_SWORD:   7,
  GOLD_PICK:    8,

  // Food
  BERRIES:      20,
  COOKED_MEAT:  21,
  RAW_MEAT:     22,
  COOKIE:       23,

  // Resources
  WOOD:         30,
  STONE:        31,
  GOLD:         32,
  THREAD:       33,
  COAL:         34,
  CACTUS_FLESH: 35,
  WHEAT:        36,
  MUSHROOM:     37,
  POISON_COATING: 38,
  PELT:         39,

  // Structures (placeable)
  CAMPFIRE:     40,
  WALL_WOOD:    41,
  WALL_STONE:   42,
  SPIKE_WOOD:   43,
  SPIKE_STONE:  44,
  WINDMILL:     45,
  CHEST:        46,
  FURNACE:      47,
  WORKSHOP:     48,

  // Hats / Clothing
  HAT_WINTER:   50,
  HAT_COWBOY:   51,
  HAT_HOOD:     52,
  COAT:         53,
  HAT_FUR:      54,
} as const;

export type ItemId = typeof ItemId[keyof typeof ItemId];

export interface Recipe {
  result: ItemId;
  count: number;
  ingredients: { item: ItemId; count: number }[];
  requiresWorkbench?: boolean;
}

export const RECIPES: Recipe[] = [
  // Tools
  { result: ItemId.AXE,        count: 1, ingredients: [{ item: ItemId.WOOD, count: 10 }, { item: ItemId.STONE, count: 5 }] },
  { result: ItemId.PICK,       count: 1, ingredients: [{ item: ItemId.WOOD, count: 10 }, { item: ItemId.STONE, count: 5 }] },
  { result: ItemId.SWORD,      count: 1, ingredients: [{ item: ItemId.WOOD, count: 5 },  { item: ItemId.STONE, count: 10 }] },
  { result: ItemId.BIG_AXE,    count: 1, ingredients: [{ item: ItemId.WOOD, count: 30 }, { item: ItemId.STONE, count: 20 }] },
  { result: ItemId.BIG_PICK,   count: 1, ingredients: [{ item: ItemId.WOOD, count: 30 }, { item: ItemId.STONE, count: 20 }] },
  { result: ItemId.GOLD_AXE,   count: 1, ingredients: [{ item: ItemId.WOOD, count: 10 }, { item: ItemId.GOLD, count: 20 }], requiresWorkbench: true },
  { result: ItemId.GOLD_SWORD, count: 1, ingredients: [{ item: ItemId.STONE, count: 5 }, { item: ItemId.GOLD, count: 25 }], requiresWorkbench: true },
  { result: ItemId.GOLD_PICK,  count: 1, ingredients: [{ item: ItemId.STONE, count: 10 }, { item: ItemId.GOLD, count: 20 }], requiresWorkbench: true },

  // Structures
  { result: ItemId.CAMPFIRE,   count: 1, ingredients: [{ item: ItemId.WOOD, count: 5 }, { item: ItemId.STONE, count: 2 }] },
  { result: ItemId.WALL_WOOD,  count: 2, ingredients: [{ item: ItemId.WOOD, count: 10 }] },
  { result: ItemId.WALL_STONE, count: 2, ingredients: [{ item: ItemId.STONE, count: 10 }] },
  { result: ItemId.SPIKE_WOOD, count: 1, ingredients: [{ item: ItemId.WOOD, count: 20 }, { item: ItemId.STONE, count: 5 }] },
  { result: ItemId.FURNACE,    count: 1, ingredients: [{ item: ItemId.STONE, count: 20 }, { item: ItemId.COAL, count: 5 }] },
  { result: ItemId.WORKSHOP,   count: 1, ingredients: [{ item: ItemId.WOOD, count: 40 }, { item: ItemId.STONE, count: 20 }] },
  { result: ItemId.CHEST,      count: 1, ingredients: [{ item: ItemId.WOOD, count: 30 }] },

  // Food
  { result: ItemId.COOKIE,     count: 1, ingredients: [{ item: ItemId.BERRIES, count: 7 }, { item: ItemId.WHEAT, count: 3 }] },

  // Clothing
  { result: ItemId.HAT_WINTER, count: 1, ingredients: [{ item: ItemId.THREAD, count: 15 }] },
  { result: ItemId.HAT_COWBOY, count: 1, ingredients: [{ item: ItemId.THREAD, count: 10 }, { item: ItemId.WOOD, count: 5 }] },
  { result: ItemId.POISON_COATING, count: 1, ingredients: [{ item: ItemId.MUSHROOM, count: 3 }, { item: ItemId.GOLD, count: 5 }], requiresWorkbench: true },
  { result: ItemId.HAT_FUR, count: 1, ingredients: [{ item: ItemId.PELT, count: 5 }, { item: ItemId.THREAD, count: 10 }] },
];

export interface ItemDef {
  id: ItemId;
  name: string;
  stackable: boolean;
  maxStack: number;
  isWeapon: boolean;
  isStructure: boolean;
  isFood: boolean;
  isHat: boolean;
  damage?: number;
  range?: number;
  attackCooldown?: number;
  foodHp?: number;
  foodHunger?: number;
  foodThirst?: number;
  structureHp?: number;
  tempBonus?: number;
  maxDurability?: number;
  sprite: string;
}

export const ITEMS: Record<number, ItemDef> = {
  [ItemId.HAND]:        { id: ItemId.HAND,        name: 'Hand',         stackable: false, maxStack: 1,   isWeapon: true,  isStructure: false, isFood: false, isHat: false, damage: 10, range: 50,  attackCooldown: 400, sprite: 'hand' },
  [ItemId.AXE]:         { id: ItemId.AXE,          name: 'Axe',          stackable: false, maxStack: 1,   isWeapon: true,  isStructure: false, isFood: false, isHat: false, damage: 15, range: 70,  attackCooldown: 500, sprite: 'axe' },
  [ItemId.PICK]:        { id: ItemId.PICK,          name: 'Pickaxe',      stackable: false, maxStack: 1,   isWeapon: true,  isStructure: false, isFood: false, isHat: false, damage: 20, range: 70,  attackCooldown: 500, sprite: 'pick' },
  [ItemId.SWORD]:       { id: ItemId.SWORD,         name: 'Sword',        stackable: false, maxStack: 1,   isWeapon: true,  isStructure: false, isFood: false, isHat: false, damage: 25, range: 80,  attackCooldown: 500, sprite: 'sword' },
  [ItemId.BIG_AXE]:    { id: ItemId.BIG_AXE,       name: 'Big Axe',      stackable: false, maxStack: 1,   isWeapon: true,  isStructure: false, isFood: false, isHat: false, damage: 25, range: 80,  attackCooldown: 600, sprite: 'big_axe' },
  [ItemId.BIG_PICK]:   { id: ItemId.BIG_PICK,      name: 'Big Pick',     stackable: false, maxStack: 1,   isWeapon: true,  isStructure: false, isFood: false, isHat: false, damage: 30, range: 80,  attackCooldown: 600, sprite: 'big_pick' },
  [ItemId.GOLD_AXE]:   { id: ItemId.GOLD_AXE,      name: 'Gold Axe',     stackable: false, maxStack: 1,   isWeapon: true,  isStructure: false, isFood: false, isHat: false, damage: 35, range: 80,  attackCooldown: 500, maxDurability: 200, sprite: 'gold_axe' },
  [ItemId.GOLD_SWORD]: { id: ItemId.GOLD_SWORD,    name: 'Gold Sword',   stackable: false, maxStack: 1,   isWeapon: true,  isStructure: false, isFood: false, isHat: false, damage: 45, range: 90,  attackCooldown: 500, maxDurability: 200, sprite: 'gold_sword' },
  [ItemId.GOLD_PICK]:  { id: ItemId.GOLD_PICK,     name: 'Gold Pick',    stackable: false, maxStack: 1,   isWeapon: true,  isStructure: false, isFood: false, isHat: false, damage: 40, range: 80,  attackCooldown: 500, maxDurability: 200, sprite: 'gold_pick' },

  [ItemId.BERRIES]:    { id: ItemId.BERRIES,       name: 'Berries',      stackable: true,  maxStack: 50,  isWeapon: false, isStructure: false, isFood: true,  isHat: false, foodHp: 5,  foodHunger: 15, foodThirst: 5,  sprite: 'berries' },
  [ItemId.RAW_MEAT]:   { id: ItemId.RAW_MEAT,      name: 'Raw Meat',     stackable: true,  maxStack: 20,  isWeapon: false, isStructure: false, isFood: true,  isHat: false, foodHp: 5,  foodHunger: 10, foodThirst: 0,  sprite: 'raw_meat' },
  [ItemId.COOKED_MEAT]:{ id: ItemId.COOKED_MEAT,   name: 'Cooked Meat',  stackable: true,  maxStack: 20,  isWeapon: false, isStructure: false, isFood: true,  isHat: false, foodHp: 20, foodHunger: 30, foodThirst: 5,  sprite: 'cooked_meat' },
  [ItemId.COOKIE]:     { id: ItemId.COOKIE,        name: 'Cookie',       stackable: true,  maxStack: 20,  isWeapon: false, isStructure: false, isFood: true,  isHat: false, foodHp: 15, foodHunger: 25, foodThirst: 10, sprite: 'cookie' },

  [ItemId.WOOD]:       { id: ItemId.WOOD,          name: 'Wood',         stackable: true,  maxStack: 999, isWeapon: false, isStructure: false, isFood: false, isHat: false, sprite: 'wood' },
  [ItemId.STONE]:      { id: ItemId.STONE,         name: 'Stone',        stackable: true,  maxStack: 999, isWeapon: false, isStructure: false, isFood: false, isHat: false, sprite: 'stone_item' },
  [ItemId.GOLD]:       { id: ItemId.GOLD,          name: 'Gold',         stackable: true,  maxStack: 999, isWeapon: false, isStructure: false, isFood: false, isHat: false, sprite: 'gold_item' },
  [ItemId.THREAD]:     { id: ItemId.THREAD,        name: 'Thread',       stackable: true,  maxStack: 999, isWeapon: false, isStructure: false, isFood: false, isHat: false, sprite: 'thread' },
  [ItemId.WHEAT]:      { id: ItemId.WHEAT,         name: 'Wheat',        stackable: true,  maxStack: 999, isWeapon: false, isStructure: false, isFood: false, isHat: false, sprite: 'wheat' },
  [ItemId.COAL]:        { id: ItemId.COAL,         name: 'Coal',         stackable: true,  maxStack: 999, isWeapon: false, isStructure: false, isFood: false, isHat: false, sprite: 'coal' },
  [ItemId.CACTUS_FLESH]:{ id: ItemId.CACTUS_FLESH, name: 'Cactus Flesh', stackable: true,  maxStack: 50,  isWeapon: false, isStructure: false, isFood: true,  isHat: false, foodHp: 3, foodHunger: 8, foodThirst: 12, sprite: 'cactus_flesh' },
  [ItemId.MUSHROOM]:   { id: ItemId.MUSHROOM,      name: 'Mushroom',      stackable: true,  maxStack: 50,  isWeapon: false, isStructure: false, isFood: true,  isHat: false, foodHp: -5, foodHunger: 10, foodThirst: 0, sprite: 'mushroom' },
  [ItemId.POISON_COATING]: { id: ItemId.POISON_COATING, name: 'Poison Coating', stackable: true, maxStack: 5, isWeapon: false, isStructure: false, isFood: false, isHat: false, sprite: 'poison_coating' },
  [ItemId.PELT]:       { id: ItemId.PELT,          name: 'Pelt',          stackable: true, maxStack: 10, isWeapon: false, isStructure: false, isFood: false, isHat: false, sprite: 'pelt' },

  [ItemId.CAMPFIRE]:   { id: ItemId.CAMPFIRE,      name: 'Campfire',     stackable: true,  maxStack: 10,  isWeapon: false, isStructure: true,  isFood: false, isHat: false, structureHp: 100, sprite: 'campfire' },
  [ItemId.WALL_WOOD]:  { id: ItemId.WALL_WOOD,     name: 'Wood Wall',    stackable: true,  maxStack: 20,  isWeapon: false, isStructure: true,  isFood: false, isHat: false, structureHp: 200, sprite: 'wall_wood' },
  [ItemId.WALL_STONE]: { id: ItemId.WALL_STONE,    name: 'Stone Wall',   stackable: true,  maxStack: 20,  isWeapon: false, isStructure: true,  isFood: false, isHat: false, structureHp: 400, sprite: 'wall_stone' },
  [ItemId.SPIKE_WOOD]: { id: ItemId.SPIKE_WOOD,    name: 'Wood Spike',   stackable: true,  maxStack: 10,  isWeapon: false, isStructure: true,  isFood: false, isHat: false, structureHp: 150, damage: 20, sprite: 'spike_wood' },
  [ItemId.SPIKE_STONE]:{ id: ItemId.SPIKE_STONE,   name: 'Stone Spike',  stackable: true,  maxStack: 10,  isWeapon: false, isStructure: true,  isFood: false, isHat: false, structureHp: 300, damage: 30, sprite: 'spike_wood' },

  [ItemId.HAT_WINTER]: { id: ItemId.HAT_WINTER,   name: 'Winter Hat',   stackable: false, maxStack: 1,   isWeapon: false, isStructure: false, isFood: false, isHat: true, tempBonus: 30, sprite: 'hat_winter' },
  [ItemId.HAT_COWBOY]: { id: ItemId.HAT_COWBOY,   name: 'Cowboy Hat',   stackable: false, maxStack: 1,   isWeapon: false, isStructure: false, isFood: false, isHat: true, tempBonus: 10, sprite: 'hat_cowboy' },
  [ItemId.HAT_FUR]:    { id: ItemId.HAT_FUR,      name: 'Fur Hat',      stackable: false, maxStack: 1,   isWeapon: false, isStructure: false, isFood: false, isHat: true, tempBonus: 50, sprite: 'hat_fur' },
};
