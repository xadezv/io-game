import { Entity } from './Entity';
import { EntityType } from '../../../shared/packets';
import { ItemId } from '../../../shared/items';
import { MAP_SIZE } from '../../../shared/constants';
import { Player } from './Player';

export interface AnimalConfig {
  type: EntityType;
  hp: number;
  radius: number;
  speed: number;
  aggroRange: number; // 0 = passive
  attackRange: number;
  attackDamage: number;
  attackCooldown: number;
  fleeRange: number; // flees if player within this range (passive animals)
  drops: { itemId: ItemId; minCount: number; maxCount: number }[];
  xpReward: number;
}

export const ANIMAL_CONFIGS: Record<number, AnimalConfig> = {
  [EntityType.RABBIT]: {
    type: EntityType.RABBIT,
    hp: 30,
    radius: 16,
    speed: 190,
    aggroRange: 0,
    attackRange: 0,
    attackDamage: 0,
    attackCooldown: 9999,
    fleeRange: 180,
    drops: [{ itemId: ItemId.RAW_MEAT, minCount: 1, maxCount: 2 }, { itemId: ItemId.THREAD, minCount: 1, maxCount: 2 }],
    xpReward: 8,
  },
  [EntityType.WOLF]: {
    type: EntityType.WOLF,
    hp: 100,
    radius: 22,
    speed: 160,
    aggroRange: 400,
    attackRange: 50,
    attackDamage: 15,
    attackCooldown: 1500,
    fleeRange: 0,
    drops: [{ itemId: ItemId.RAW_MEAT, minCount: 2, maxCount: 4 }, { itemId: ItemId.THREAD, minCount: 2, maxCount: 4 }],
    xpReward: 25,
  },
};

export class Animal extends Entity {
  config: AnimalConfig;
  vx: number = 0;
  vy: number = 0;
  targetId: number = -1; // player id
  attackTimer: number = 0;
  wanderTimer: number = 0;
  wanderAngle: number = 0;
  isAttacking: boolean = false;
  attackAnimTimer: number = 0;

  constructor(type: EntityType, x: number, y: number) {
    const cfg = ANIMAL_CONFIGS[type];
    super(type, x, y, cfg.hp, cfg.radius);
    this.config = cfg;
    this.wanderAngle = Math.random() * Math.PI * 2;
  }

  update(dt: number, players: Map<string, Player>): void {
    if (this.dead) return;

    const cfg = this.config;
    this.attackTimer = Math.max(0, this.attackTimer - dt * 1000);
    if (this.attackAnimTimer > 0) {
      this.attackAnimTimer -= dt * 1000;
      if (this.attackAnimTimer <= 0) this.isAttacking = false;
    }

    // Find nearest player
    let nearestPlayer: Player | null = null;
    let nearestDist = Infinity;

    for (const p of players.values()) {
      if (p.dead) continue;
      const d = this.distTo(p);
      if (d < nearestDist) {
        nearestDist = d;
        nearestPlayer = p;
      }
    }

    if (cfg.aggroRange > 0 && nearestPlayer && nearestDist < cfg.aggroRange) {
      // Aggressive — chase
      const dx = nearestPlayer.x - this.x;
      const dy = nearestPlayer.y - this.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      this.vx = (dx / len) * cfg.speed;
      this.vy = (dy / len) * cfg.speed;
      this.angle = Math.atan2(dy, dx);
      this.targetId = nearestPlayer.id;
    } else if (cfg.fleeRange > 0 && nearestPlayer && nearestDist < cfg.fleeRange) {
      // Passive — flee
      const dx = this.x - nearestPlayer.x;
      const dy = this.y - nearestPlayer.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      this.vx = (dx / len) * cfg.speed;
      this.vy = (dy / len) * cfg.speed;
      this.angle = Math.atan2(dy, dx);
      this.targetId = -1;
    } else {
      // Wander
      this.targetId = -1;
      this.wanderTimer -= dt * 1000;
      if (this.wanderTimer <= 0) {
        this.wanderTimer = 2000 + Math.random() * 3000;
        this.wanderAngle = Math.random() * Math.PI * 2;
        const wandering = Math.random() > 0.4;
        this.vx = wandering ? Math.cos(this.wanderAngle) * cfg.speed * 0.5 : 0;
        this.vy = wandering ? Math.sin(this.wanderAngle) * cfg.speed * 0.5 : 0;
      }
      if (this.vx !== 0 || this.vy !== 0) {
        this.angle = Math.atan2(this.vy, this.vx);
      }
    }

    this.x = Math.max(cfg.radius, Math.min(MAP_SIZE - cfg.radius, this.x + this.vx * dt));
    this.y = Math.max(cfg.radius, Math.min(MAP_SIZE - cfg.radius, this.y + this.vy * dt));
  }

  canAttack(target: Player): boolean {
    return this.config.aggroRange > 0 &&
      this.attackTimer <= 0 &&
      this.distTo(target) <= this.config.attackRange + target.radius;
  }

  doAttack(target: Player): void {
    this.attackTimer = this.config.attackCooldown;
    this.isAttacking = true;
    this.attackAnimTimer = 300;
  }

  serialize(): unknown[] {
    return [
      this.id,
      this.type,
      Math.round(this.x),
      Math.round(this.y),
      Math.round(this.angle * 100) / 100,
      this.hp,
      0, // no item
      -1, // no hat
      '', // no nickname
      1,  // level
      this.isAttacking ? 1 : 0,
      Math.round(this.angle * 100) / 100,
    ];
  }
}
