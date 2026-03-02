import { Socket } from 'socket.io';
import { Player } from '../entities/Player';
import { World } from '../core/World';
import { PacketType } from '../../../shared/packets';
import { processAttack } from '../systems/CombatSystem';
import { processCraft }  from '../systems/CraftSystem';
import { processPlace }  from '../systems/BuildSystem';
import { useFood }       from '../systems/SurvivalSystem';
import { ItemId, ITEMS } from '../../../shared/items';

export function handlePacket(
  player: Player,
  data: unknown[],
  world: World,
  io: any,
  onDamage: (targetId: number, damage: number, type: string) => void,
): void {
  if (!Array.isArray(data) || data.length === 0) return;
  const type = data[0] as number;

  switch (type) {
    case PacketType.MOVE: {
      player.moveDir = (((data[1] as number) | 0) & 0b1111) as typeof player.moveDir;
      break;
    }

    case PacketType.ATTACK: {
      const angle = data[1] as number;
      const { damages, kills } = processAttack(player, angle, world);
      for (const d of damages) onDamage(d.targetId, d.damage, d.targetType);
      for (const k of kills) io.emit('msg', [PacketType.KILL_FEED, k.killerId, k.killerNickname, k.victimId, k.victimNickname]);
      break;
    }

    case PacketType.SELECT_ITEM: {
      const slot = (data[1] as number) | 0;
      if (slot < 0 || slot >= 10) break;

      const invSlot = player.inventory[slot];
      const itemId = invSlot?.count > 0 ? invSlot.itemId : -1;
      const itemDef = itemId >= 0 ? ITEMS[itemId] : undefined;

      if (itemDef?.isHat) {
        if (player.hatId === itemId) {
          // unequip same hat back to inventory
          if (player.addItem(itemId as ItemId, 1)) {
            player.hatId = -1;
          }
        } else {
          // equip hat from selected slot
          if (player.removeItem(itemId as ItemId, 1)) {
            if (player.hatId !== -1) player.addItem(player.hatId as ItemId, 1);
            player.hatId = itemId;
          }
        }
      } else {
        player.selectedSlot = slot;
      }

      const sock = (player as any).socket as Socket | undefined;
      sock?.emit('msg', [PacketType.PLAYER_STATS, player.serializeStats()]);
      break;
    }

    case PacketType.USE_ITEM: {
      const item = player.getSelectedItem() as import('../../../shared/items').ItemId;
      let used = false;

      if (item === ItemId.POISON_COATING && player.countItem(ItemId.POISON_COATING) > 0) {
        player.removeItem(ItemId.POISON_COATING, 1);
        player.poisonCoated = true;
        player.poisonCoatTimer = 60000;
        used = true;
      } else {
        used = useFood(player, item);
      }

      if (used) {
        const sock = (player as any).socket as Socket | undefined;
        sock?.emit('msg', [PacketType.PLAYER_STATS, player.serializeStats()]);
      }
      break;
    }

    case PacketType.CRAFT: {
      const itemId = (data[1] as number) | 0;
      const result = processCraft(player, itemId);
      const sock   = (player as any).socket as Socket | undefined;
      sock?.emit('msg', [PacketType.CRAFT_RESULT, result.success ? 1 : 0, result.itemId ?? -1, result.count ?? 0]);
      break;
    }

    case PacketType.PLACE: {
      const itemId = (data[1] as number) | 0;
      const angle  = data[2] as number;
      processPlace(player, itemId, angle, world);
      // New structure included in next ENTITY_UPDATE
      break;
    }

    case PacketType.CHEST_OPEN: {
      const structureId = (data[1] as number) | 0;
      const s = world.structures.get(structureId);
      const sock = (player as any).socket as Socket | undefined;
      if (!s || s.itemId !== ItemId.CHEST) break;
      const dist = Math.hypot(s.x - player.x, s.y - player.y);
      if (dist > 160) break;
      sock?.emit('msg', [PacketType.CHEST_DATA, s.id, s.storage.map(x => [x.itemId, x.count])]);
      break;
    }

    case PacketType.CHEST_STORE: {
      const structureId = (data[1] as number) | 0;
      const slotIndex   = (data[2] as number) | 0;
      const itemId      = (data[3] as number) | 0;
      const count       = Math.max(0, (data[4] as number) | 0);
      const s           = world.structures.get(structureId);
      const sock        = (player as any).socket as Socket | undefined;
      if (!s || s.itemId !== ItemId.CHEST) break;
      if (slotIndex < 0 || slotIndex >= 5) break;
      if (count <= 0) break;
      if (player.removeItem(itemId as ItemId, count)) {
        const slot = s.storage[slotIndex];
        if (slot.itemId === -1 || slot.itemId === itemId) {
          slot.itemId = itemId;
          slot.count += count;
        } else {
          // slot occupied by different item — return to player
          player.addItem(itemId as ItemId, count);
        }
      }
      sock?.emit('msg', [PacketType.CHEST_DATA, s.id, s.storage.map(x => [x.itemId, x.count])]);
      sock?.emit('msg', [PacketType.PLAYER_STATS, player.serializeStats()]);
      break;
    }

    case PacketType.CHAT: {
      const message = String(data[1] ?? '').substring(0, 100).trim();
      if (message.length > 0) {
        io.emit('msg', [PacketType.CHAT_BROADCAST, player.id, player.nickname, message]);
      }
      break;
    }

    case PacketType.PING: {
      const sock = (player as any).socket as Socket | undefined;
      sock?.emit('msg', [PacketType.PONG, Date.now()]);
      break;
    }
  }
}
