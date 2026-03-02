import { Socket } from 'socket.io';
import { Player } from '../entities/Player';
import { World } from '../core/World';
import { PacketType, MoveDir } from '../../../shared/packets';
import { ItemId, ITEMS } from '../../../shared/items';
import { processAttack } from '../systems/CombatSystem';
import { processCraft } from '../systems/CraftSystem';
import { processPlace } from '../systems/BuildSystem';
import { useFood } from '../systems/SurvivalSystem';

export function handlePacket(
  player: Player,
  data: unknown[],
  world: World,
  io: any,
  onDamage: (targetId: number, damage: number, targetType: string) => void,
): void {
  if (!Array.isArray(data) || data.length === 0) return;

  const type = data[0] as PacketType;

  switch (type) {
    case PacketType.MOVE: {
      const dir = (data[1] as number) & 0b1111;
      player.moveDir = dir;
      break;
    }

    case PacketType.ATTACK: {
      const angle = data[1] as number;
      const { damages, drops } = processAttack(player, angle, world, io);
      for (const d of damages) {
        onDamage(d.targetId, d.damage, d.targetType);
      }
      break;
    }

    case PacketType.SELECT_ITEM: {
      const slot = data[1] as number;
      if (slot >= 0 && slot < 10) player.selectedSlot = slot;
      break;
    }

    case PacketType.CRAFT: {
      const itemId = data[1] as number;
      const result = processCraft(player, itemId);
      player.socket?.emit('msg', [PacketType.CRAFT_RESULT, result.success, result.itemId ?? -1, result.count ?? 0]);
      break;
    }

    case PacketType.PLACE: {
      const itemId = data[1] as number;
      const angle = data[2] as number;
      const structure = processPlace(player, itemId, angle, world);
      if (structure) {
        // Broadcast new structure to nearby players
        const msg = [PacketType.ENTITY_UPDATE, [structure.serialize()]];
        // will be picked up in next update broadcast
      }
      break;
    }

    case PacketType.CHAT: {
      const message = ((data[1] as string) ?? '').substring(0, 100).trim();
      if (message.length === 0) return;
      io.emit('msg', [PacketType.CHAT_BROADCAST, player.id, player.nickname, message]);
      break;
    }

    case PacketType.PING: {
      player.socket?.emit('msg', [PacketType.PONG, Date.now()]);
      break;
    }

    // Use food / hat equip via select+use
    default:
      break;
  }
}

// Extend Player to hold socket ref
declare module '../entities/Player' {
  interface Player {
    socket?: Socket;
  }
}
