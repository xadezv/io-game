import { Entity } from './Entity';
import { EntityType } from '../../../shared/packets';
import { ItemId } from '../../../shared/items';

export class Structure extends Entity {
  ownerId:    number;
  itemId:     ItemId;
  damageTimer: number = 0;
  spikeDamage: number = 20;
  isBurning: boolean = false;
  storage: { itemId: number; count: number }[] = Array(5).fill(null).map(() => ({ itemId: -1, count: 0 }));

  constructor(
    type: EntityType,
    x: number, y: number,
    hp: number, radius: number,
    ownerId: number,
    itemId: ItemId,
    spikeDamage = 20,
  ) {
    super(type, x, y, hp, radius);
    this.ownerId    = ownerId;
    this.itemId     = itemId;
    this.spikeDamage = spikeDamage;
  }

  serialize(): unknown[] {
    return [
      this.id, this.type,
      Math.round(this.x), Math.round(this.y),
      Math.round(this.angle * 100) / 100,
      this.hp,
      this.itemId, -1, '', 1, 0, 0, this.isBurning ? 1 : 0,
    ];
  }
}
