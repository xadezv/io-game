import { EntityType } from '../../../shared/packets';

let _nextId = 1;
export function genId(): number { return _nextId++; }

export abstract class Entity {
  id: number;
  type: EntityType;
  x: number;
  y: number;
  angle: number = 0;
  hp: number;
  maxHp: number;
  radius: number;
  dead: boolean = false;

  constructor(type: EntityType, x: number, y: number, hp: number, radius: number) {
    this.id = genId();
    this.type = type;
    this.x = x;
    this.y = y;
    this.hp = hp;
    this.maxHp = hp;
    this.radius = radius;
  }

  distTo(other: Entity): number {
    return Math.sqrt((this.x - other.x) ** 2 + (this.y - other.y) ** 2);
  }

  distToPoint(px: number, py: number): number {
    return Math.sqrt((this.x - px) ** 2 + (this.y - py) ** 2);
  }

  // Serialize to array for network
  abstract serialize(): unknown[];
}
