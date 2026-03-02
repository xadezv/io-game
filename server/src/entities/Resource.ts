import { Entity } from './Entity';
import { EntityType } from '../../../shared/packets';
import { ItemId } from '../../../shared/items';
import { RESOURCE_RESPAWN_TIME } from '../../../shared/constants';

export interface ResourceDrop {
  itemId: ItemId;
  minCount: number;
  maxCount: number;
}

export interface ResourceConfig {
  type: EntityType;
  hp: number;
  radius: number;
  drops: ResourceDrop[];
  xpReward: number;
  preferredTool?: ItemId[]; // tools that deal extra damage
}

export const RESOURCE_CONFIGS: Record<number, ResourceConfig> = {
  [EntityType.TREE]: {
    type: EntityType.TREE,
    hp: 100,
    radius: 28,
    drops: [{ itemId: ItemId.WOOD, minCount: 5, maxCount: 15 }],
    xpReward: 10,
    preferredTool: [ItemId.AXE, ItemId.BIG_AXE, ItemId.GOLD_AXE],
  },
  [EntityType.STONE]: {
    type: EntityType.STONE,
    hp: 150,
    radius: 26,
    drops: [{ itemId: ItemId.STONE, minCount: 5, maxCount: 12 }],
    xpReward: 15,
    preferredTool: [ItemId.PICK, ItemId.BIG_PICK, ItemId.GOLD_PICK],
  },
  [EntityType.GOLD]: {
    type: EntityType.GOLD,
    hp: 200,
    radius: 24,
    drops: [{ itemId: ItemId.GOLD, minCount: 3, maxCount: 8 }, { itemId: ItemId.STONE, minCount: 2, maxCount: 5 }],
    xpReward: 30,
    preferredTool: [ItemId.PICK, ItemId.BIG_PICK, ItemId.GOLD_PICK],
  },
  [EntityType.BERRY]: {
    type: EntityType.BERRY,
    hp: 40,
    radius: 20,
    drops: [{ itemId: ItemId.BERRIES, minCount: 3, maxCount: 8 }],
    xpReward: 5,
  },
  [EntityType.CACTUS]: {
    type: EntityType.CACTUS,
    hp: 80,
    radius: 22,
    drops: [{ itemId: ItemId.CACTUS_FLESH, minCount: 2, maxCount: 5 }],
    xpReward: 8,
  },
  [EntityType.SNOW_TREE]: {
    type: EntityType.SNOW_TREE,
    hp: 120,
    radius: 28,
    drops: [{ itemId: ItemId.WOOD, minCount: 5, maxCount: 15 }, { itemId: ItemId.THREAD, minCount: 1, maxCount: 3 }],
    xpReward: 12,
    preferredTool: [ItemId.AXE, ItemId.BIG_AXE, ItemId.GOLD_AXE],
  },
};

export class Resource extends Entity {
  config: ResourceConfig;
  respawnTimer: number = 0;
  spawnX: number;
  spawnY: number;

  constructor(type: EntityType, x: number, y: number) {
    const cfg = RESOURCE_CONFIGS[type];
    super(type, x, y, cfg.hp, cfg.radius);
    this.config = cfg;
    this.spawnX = x;
    this.spawnY = y;
  }

  serialize(): unknown[] {
    return [
      this.id,
      this.type,
      Math.round(this.x),
      Math.round(this.y),
      0,
      this.hp,
    ];
  }

  respawn(): void {
    this.hp = this.config.hp;
    this.dead = false;
    this.respawnTimer = 0;
    // Reset id so client knows it's a new entity
    this.x = this.spawnX;
    this.y = this.spawnY;
  }
}
