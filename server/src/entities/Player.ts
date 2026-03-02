import { Entity } from './Entity';
import { EntityType, MoveDir } from '../../../shared/packets';
import {
  PLAYER_MAX_HP, PLAYER_MAX_HUNGER, PLAYER_MAX_TEMP, PLAYER_MAX_THIRST,
  PLAYER_RADIUS, PLAYER_SPEED, ATTACK_COOLDOWN, MAP_SIZE
} from '../../../shared/constants';
import { ItemId } from '../../../shared/items';

export interface InventorySlot {
  itemId: ItemId;
  count: number;
}

export class Player extends Entity {
  nickname: string;
  socketId: string;

  // Stats
  hunger: number = PLAYER_MAX_HUNGER;
  thirst: number = PLAYER_MAX_THIRST;
  temp: number = PLAYER_MAX_TEMP;

  // Movement
  moveDir: number = MoveDir.NONE;
  vx: number = 0;
  vy: number = 0;

  // Combat
  selectedSlot: number = 0;
  attackAngle: number = 0;
  attackTimer: number = 0; // ms until next attack allowed
  isAttacking: boolean = false;
  attackAnimTimer: number = 0;

  // Inventory: 10 slots
  inventory: InventorySlot[] = Array(10).fill(null).map(() => ({ itemId: -1 as ItemId, count: 0 }));

  // Hat
  hatId: ItemId = -1 as ItemId;

  // Score / level
  points: number = 0;
  level: number = 1;
  xp: number = 0;

  // Respawn
  respawnTimer: number = 0;

  // Near campfire (temp benefit)
  nearFire: boolean = false;

  constructor(socketId: string, nickname: string, x: number, y: number) {
    super(EntityType.PLAYER, x, y, PLAYER_MAX_HP, PLAYER_RADIUS);
    this.socketId = socketId;
    this.nickname = nickname.substring(0, 16).trim() || 'Player';
  }

  getSelectedItem(): ItemId {
    const slot = this.inventory[this.selectedSlot];
    return slot && slot.count > 0 ? slot.itemId : ItemId.HAND;
  }

  addItem(itemId: ItemId, count: number = 1): boolean {
    // Stack if stackable
    for (const slot of this.inventory) {
      if (slot.itemId === itemId && slot.count > 0) {
        slot.count += count;
        return true;
      }
    }
    // Find empty
    for (const slot of this.inventory) {
      if (slot.count === 0) {
        slot.itemId = itemId;
        slot.count = count;
        return true;
      }
    }
    return false; // full
  }

  removeItem(itemId: ItemId, count: number = 1): boolean {
    for (const slot of this.inventory) {
      if (slot.itemId === itemId && slot.count >= count) {
        slot.count -= count;
        if (slot.count === 0) slot.itemId = -1 as ItemId;
        return true;
      }
    }
    return false;
  }

  countItem(itemId: ItemId): number {
    let total = 0;
    for (const slot of this.inventory) {
      if (slot.itemId === itemId) total += slot.count;
    }
    return total;
  }

  update(dt: number): void {
    if (this.dead) return;

    // Movement
    let dx = 0, dy = 0;
    if (this.moveDir & MoveDir.LEFT)  dx -= 1;
    if (this.moveDir & MoveDir.RIGHT) dx += 1;
    if (this.moveDir & MoveDir.UP)    dy -= 1;
    if (this.moveDir & MoveDir.DOWN)  dy += 1;

    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 0) {
      dx /= len;
      dy /= len;
    }

    this.vx = dx * PLAYER_SPEED;
    this.vy = dy * PLAYER_SPEED;

    this.x = Math.max(PLAYER_RADIUS, Math.min(MAP_SIZE - PLAYER_RADIUS, this.x + this.vx * dt));
    this.y = Math.max(PLAYER_RADIUS, Math.min(MAP_SIZE - PLAYER_RADIUS, this.y + this.vy * dt));

    if (this.attackTimer > 0) this.attackTimer -= dt * 1000;
    if (this.attackAnimTimer > 0) {
      this.attackAnimTimer -= dt * 1000;
      if (this.attackAnimTimer <= 0) this.isAttacking = false;
    }
  }

  serialize(): unknown[] {
    return [
      this.id,
      EntityType.PLAYER,
      Math.round(this.x),
      Math.round(this.y),
      Math.round(this.angle * 100) / 100,
      this.hp,
      this.getSelectedItem(),
      this.hatId,
      this.nickname,
      this.level,
      this.isAttacking ? 1 : 0,
      Math.round(this.attackAngle * 100) / 100,
    ];
  }

  serializeStats(): unknown[] {
    return [
      this.hp,
      this.hunger,
      this.thirst,
      this.temp,
      this.xp,
      this.level,
      this.points,
      this.inventory.map(s => [s.itemId, s.count]),
      this.selectedSlot,
      this.hatId,
    ];
  }
}
