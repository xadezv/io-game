import { Entity } from './Entity';
import { EntityType, MoveDir } from '../../../shared/packets';
import {
  PLAYER_MAX_HP, PLAYER_MAX_HUNGER, PLAYER_MAX_TEMP, PLAYER_MAX_THIRST,
  PLAYER_RADIUS, PLAYER_SPEED, MAP_SIZE,
  HUNGER_SLOW_THRESHOLD_1, HUNGER_SLOW_THRESHOLD_2, HUNGER_SPEED_MULT_1, HUNGER_SPEED_MULT_2,
} from '../../../shared/constants';
import { ItemId, ITEMS } from '../../../shared/items';
import type { Socket } from 'socket.io';

export interface InventorySlot { itemId: number; count: number; }

export class Player extends Entity {
  nickname: string;
  socketId: string;
  socket?: Socket;
  hunger = PLAYER_MAX_HUNGER;
  thirst = PLAYER_MAX_THIRST;
  temp = PLAYER_MAX_TEMP;
  moveDir = MoveDir.NONE;
  vx = 0; vy = 0;
  selectedSlot = 0;
  attackAngle = 0;
  attackTimer = 0;
  isAttacking = false;
  attackAnimTimer = 0;
  inventory: InventorySlot[] = Array(10).fill(null).map(() => ({ itemId: -1, count: 0 }));
  hatId: number = -1;
  points = 0; level = 1; xp = 0;
  kills = 0; killStreak = 0;
  nearFire = false;
  poisonTimer = 0;
  poisonCoated = false;
  poisonCoatTimer = 0;
  webTimer = 0;
  violationCount = 0;
  durability: Map<number, number> = new Map();

  constructor(socketId: string, nickname: string, x: number, y: number) {
    super(EntityType.PLAYER, x, y, PLAYER_MAX_HP, PLAYER_RADIUS);
    this.socketId = socketId;
    this.nickname = nickname.substring(0, 16).trim() || 'Anon';
  }

  getSelectedItem(): number { const s = this.inventory[this.selectedSlot]; return s && s.count > 0 ? s.itemId : ItemId.HAND; }

  getEffectiveSpeed(): number {
    const h = this.hunger / PLAYER_MAX_HUNGER;
    let mult = 1;
    if (h < HUNGER_SLOW_THRESHOLD_2) mult = HUNGER_SPEED_MULT_2;
    else if (h < HUNGER_SLOW_THRESHOLD_1) mult = HUNGER_SPEED_MULT_1;
    if (this.webTimer > 0) mult *= 0.4;
    return PLAYER_SPEED * mult;
  }

  useTool(slotIndex: number): void {
    const slot = this.inventory[slotIndex];
    if (!slot || slot.count <= 0) return;
    const item = ITEMS[slot.itemId];
    if (!item?.maxDurability) return;
    const cur = this.durability.get(slotIndex) ?? item.maxDurability;
    const next = cur - 1;
    if (next <= 0) {
      slot.itemId = ItemId.HAND; slot.count = 1; this.durability.delete(slotIndex);
    } else {
      this.durability.set(slotIndex, next);
    }
  }

  addItem(itemId: number, count = 1): boolean {
    for (const [i,s] of this.inventory.entries()) {
      if (s.itemId === itemId && s.count > 0) { s.count += count; return true; }
    }
    for (const [i,s] of this.inventory.entries()) {
      if (s.count === 0) { s.itemId = itemId; s.count = count; const maxD = ITEMS[itemId]?.maxDurability; if (maxD) this.durability.set(i, maxD); return true; }
    }
    return false;
  }

  removeItem(itemId: number, count = 1): boolean {
    for (const [i,s] of this.inventory.entries()) {
      if (s.itemId === itemId && s.count >= count) { s.count -= count; if (s.count === 0) { s.itemId = -1; this.durability.delete(i); } return true; }
    }
    return false;
  }

  countItem(itemId: number): number { let n=0; for (const s of this.inventory) if (s.itemId === itemId) n += s.count; return n; }

  update(dt: number): void {
    if (this.dead) return;
    let dx=0,dy=0; if (this.moveDir & MoveDir.LEFT) dx -= 1; if (this.moveDir & MoveDir.RIGHT) dx += 1; if (this.moveDir & MoveDir.UP) dy -= 1; if (this.moveDir & MoveDir.DOWN) dy += 1;
    const len = Math.sqrt(dx*dx+dy*dy); if (len>0){dx/=len;dy/=len;}
    const speed = this.getEffectiveSpeed();
    this.vx = dx * speed; this.vy = dy * speed;
    this.x = Math.max(PLAYER_RADIUS, Math.min(MAP_SIZE - PLAYER_RADIUS, this.x + this.vx * dt));
    this.y = Math.max(PLAYER_RADIUS, Math.min(MAP_SIZE - PLAYER_RADIUS, this.y + this.vy * dt));
    if (this.attackTimer>0) this.attackTimer-=dt*1000;
    if (this.attackAnimTimer>0){this.attackAnimTimer-=dt*1000; if(this.attackAnimTimer<=0) this.isAttacking=false;}
  }

  serialize(): unknown[] { return [this.id,EntityType.PLAYER,Math.round(this.x),Math.round(this.y),Math.round(this.angle*100)/100,Math.round(this.hp),this.getSelectedItem(),this.hatId,this.nickname,this.level,this.isAttacking?1:0,Math.round(this.attackAngle*100)/100]; }

  serializeStats(): unknown[] {
    const durabilityFlat: number[] = [];
    for (const [slot, rem] of this.durability.entries()) durabilityFlat.push(slot, rem);
    return [Math.round(this.hp),Math.round(this.hunger),Math.round(this.thirst),Math.round(this.temp),this.xp,this.level,this.points,this.inventory.map(s=>[s.itemId,s.count]),this.selectedSlot,this.hatId,this.killStreak,durabilityFlat];
  }
}
