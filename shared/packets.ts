// Packet IDs — array format [id, ...data]
// Using plain const (not const enum) so esbuild can cross-bundle

export const PacketType = {
  // Client → Server
  CHAT:               0,
  HANDSHAKE:          1,
  MOVE:               2,
  ATTACK:             5,
  SELECT_ITEM:        7,
  USE_ITEM:           23,
  PLACE:              10,
  CRAFT:              11,
  PING:               20,
  RESPAWN:            22,
  CHEST_OPEN:         24,
  CHEST_STORE:        26,
  INTERACT:           28,

  // Server → Client
  HANDSHAKE_RESPONSE: 3,
  ENTITY_UPDATE:      4,
  PLAYER_STATS:       6,
  ENTITY_REMOVE:      8,
  DAMAGE:             12,
  CHAT_BROADCAST:     13,
  LEADERBOARD:        14,
  TIME_UPDATE:        15,
  CRAFT_RESULT:       16,
  DEATH:              17,
  PONG:               21,
  KILL_FEED:          27,
  CHEST_DATA:         25,
  INTERACT_RESULT:    29,
} as const;

export type PacketType = typeof PacketType[keyof typeof PacketType];

export const MoveDir = {
  NONE:  0,
  LEFT:  1,
  RIGHT: 2,
  DOWN:  4,
  UP:    8,
} as const;

export type MoveDir = typeof MoveDir[keyof typeof MoveDir];

export const EntityType = {
  PLAYER:     0,
  TREE:       1,
  STONE:      2,
  GOLD:       3,
  BERRY:      4,
  RABBIT:     5,
  WOLF:       6,
  FIRE:       7,
  WALL_WOOD:  8,
  WALL_STONE: 9,
  SPIKE:      10,
  CACTUS:     11,
  SNOW_TREE:  12,
  MAMMOTH:    13,
  CHEST:      14,
} as const;

export type EntityType = typeof EntityType[keyof typeof EntityType];

export const BiomeType = {
  PLAINS:  0,
  FOREST:  1,
  DESERT:  2,
  SNOW:    3,
  OCEAN:   4,
} as const;

export type BiomeType = typeof BiomeType[keyof typeof BiomeType];

export interface Vec2 {
  x: number;
  y: number;
}
