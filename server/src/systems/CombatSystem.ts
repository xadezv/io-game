import { Player } from '../entities/Player';
import { Resource, RESOURCE_CONFIGS } from '../entities/Resource';
import { Animal } from '../entities/Animal';
import { Structure } from '../entities/Structure';
import { World } from '../core/World';
import { EntityType } from '../../../shared/packets';
import { ItemId, ITEMS } from '../../../shared/items';
import { ATTACK_COOLDOWN } from '../../../shared/constants';
import { RNG } from '../map/MapGen';

const rng = new RNG(Date.now());

export interface DamageEvent {
  targetId: number;
  damage: number;
  targetType: 'player' | 'animal' | 'resource' | 'structure';
}

export interface DropEvent {
  itemId: ItemId;
  count: number;
}

export function processAttack(
  attacker: Player,
  angle: number,
  world: World,
  io: any,
): { damages: DamageEvent[]; drops: DropEvent[] } {
  const results: DamageEvent[] = [];
  const drops: DropEvent[] = [];

  const itemId = attacker.getSelectedItem();
  const item = ITEMS[itemId] ?? ITEMS[ItemId.HAND];

  if (!item || !item.isWeapon) return { damages: results, drops };
  if (attacker.attackTimer > 0) return { damages: results, drops };

  attacker.attackTimer = item.attackCooldown ?? ATTACK_COOLDOWN;
  attacker.isAttacking = true;
  attacker.attackAnimTimer = 300;
  attacker.attackAngle = angle;

  const range = item.range ?? 70;
  const damage = item.damage ?? 10;

  const ax = attacker.x + Math.cos(angle) * range * 0.5;
  const ay = attacker.y + Math.sin(angle) * range * 0.5;

  // Check resources
  for (const r of world.resources.values()) {
    if (r.dead) continue;
    const dist = Math.sqrt((r.x - ax) ** 2 + (r.y - ay) ** 2);
    if (dist <= range * 0.7 + r.radius) {
      // Tool bonus
      let dmg = damage;
      const cfg = RESOURCE_CONFIGS[r.type];
      if (cfg.preferredTool && cfg.preferredTool.includes(itemId)) dmg *= 2;

      r.hp -= dmg;
      results.push({ targetId: r.id, damage: dmg, targetType: 'resource' });

      if (r.hp <= 0) {
        r.dead = true;
        r.respawnTimer = 0;
        // Give drops
        for (const drop of r.config.drops) {
          const count = rng.nextInt(drop.minCount, drop.maxCount);
          attacker.addItem(drop.itemId, count);
          drops.push({ itemId: drop.itemId, count });
        }
        attacker.xp += r.config.xpReward;
        attacker.points += r.config.xpReward;
        checkLevelUp(attacker);
      }
      break; // one resource per swing
    }
  }

  // Check animals
  for (const a of world.animals.values()) {
    if (a.dead) continue;
    const dist = Math.sqrt((a.x - ax) ** 2 + (a.y - ay) ** 2);
    if (dist <= range * 0.7 + a.radius) {
      a.hp -= damage;
      results.push({ targetId: a.id, damage: damage, targetType: 'animal' });

      if (a.hp <= 0) {
        a.dead = true;
        for (const drop of a.config.drops) {
          const count = rng.nextInt(drop.minCount, drop.maxCount);
          attacker.addItem(drop.itemId, count);
          drops.push({ itemId: drop.itemId, count });
        }
        attacker.xp += a.config.xpReward;
        attacker.points += a.config.xpReward;
        checkLevelUp(attacker);
      }
      break;
    }
  }

  // Check players (PvP)
  for (const p of world.players.values()) {
    if (p === attacker || p.dead) continue;
    const dist = Math.sqrt((p.x - ax) ** 2 + (p.y - ay) ** 2);
    if (dist <= range * 0.7 + p.radius) {
      p.hp -= damage;
      results.push({ targetId: p.id, damage: damage, targetType: 'player' });

      if (p.hp <= 0) {
        p.hp = 0;
        attacker.points += 50;
        checkLevelUp(attacker);
      }
      break;
    }
  }

  // Check structures
  for (const s of world.structures.values()) {
    if (s.dead) continue;
    const dist = Math.sqrt((s.x - ax) ** 2 + (s.y - ay) ** 2);
    if (dist <= range * 0.7 + s.radius) {
      s.hp -= damage;
      results.push({ targetId: s.id, damage: damage, targetType: 'structure' });
      if (s.hp <= 0) s.dead = true;
      break;
    }
  }

  return { damages: results, drops };
}

export function processAnimalAttacks(world: World): { playerId: string; damage: number }[] {
  const results: { playerId: string; damage: number }[] = [];

  for (const a of world.animals.values()) {
    if (a.dead || a.config.aggroRange === 0) continue;
    for (const p of world.players.values()) {
      if (p.dead) continue;
      if (a.canAttack(p)) {
        a.doAttack(p);
        p.hp -= a.config.attackDamage;
        results.push({ playerId: p.socketId, damage: a.config.attackDamage });
      }
    }
  }

  return results;
}

function checkLevelUp(player: Player): void {
  const xpNeeded = player.level * 100;
  if (player.xp >= xpNeeded) {
    player.xp -= xpNeeded;
    player.level++;
  }
}
