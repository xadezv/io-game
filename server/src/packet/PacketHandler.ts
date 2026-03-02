import { Socket } from 'socket.io';
import { Player } from '../entities/Player';
import { World } from '../core/World';
import { PacketType } from '../../../shared/packets';
import { processAttack } from '../systems/CombatSystem';
import { processCraft }  from '../systems/CraftSystem';
import { processPlace }  from '../systems/BuildSystem';
import { useFood }       from '../systems/SurvivalSystem';
import { ItemId, ITEMS } from '../../../shared/items';
import { EntityType } from '../../../shared/packets';

const PT_OPEN_CHEST = 24;

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
      const used = useFood(player, item);
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


    case PT_OPEN_CHEST: {
      const chestId = (data[1] as number | undefined) ?? -1;
      let chest = world.structures.get(chestId);
      if (!chest || chest.dead || chest.type !== EntityType.CHEST) {
        let nearest: typeof chest | undefined;
        let best = Infinity;
        for (const s of world.structures.values()) {
          if (s.dead || s.type !== EntityType.CHEST) continue;
          const d = Math.hypot(s.x - player.x, s.y - player.y);
          if (d < best) { best = d; nearest = s; }
        }
        chest = nearest;
      }
      if (!chest) break;
      const dist = Math.hypot(chest.x - player.x, chest.y - player.y);
      if (dist > 160) break;
      const sock = (player as any).socket as Socket | undefined;
      sock?.emit('msg', [PacketType.CHEST_DATA, chest.id, chest.chestSlots]);
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
