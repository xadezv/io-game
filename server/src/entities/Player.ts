import { Entity } from './Entity';
import { EntityType, MoveDir } from '../../../shared/packets';
import {
  PLAYER_MAX_HP, PLAYER_MAX_HUNGER, PLAYER_MAX_TEMP, PLAYER_MAX_THIRST,
  PLAYER_RADIUS, PLAYER_SPEED,
} from '../../../shared/constants';
import { ItemId } from '../../../shared/items';
import type { Socket } from 'socket.io';

export interface InventorySlot {
  itemId: number; // -1 = empty
  count:  number;
}

export class Player extends Entity {
  nickname:   string;
  socketId:   string;
  socket?:    Socket;

  // Survival stats
  hunger = PLAYER_MAX_HUNGER;
  thirst = PLAYER_MAX_THIRST;
  temp   = PLAYER_MAX_TEMP;

  // Movement
  moveDir = MoveDir.NONE;
  vx = 0;
  vy = 0;

  // Combat
  selectedSlot    = 0;
  attackAngle     = 0;
  attackTimer     = 0;
  isAttacking     = false;
  attackAnimTimer = 0;

  // Inventory (10 slots)
  inventory: InventorySlot[] = Array(10).fill(null).map(() => ({ itemId: -1, count: 0 }));

  // Equipment
  hatId: number = -1;

  // Progress
  points = 0;
  level  = 1;
  xp     = 0;

  // PvP stats
  kills      = 0;
  killStreak = 0;

  // Anti-cheat
  violationCount = 0;
  pendingKick = false;

  // State
  nearFire = false;

  constructor(socketId: string, nickname: string, x: number, y: number) {
    super(EntityType.PLAYER, x, y, PLAYER_MAX_HP, PLAYER_RADIUS);
    this.socketId = socketId;
    this.nickname = nickname.substring(0, 16).trim() || 'Anon';
  }

  getSelectedItem(): number {
    const slot = this.inventory[this.selectedSlot];
    return slot && slot.count > 0 ? slot.itemId : ItemId.HAND;
  }

  addItem(itemId: number, count = 1): boolean {
    for (const s of this.inventory) {
      if (s.itemId === itemId && s.count > 0) { s.count += count; return true; }
    }
    for (const s of this.inventory) {
      if (s.count === 0) { s.itemId = itemId; s.count = count; return true; }
    }
    return false;
  }

  removeItem(itemId: number, count = 1): boolean {
    for (const s of this.inventory) {
      if (s.itemId === itemId && s.count >= count) {
        s.count -= count;
        if (s.count === 0) s.itemId = -1;
        return true;
      }
    }
    return false;
  }

  countItem(itemId: number): number {
    let n = 0;
    for (const s of this.inventory) if (s.itemId === itemId) n += s.count;
    return n;
  }

  getEffectiveSpeed(): number {
    return PLAYER_SPEED;
  }

  getMoveVector(): { dx: number; dy: number } {
    let dx = 0, dy = 0;
    if (this.moveDir & MoveDir.LEFT)  dx -= 1;
    if (this.moveDir & MoveDir.RIGHT) dx += 1;
    if (this.moveDir & MoveDir.UP)    dy -= 1;
    if (this.moveDir & MoveDir.DOWN)  dy += 1;

    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 0) { dx /= len; dy /= len; }
    return { dx, dy };
  }

  update(dt: number): void {
    if (this.dead) return;

    if (this.attackTimer     > 0) this.attackTimer     -= dt * 1000;
    if (this.attackAnimTimer > 0) {
      this.attackAnimTimer -= dt * 1000;
      if (this.attackAnimTimer <= 0) this.isAttacking = false;
    }
  }

  serialize(): unknown[] {
    return [
      this.id, EntityType.PLAYER,
      Math.round(this.x), Math.round(this.y),
      Math.round(this.angle * 100) / 100,
      Math.round(this.hp),
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
      Math.round(this.hp),
      Math.round(this.hunger),
      Math.round(this.thirst),
      Math.round(this.temp),
      this.xp,
      this.level,
      this.points,
      this.inventory.map(s => [s.itemId, s.count]),
      this.selectedSlot,
      this.hatId,
      this.killStreak,
    ];
  }
}
