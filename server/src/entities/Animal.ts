import { Entity } from './Entity';
import { EntityType } from '../../../shared/packets';
import { ItemId } from '../../../shared/items';
import { MAP_SIZE } from '../../../shared/constants';
import { Player } from './Player';

export interface AnimalConfig {
  type:          EntityType;
  hp:            number;
  radius:        number;
  speed:         number;
  aggroRange:    number;
  attackRange:   number;
  attackDamage:  number;
  attackCooldown:number;
  fleeRange:     number;
  drops: { itemId: ItemId; minCount: number; maxCount: number }[];
  xpReward:      number;
}

export const ANIMAL_CONFIGS: Record<number, AnimalConfig> = {
  [EntityType.RABBIT]: {
    type: EntityType.RABBIT,
    hp: 30, radius: 16, speed: 200,
    aggroRange: 0, attackRange: 0, attackDamage: 0, attackCooldown: 9999,
    fleeRange: 220,
    drops: [
      { itemId: ItemId.RAW_MEAT, minCount: 1, maxCount: 2 },
      { itemId: ItemId.THREAD,   minCount: 1, maxCount: 2 },
    ],
    xpReward: 8,
  },
  [EntityType.WOLF]: {
    type: EntityType.WOLF,
    hp: 120, radius: 22, speed: 165,
    aggroRange: 380, attackRange: 55, attackDamage: 15, attackCooldown: 1400,
    fleeRange: 0,
    drops: [
      { itemId: ItemId.RAW_MEAT, minCount: 2, maxCount: 4 },
      { itemId: ItemId.THREAD,   minCount: 2, maxCount: 4 },
    ],
    xpReward: 25,
  },
  [EntityType.MAMMOTH]: {
    type: EntityType.MAMMOTH,
    hp: 500, radius: 40, speed: 110,
    aggroRange: 300, attackRange: 70, attackDamage: 35, attackCooldown: 2000,
    fleeRange: 0,
    drops: [
      { itemId: ItemId.RAW_MEAT, minCount: 5, maxCount: 10 },
      { itemId: ItemId.THREAD,   minCount: 3, maxCount: 6 },
    ],
    xpReward: 100,
  },
};

export class Animal extends Entity {
  config:          AnimalConfig;
  vx = 0;
  vy = 0;
  targetId = -1;
  attackTimer  = 0;
  wanderTimer  = 0;
  wanderAngle  = 0;
  isAttacking  = false;
  attackAnimTimer = 0;
  despawnTimer = 0;

  constructor(type: EntityType, x: number, y: number) {
    const cfg = ANIMAL_CONFIGS[type];
    super(type, x, y, cfg.hp, cfg.radius);
    this.config      = cfg;
    this.wanderAngle = Math.random() * Math.PI * 2;
    // Small initial random scatter so animals don't stack
    this.wanderTimer = Math.random() * 3000;
  }

  update(dt: number, players: Map<string, Player>): void {
    if (this.dead) return;

    const cfg = this.config;
    this.attackTimer     = Math.max(0, this.attackTimer - dt * 1000);
    this.attackAnimTimer = Math.max(0, this.attackAnimTimer - dt * 1000);
    if (this.attackAnimTimer <= 0) this.isAttacking = false;

    // Find nearest living player
    let nearest: Player | null = null;
    let nearestDist = Infinity;
    for (const p of players.values()) {
      if (p.dead) continue;
      const d = this.distTo(p);
      if (d < nearestDist) { nearestDist = d; nearest = p; }
    }

    if (cfg.aggroRange > 0 && nearest && nearestDist < cfg.aggroRange) {
      // Chase
      const dx = nearest.x - this.x, dy = nearest.y - this.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      this.vx = (dx / len) * cfg.speed;
      this.vy = (dy / len) * cfg.speed;
      this.angle = Math.atan2(dy, dx);
      this.targetId = nearest.id;
    } else if (cfg.fleeRange > 0 && nearest && nearestDist < cfg.fleeRange) {
      // Flee
      const dx = this.x - nearest.x, dy = this.y - nearest.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      this.vx = (dx / len) * cfg.speed;
      this.vy = (dy / len) * cfg.speed;
      this.angle = Math.atan2(dy, dx);
      this.targetId = -1;
    } else {
      // Wander
      this.targetId = -1;
      this.wanderTimer -= dt * 1000;
      if (this.wanderTimer <= 0) {
        this.wanderTimer = 2500 + Math.random() * 3500;
        this.wanderAngle = Math.random() * Math.PI * 2;
        const doMove = Math.random() > 0.35;
        this.vx = doMove ? Math.cos(this.wanderAngle) * cfg.speed * 0.45 : 0;
        this.vy = doMove ? Math.sin(this.wanderAngle) * cfg.speed * 0.45 : 0;
      }
      if (this.vx !== 0 || this.vy !== 0) this.angle = Math.atan2(this.vy, this.vx);
    }

    this.x = Math.max(cfg.radius, Math.min(MAP_SIZE - cfg.radius, this.x + this.vx * dt));
    this.y = Math.max(cfg.radius, Math.min(MAP_SIZE - cfg.radius, this.y + this.vy * dt));
  }

  canAttack(target: Player): boolean {
    return this.config.aggroRange > 0
      && this.attackTimer <= 0
      && this.distTo(target) <= this.config.attackRange + target.radius;
  }

  doAttack(_target: Player): void {
    this.attackTimer     = this.config.attackCooldown;
    this.isAttacking     = true;
    this.attackAnimTimer = 300;
  }

  serialize(): unknown[] {
    return [
      this.id, this.type,
      Math.round(this.x), Math.round(this.y),
      Math.round(this.angle * 100) / 100,
      this.hp,
      0, -1, '', 1,
      this.isAttacking ? 1 : 0,
      Math.round(this.angle * 100) / 100,
    ];
  }
}
