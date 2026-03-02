// Packet IDs — array format [id, ...data]
export const enum PacketType {
  // Client → Server
  CHAT         = 0,
  HANDSHAKE    = 1,
  MOVE         = 2,
  ATTACK       = 5,
  SELECT_ITEM  = 7,
  PLACE        = 10,
  CRAFT        = 11,
  PING         = 20,

  // Server → Client
  HANDSHAKE_RESPONSE = 3,
  ENTITY_UPDATE      = 4,
  PLAYER_STATS       = 6,
  ENTITY_REMOVE      = 8,
  RESOURCE_SPAWN     = 9,
  DAMAGE             = 12,
  CHAT_BROADCAST     = 13,
  LEADERBOARD        = 14,
  TIME_UPDATE        = 15,
  CRAFT_RESULT       = 16,
  DEATH              = 17,
  PONG               = 21,
}

export const enum MoveDir {
  NONE  = 0,
  LEFT  = 1,
  RIGHT = 2,
  DOWN  = 4,
  UP    = 8,
}

export const enum EntityType {
  PLAYER   = 0,
  TREE     = 1,
  STONE    = 2,
  GOLD     = 3,
  BERRY    = 4,
  RABBIT   = 5,
  WOLF     = 6,
  FIRE     = 7,
  WALL_WOOD = 8,
  WALL_STONE = 9,
  SPIKE    = 10,
  CACTUS   = 11,
  SNOW_TREE = 12,
}

export const enum BiomeType {
  PLAINS  = 0,
  FOREST  = 1,
  DESERT  = 2,
  SNOW    = 3,
  OCEAN   = 4,
}

export interface Vec2 {
  x: number;
  y: number;
}

// Handshake from client: [1, nickname, screenW, screenH]
// Handshake response from server:
// [3, myId, x, y, mapSeed, isNight, time, leaderboard[], entities[]]

// Entity update from server (delta):
// [4, [id, type, x, y, angle, hp, extra...], ...]

// Move from client: [2, dirBitmask]
// Attack from client: [5, angle]
// Craft from client: [11, itemId]
// Place from client: [10, itemId, angle]
// Select item: [7, slotIndex]
// Chat: [0, message]
