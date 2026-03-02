export const TICK_RATE = 30; // server ticks per second
export const TICK_MS = 1000 / TICK_RATE;

export const MAP_SIZE = 14400;
export const TILE_SIZE = 32;
export const CHUNK_SIZE = 16; // tiles per chunk
export const CHUNK_PX = CHUNK_SIZE * TILE_SIZE;

export const VIEW_DISTANCE = 1400; // px radius sent to client

export const PLAYER_SPEED = 200; // px/s
export const PLAYER_RADIUS = 24;
export const PLAYER_MAX_HP = 100;
export const PLAYER_MAX_HUNGER = 100;
export const PLAYER_MAX_THIRST = 100;
export const PLAYER_MAX_TEMP = 100;

export const HUNGER_DRAIN = 0.8;  // per second
export const THIRST_DRAIN = 1.0;
export const TEMP_COLD_DRAIN = 1.5;
export const TEMP_HOT_DRAIN = 0.5;
export const TEMP_NORMAL = 50;

export const RESOURCE_RESPAWN_TIME = 20000; // ms
export const ANIMAL_COUNT = 80;
export const TREE_COUNT = 600;
export const STONE_COUNT = 300;
export const GOLD_COUNT = 100;
export const BERRY_COUNT = 200;

export const ATTACK_RANGE_SWORD = 80;
export const ATTACK_RANGE_AXE = 70;
export const ATTACK_RANGE_PICK = 70;
export const ATTACK_COOLDOWN = 500; // ms

export const DAY_DURATION = 60000;  // ms per day
export const NIGHT_DURATION = 30000;

export const LEADERBOARD_SIZE = 10;

export const HUNGER_SLOW_THRESHOLD_1 = 0.25;
export const HUNGER_SLOW_THRESHOLD_2 = 0.10;
export const HUNGER_SPEED_MULT_1 = 0.7;
export const HUNGER_SPEED_MULT_2 = 0.5;
