import { Entity } from './Entity';
import { EntityType } from '../../../shared/packets';
import { ItemId } from '../../../shared/items';

export class Structure extends Entity {
  ownerId: number;
  itemId: ItemId;
  damageTimer: number = 0; // cooldown for spike damage

  constructor(type: EntityType, x: number, y: number, hp: number, radius: number, ownerId: number, itemId: ItemId) {
    super(type, x, y, hp, radius);
    this.ownerId = ownerId;
    this.itemId = itemId;
  }

  serialize(): unknown[] {
    return [
      this.id,
      this.type,
      Math.round(this.x),
      Math.round(this.y),
      Math.round(this.angle * 100) / 100,
      this.hp,
      this.itemId,
      -1,
      '',
      1,
      0,
      0,
    ];
  }
}
