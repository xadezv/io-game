import { Socket } from 'socket.io';
import { Player } from '../entities/Player';
import { World } from '../core/World';
import { PacketType } from '../../../shared/packets';
import { processAttack } from '../systems/CombatSystem';
import { processCraft }  from '../systems/CraftSystem';
import { processPlace }  from '../systems/BuildSystem';
import { useFood }       from '../systems/SurvivalSystem';
import { ItemId }        from '../../../shared/items';

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
      const { damages } = processAttack(player, angle, world);
      for (const d of damages) onDamage(d.targetId, d.damage, d.targetType);
      break;
    }

    case PacketType.SELECT_ITEM: {
      const slot = (data[1] as number) | 0;
      if (slot >= 0 && slot < 10) player.selectedSlot = slot;
      break;
    }

    case PacketType.USE_ITEM: {
      const item = player.getSelectedItem() as import('../../../shared/items').ItemId;
      const used = useFood(player, item);
      if (used) {
        // Stats update will be sent in next tick
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
