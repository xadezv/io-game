import { Player } from '../entities/Player';
import { Resource } from '../entities/Resource';
import { Animal } from '../entities/Animal';
import { World } from '../core/World';
import { ItemId, ITEMS } from '../../../shared/items';
import { ATTACK_COOLDOWN } from '../../../shared/constants';
import { RNG } from '../map/MapGen';

const rng = new RNG(Date.now());

export interface DamageEvent {
  targetId:   number;
  damage:     number;
  targetType: string;
}

export interface KillFeedEvent {
  killerId: number;
  killerNickname: string;
  victimId: number;
  victimNickname: string;
}

export function processAttack(
  attacker: Player,
  angle: number,
  world: World,
): { damages: DamageEvent[]; kills: KillFeedEvent[] } {
  const damages: DamageEvent[] = [];
  const kills: KillFeedEvent[] = [];

  const itemId = attacker.getSelectedItem();
  const item   = ITEMS[itemId] ?? ITEMS[ItemId.HAND];
  if (!item?.isWeapon) return { damages, kills };
  if (attacker.attackTimer > 0) return { damages, kills };

  attacker.attackTimer     = item.attackCooldown ?? ATTACK_COOLDOWN;
  attacker.isAttacking     = true;
  attacker.attackAnimTimer = 300;
  attacker.attackAngle     = angle;

  const range  = item.range  ?? 70;
  const damage = item.damage ?? 10;
  const hitX   = attacker.x + Math.cos(angle) * range * 0.6;
  const hitY   = attacker.y + Math.sin(angle) * range * 0.6;
  const hitR   = range * 0.55;

  // Resources (use spatial grid)
  const resources = world.getNearbyResources(hitX, hitY, hitR + 30);
  for (const r of resources) {
    if (r.dead) continue;
    const d = Math.sqrt((r.x - hitX) ** 2 + (r.y - hitY) ** 2);
    if (d > hitR + r.radius) continue;

    let dmg = damage;
    if (r.config.preferredTool?.includes(itemId as import('../../../shared/items').ItemId)) dmg *= 2;

    r.hp -= dmg;
    damages.push({ targetId: r.id, damage: dmg, targetType: 'resource' });

    if (r.hp <= 0) {
      r.dead = true;
      r.respawnTimer = 0;
      for (const drop of r.config.drops) {
        attacker.addItem(drop.itemId, rng.nextInt(drop.minCount, drop.maxCount));
      }
      gainXP(attacker, r.config.xpReward);
    }
    break; // one resource per swing
  }

  // Animals
  const animals = world.getNearbyAnimals(hitX, hitY, hitR + 40);
  for (const a of animals) {
    if (a.dead) continue;
    const d = Math.sqrt((a.x - hitX) ** 2 + (a.y - hitY) ** 2);
    if (d > hitR + a.radius) continue;

    a.hp -= damage;
    damages.push({ targetId: a.id, damage, targetType: 'animal' });

    if (a.hp <= 0) {
      a.dead = true;
      a.despawnTimer = 3000;
      for (const drop of a.config.drops) {
        attacker.addItem(drop.itemId, rng.nextInt(drop.minCount, drop.maxCount));
      }
      gainXP(attacker, a.config.xpReward);
    }
    break;
  }

  // Players (PvP)
  const players = world.getNearbyPlayers(hitX, hitY, hitR + 30);
  for (const p of players) {
    if (p === attacker || p.dead) continue;
    const d = Math.sqrt((p.x - hitX) ** 2 + (p.y - hitY) ** 2);
    if (d > hitR + p.radius) continue;

    p.hp -= damage;
    if (attacker.poisonCoated) p.poisonTimer = 3000;
    damages.push({ targetId: p.id, damage, targetType: 'player' });

    if (p.hp <= 0) {
      p.hp = 0;
      gainXP(attacker, 50);
      kills.push({ killerId: attacker.id, killerNickname: attacker.nickname, victimId: p.id, victimNickname: p.nickname });
    }
    break;
  }

  // Structures
  const structures = world.getNearbyStructures(hitX, hitY, hitR + 40);
  for (const s of structures) {
    if (s.dead) continue;
    const d = Math.sqrt((s.x - hitX) ** 2 + (s.y - hitY) ** 2);
    if (d > hitR + s.radius) continue;

    s.hp -= damage;
    damages.push({ targetId: s.id, damage, targetType: 'structure' });
    if (s.hp <= 0) s.dead = true;
    break;
  }

  return { damages, kills };
}

export function processAnimalAttacks(world: World): { playerId: string; damage: number }[] {
  const results: { playerId: string; damage: number }[] = [];

  for (const a of world.animals.values()) {
    if (a.dead || a.config.aggroRange === 0) continue;
    // Use spatial grid to find nearby players
    const nearby = world.getNearbyPlayers(a.x, a.y, a.config.attackRange + 40);
    for (const p of nearby) {
      if (p.dead) continue;
      if (a.canAttack(p)) {
        a.doAttack(p);
        p.hp = Math.max(0, p.hp - a.config.attackDamage);
        results.push({ playerId: p.socketId, damage: a.config.attackDamage });
      }
    }
  }

  return results;
}

function gainXP(player: Player, xp: number): void {
  player.xp     += xp;
  player.points += xp;
  const needed   = player.level * 100;
  if (player.xp >= needed) {
    player.xp    -= needed;
    player.level++;
  }
}
