# TODO — Task List for OpenClaw

This file is maintained by **OpenCode**. OpenClaw picks tasks from here, implements them on a branch, and opens a PR.

**Status legend:** `[ ]` open · `[~]` in progress · `[x]` done · `[!]` blocked

---

## Active Tasks

### ~~TASK-01 — Fix build errors in server and client~~ [x] DONE (fixed directly on master, stale PRs #1 and #7 closed)

---

### ~~TASK-02 — Fix map sync between server and client~~ [x] DONE (merged PR #8)
**Priority:** HIGH  
**Branch:** `fix/task-02-map-sync`

The server generates the world in `server/src/map/MapGen.ts` using an LCG seed + `simplexApprox`.  
The client needs to reproduce the exact same tile layout from the same seed.

Steps:
1. Extract the noise/biome logic from `MapGen.ts` into a pure function that takes `(tx, ty, seed)` and returns `{ tile, biome }`
2. Replicate the same function in `client/src/game/GameClient.ts` (the `generateClientMap` helper)
3. Verify both produce the same output for the same seed (add a comment with a test case: seed=12345, tx=100, ty=100 → expected tile/biome)

Do **not** change `MAP_SIZE`, `TILE_SIZE`, or `TILES_COUNT` constants.

---

### ~~TASK-03 — Implement respawn after death~~ [x] DONE (merged PR #9)
**Priority:** MEDIUM  
**Branch:** `feat/task-03-respawn`

Currently when a player dies, the death screen shows but there's no way to respawn.

Server (`server/src/core/Game.ts`, `server/src/network/WSServer.ts`):
- Add handler for new packet `RESPAWN = 22` (client → server)
- On respawn: reset player hp/hunger/thirst/temp to max, move to a new spawn position, set `player.dead = false`, clear inventory of nothing (keep 0 items — fresh start), send `HANDSHAKE_RESPONSE` again with updated position

Client (`client/src/game/GameClient.ts`, `client/src/ui/DeathScreen.ts`):
- DeathScreen "Respawn" button sends `[22]` to server
- On receiving new `HANDSHAKE_RESPONSE` after death: reset local state, hide death screen, resume game loop

Add `RESPAWN = 22` to `shared/packets.ts` PacketType enum.

---

### ~~TASK-04 — Wire up food use (R key)~~ [x] DONE (merged PR #10)
**Priority:** MEDIUM  
**Branch:** `feat/task-04-food-use`

The `useFood` function exists in `server/src/systems/SurvivalSystem.ts` but is never called.

Server:
- In `PacketHandler.ts`, handle a new packet `USE_ITEM = 23` (client → server, no args — uses currently selected slot)
- Call `useFood(player, player.getSelectedItem())` if the selected item is food
- Send updated `PLAYER_STATS` packet back after use

Client:
- In `GameClient.ts`, when R key is pressed and game is running (not chat focused): send `[23]`

Add `USE_ITEM = 23` to `shared/packets.ts` PacketType enum.

---

### ~~TASK-05 — Animal corpse despawn~~ [x] DONE (merged PR #11)
**Priority:** LOW  
**Branch:** `feat/task-05-corpse-despawn`

When an animal dies, it stays in the world forever as a dead entity.

Server (`server/src/entities/Animal.ts`, `server/src/core/World.ts`):
- Add `despawnTimer: number` to `Animal` — set to `3000` (ms) on death
- In `World.update()`, count down `despawnTimer` for dead animals; when it reaches 0, remove from `world.animals` map and add `id` to a `toRemove: number[]` list
- In `Game.ts`, broadcast `[PacketType.ENTITY_REMOVE, id]` for each removed entity

---

### ~~TASK-06 — Mammoth AI (snow biome boss)~~ [x] DONE (merged PR #12)

---

### ~~TASK-07 — Kill feed (PvP death announcements)~~ [x] DONE (merged PR #14; KILL_FEED reassigned to ID 27 — was colliding with USE_ITEM=23)

---

### ~~TASK-08 — Hat equip client-side~~ [x] DONE (merged PR #15)

---

### ~~TASK-09 — Chest structure (item storage)~~ [x] DONE (blockers fixed directly on master: EntityType.CHEST=14 added, CHEST_DATA handler added to client, proximity aligned to 160px)

---

### ~~TASK-10 — Mobile touch controls~~ [x] DONE (merged PR #17, baseline working — joystick render follow-up in TASK-12)

---

### ~~TASK-11 — Sound effects (Web Audio API)~~ [x] DONE (merged PR #18)

---

### ~~TASK-12 — Touch joystick visual + polish~~ [x] DONE (merged fix/task-12-touch-polish: DOM joystick visual, anchored to touch-start, knob clamped within base radius, e.preventDefault everywhere)

---

### TASK-13 — Kill streak counter + XP bonus  [~] PR #20 open
**Priority:** LOW
**Branch:** `feat/task-13-kill-streak`

Track consecutive PvP kills without dying. Display streak in HUD and grant bonus XP at milestones.

Server (`server/src/entities/Player.ts`, `server/src/systems/CombatSystem.ts`):
- Add `killStreak: number` field to Player, reset to 0 on death
- Increment on each PvP kill; grant +10 XP bonus per streak count (capped at 50)
- Include `killStreak` in `PLAYER_STATS` packet (append as last element so existing indices are unaffected)

Client (`client/src/ui/HUD.ts`):
- Show kill streak badge (e.g. "3x STREAK") near top of screen when streak >= 2, hide when 0

---

### TASK-14 — Floating damage numbers  [~] PR #21 open
**Priority:** MEDIUM
**Branch:** `feat/task-14-floating-dmg`
**Source:** IDEA-01

When any entity takes damage show a number floating upward from the hit point, fading out over ~0.8 s. Critical hits (damage >= 40) display in red and 1.4x font size.

Client only (`client/src/game/ParticleSystem.ts`, `client/src/game/GameClient.ts`):
- Add a `DamageLabel` type to `ParticleSystem`: fields `x`, `y`, `value: number`, `critical: boolean`, `age: number`, `lifetime: number` (800 ms)
- Each tick: `y -= 40 * dt`, `age += dt`; alpha = `1 - age/lifetime`
- Render in `ParticleSystem.render()` after all other particles: `ctx.font = critical ? 'bold 22px sans-serif' : '16px sans-serif'`; color `#ff4444` for critical, `#ffffff` otherwise
- In `GameClient.ts` handler for `PacketType.DAMAGE` (ID 12): call `particles.spawnDamageLabel(worldX, worldY, damage)` where worldX/worldY come from the entity's current interpolated position

No server changes. No new packets. No new dependencies.

---

### TASK-15 — Minimap entity icons  [~] PR #22 open
**Priority:** LOW
**Branch:** `feat/task-15-minimap-icons`
**Source:** IDEA-03

Show coloured dots on the minimap for visible entities:
- Green dot — other players
- Red dot — wolves / mammoth
- White dot — rabbits
- Yellow dot — berry bushes
- Own player — blue dot, slightly larger

Client only (`client/src/ui/Minimap.ts`):
- After drawing the terrain tiles, iterate `gameClient.entities` (already available via passed ref or getter)
- Scale world pos to minimap coordinates: `mx = (ex / MAP_SIZE) * MINIMAP_SIZE`, same for my
- Draw a filled circle of radius 2 (3 for own player) at each scaled position
- Cap entity rendering at 200 entities per frame to avoid overdraw on busy servers

No server changes. No new packets.

---

### TASK-16 — Hunger slows movement  [~] branch pushed (feat/task-16-hunger-speed), needs PR
**Priority:** MEDIUM
**Branch:** `feat/task-16-hunger-speed`
**Source:** IDEA-04

When hunger < 25% of max, reduce server-side player speed by 30%. When hunger < 10%, reduce by 50%.

Server (`server/src/entities/Player.ts`, `server/src/core/World.ts`):
- Add a helper `getEffectiveSpeed(): number` to `Player` — returns `PLAYER_SPEED * multiplier` where multiplier is derived from `this.hunger / MAX_HUNGER`
- In `World.ts` movement tick, replace `PLAYER_SPEED` constant with `player.getEffectiveSpeed()`
- Add constants to `shared/constants.ts`: `HUNGER_SLOW_THRESHOLD_1 = 0.25`, `HUNGER_SLOW_THRESHOLD_2 = 0.10`, `HUNGER_SPEED_MULT_1 = 0.7`, `HUNGER_SPEED_MULT_2 = 0.5`

No client changes. No new packets.

---

### TASK-17 — Leaderboard kills column  [~] branch pushed (feat/task-17-leaderboard-kills), needs PR
**Priority:** LOW
**Branch:** `feat/task-17-leaderboard-kills`
**Source:** IDEA-24

Add a kills column to the top-10 leaderboard panel (alongside points).

Server (`server/src/entities/Player.ts`, `server/src/core/Game.ts`):
- Add `kills: number = 0` field to `Player`
- Increment `player.kills` in `CombatSystem.ts` when a player lands the killing blow on another player (already tracked for kill feed — reuse that guard)
- In `Game.ts` leaderboard broadcast, include `kills` in each entry: `{ id, nickname, points, kills }`

Client (`client/src/ui/Leaderboard.ts`):
- Update the DOM render to add a "Kills" column header and value per row
- Keep existing points column; kills column on the right

`shared/packets.ts` `LEADERBOARD` packet array entries gain a 4th field `kills: number` (append — backwards compatible if client checks array length).

---

### TASK-18 — Wolf pack spawns at night  [~] branch pushed (feat/task-18-wolf-night-pack), needs PR
**Priority:** MEDIUM
**Branch:** `feat/task-18-wolf-night-pack`
**Source:** IDEA-08

At each day→night transition, spawn 2–3 additional wolves near the edge of each non-ocean biome region. At night, all wolf `aggroRange` increases by 50%. On night→day transition, remove the extra night wolves and restore `aggroRange`.

Server (`server/src/core/Game.ts`, `server/src/entities/Animal.ts`):
- In `Game.ts`, listen for `isNight` transitions (already broadcast via `TIME_UPDATE`)
- On `isNight = true`: call `world.spawnNightWolves()` — pick 3 random non-ocean positions near the map edges, create Wolf entities, tag them with `isNightWolf: boolean = true`
- On `isNight = false`: iterate `world.animals`, remove all with `isNightWolf === true`, broadcast `ENTITY_REMOVE` for each
- In `Animal.ts`: add `aggroRange` as an instance field (default from constant); on night, set to `baseAggroRange * 1.5`; restore on day

No new packets. No client changes.

---

### TASK-19 — Furnace structure (cook raw meat)  [~] PR #24 open
**Priority:** MEDIUM
**Branch:** `feat/task-19-furnace`
**Source:** IDEA-09

A craftable furnace lets players convert RAW_MEAT → COOKED_MEAT over 5 seconds by pressing E near it.

Shared (`shared/items.ts`):
- Add `FURNACE: 47` to `ItemId`
- Add `FURNACE` entry to `ITEMS` record: `isStructure: true, structureHp: 150, sprite: 'furnace'`
- Add recipe: `{ result: ItemId.FURNACE, count: 1, ingredients: [{ item: ItemId.STONE, count: 20 }, { item: ItemId.COAL, count: 5 }] }`

Shared (`shared/packets.ts`):
- Add `INTERACT: 28` (client → server, args: `[28, entityId]`)
- Add `INTERACT_RESULT: 29` (server → client, args: `[29, entityId, success: 0|1, resultItemId, count]`)

Server (`server/src/entities/Structure.ts`):
- Add `cookTimer: number = 0` and `isCooking: boolean = false` fields

Server (`server/src/packet/PacketHandler.ts`):
- Handle `INTERACT (28)`: find nearby furnace (distance <= 120 px), if player has RAW_MEAT in inventory start a 5000 ms cook timer on the structure, remove 1 RAW_MEAT from player

Server (`server/src/core/Game.ts` or `World.ts`):
- Each tick: count down `cookTimer` on furnaces; when done, `addItem(COOKED_MEAT, 1)` to owning player (track `cookingPlayerId` on Structure), send `INTERACT_RESULT`

Client (`client/src/game/GameClient.ts`):
- When E key pressed: find nearest furnace within 120 px, send `[28, furnaceId]`
- Handle `INTERACT_RESULT (29)`: show brief "Cooked!" chat message or HUD toast

---

### TASK-20 — Snowstorm dynamic weather  [~] PR #25 open
**Priority:** MEDIUM
**Branch:** `feat/task-20-snowstorm`
**Source:** IDEA-22

Every 5–10 minutes a snowstorm hits the snow biome: temperature drains 2× faster for players in the snow zone, and the client renders a snowflake particle overlay. A chat warning is broadcast 30 seconds before onset.

Shared (`shared/packets.ts`):
- Add `WEATHER: 30` (server → client, args: `[30, type: 0|1, duration: number]`) — `type 0` = clear, `type 1` = snowstorm

Server (`server/src/core/Game.ts`):
- Add `weatherTimer`, `stormActive`, `stormDuration` fields
- Each game tick: count down timer; when zero roll a random interval (5–10 min); 30 s before next storm, broadcast `CHAT_BROADCAST` system message "A snowstorm is approaching the snow biome!"
- On storm start: set `stormActive = true`, broadcast `WEATHER(1, duration)` to all
- On storm end: `stormActive = false`, broadcast `WEATHER(0, 0)`

Server (`server/src/systems/SurvivalSystem.ts`):
- In temperature decay logic, if `stormActive && player.biome === BiomeType.SNOW`, multiply temp drain by 2

Client (`client/src/game/WorldRenderer.ts` or `GameClient.ts`):
- Track `isStorm: boolean`; on `WEATHER` packet set the flag
- If `isStorm`, draw 60 semi-transparent white snowflake dots per frame with random velocity, fading at edges of viewport

---

### TASK-21 — Respawn with score penalty  [~] branch pushed (feat/task-21-respawn-penalty), needs PR
**Priority:** LOW
**Branch:** `feat/task-21-respawn-penalty`
**Source:** IDEA-07

On respawn, players keep 20% of their accumulated `points` and receive a starter kit: 1 AXE + 10 WOOD.

Server (`server/src/core/Game.ts`, respawn handler):
- Before resetting player: `const carry = Math.floor(player.points * 0.2)`
- After reset: `player.points = carry`; `player.addItem(ItemId.AXE, 1)`; `player.addItem(ItemId.WOOD, 10)`
- The starter AXE should only be given if the player does not already have one (fresh-start case is already handled by existing inventory clear)

No new packets (reuses existing `HANDSHAKE_RESPONSE` flow from TASK-03). No client changes.

---

### TASK-22 — Workshop structure (tier-gated crafting)  [~] PR #26 open
**Priority:** MEDIUM
**Branch:** `feat/task-22-workshop`
**Source:** IDEA-16

High-tier tools (GOLD_AXE, GOLD_SWORD, GOLD_PICK) can only be crafted near a Workshop structure.

Shared (`shared/items.ts`):
- Add `WORKSHOP: 48` to `ItemId`
- Add `WORKSHOP` entry to `ITEMS`: `isStructure: true, structureHp: 300, sprite: 'workbench'`
- Add recipe: `{ result: ItemId.WORKSHOP, count: 1, ingredients: [{ item: ItemId.WOOD, count: 40 }, { item: ItemId.STONE, count: 20 }] }`
- Add `requiresWorkbench: true` to gold tool recipes in `RECIPES` array

Server (`server/src/systems/CraftSystem.ts`):
- Before crafting: if `recipe.requiresWorkbench`, check that a `Structure` of type `EntityType.WORKSHOP` (add `WORKSHOP: 15` to EntityType in `shared/packets.ts`) exists within 200 px of the player
- If check fails, send `CRAFT_RESULT(false, itemId, 0)` — no item given

Server (`server/src/systems/BuildSystem.ts`):
- Add `[ItemId.WORKSHOP]: { type: EntityType.WORKSHOP, radius: 40 }` to `STRUCTURE_MAP`

Client (`client/src/ui/CraftMenu.ts`):
- Show a small lock icon or "(workshop)" label next to recipes that require a workbench, when no workshop is in range (client-side hint only — server enforces)

---

### TASK-23 — Poison status effect + mushroom resource  [~] PRs #30/#34 open
**Priority:** MEDIUM
**Branch:** `feat/task-23-poison`
**Source:** IDEA-21

Dark mushrooms spawn in forest biome. Eating raw → poison debuff (−2 HP/s for 10 s). Combine with gold at workshop → POISON_COATING item that adds DoT to attacks for 60 s.

Shared (`shared/items.ts`):
- Add `MUSHROOM: 37` and `POISON_COATING: 38` to `ItemId`
- Add `MUSHROOM` entry: `isFood: true, foodHp: -5, foodHunger: 10, sprite: 'mushroom'` (negative foodHp = poison trigger)
- Add `POISON_COATING` entry: `stackable: true, maxStack: 5, isWeapon: false, sprite: 'poison_coating'`
- Add recipe (requires workshop): `{ result: ItemId.POISON_COATING, count: 1, ingredients: [{ item: ItemId.MUSHROOM, count: 3 }, { item: ItemId.GOLD, count: 5 }], requiresWorkbench: true }`

Server (`server/src/entities/Player.ts`):
- Add `poisonTimer: number = 0` and `poisonCoated: boolean = false`, `poisonCoatTimer: number = 0`

Server (`server/src/systems/SurvivalSystem.ts`):
- In `updateSurvival`: if `player.poisonTimer > 0`, drain `2 * dt` HP/s and `poisonTimer -= dt * 1000`
- If `player.poisonCoatTimer > 0`, decrement `poisonCoatTimer -= dt * 1000`; when zero set `poisonCoated = false`

Server (`server/src/systems/SurvivalSystem.ts` — `useFood`):
- If `item.foodHp < 0` and item is mushroom, set `player.poisonTimer = 10000` instead of applying HP

Server (`server/src/systems/CombatSystem.ts`):
- If `attacker.poisonCoated`, apply 3-second DoT on hit: set `target.poisonTimer = 3000`

Server (`server/src/packet/PacketHandler.ts`):
- Handle `USE_ITEM` for `POISON_COATING`: set `player.poisonCoated = true`, `player.poisonCoatTimer = 60000`, remove 1 coating from inventory

Map (`server/src/map/MapGen.ts`):
- Spawn MUSHROOM resources in FOREST biome at ~1/4 the density of berries (reuse Resource entity)

No new packets needed (PLAYER_STATS already sent on stat changes).

---

### TASK-24 — Gold tool durability  [~] PRs #28/#35 open
**Priority:** MEDIUM
**Branch:** `feat/task-24-gold-durability`
**Source:** IDEA-05

Gold tools have 200 uses before breaking back to HAND.

Shared (`shared/items.ts`):
- Add optional `maxDurability?: number` field to `ItemDef`
- Set `maxDurability: 200` for `GOLD_AXE`, `GOLD_SWORD`, `GOLD_PICK`

Server (`server/src/entities/Player.ts`):
- Add `durability: Map<number, number>` (slotIndex → remaining uses)
- Add method `useTool(slotIndex: number): void` — decrements durability for the slot; if 0, replaces with HAND (itemId=0, count=1)

Server (`server/src/systems/CombatSystem.ts`):
- After a successful attack with a gold tool, call `attacker.useTool(attacker.selectedSlot)`

Client (`client/src/ui/HUD.ts`):
- In the inventory slot render, if `durability < 50%`, draw a small orange progress bar under the item icon
- Include `durability` map in `PLAYER_STATS` packet as last element (index 11) — send as flat array `[slot, remaining, slot, remaining, ...]`

---

### TASK-25 — Bear boss (forest biome)  [~] PR #29 open
**Priority:** MEDIUM
**Branch:** `feat/task-25-bear`
**Source:** IDEA-13

Rare bear boss in forest biome. 500 HP, wide arc attack, drops large meat haul + PELT item.

Shared (`shared/packets.ts`):
- Add `BEAR: 16` to `EntityType`

Shared (`shared/items.ts`):
- Add `PELT: 39` to `ItemId`
- Add `PELT` entry: `stackable: true, maxStack: 10, sprite: 'pelt'`
- Add `HAT_FUR: 54` to ItemId (crafted from pelt) with `isHat: true, tempBonus: 50, sprite: 'hat_fur'`
- Add recipe: `{ result: ItemId.HAT_FUR, count: 1, ingredients: [{ item: ItemId.PELT, count: 5 }, { item: ItemId.THREAD, count: 10 }] }`

Server (`server/src/entities/Animal.ts`):
- Add `BEAR` to `ANIMAL_CONFIGS`: `hp: 500, speed: 90, radius: 40, aggroRange: 300, attackRange: 60, attackDamage: 35, attackCooldown: 1200, xpReward: 200`
- Bear attack: apply damage in a 120° arc (3 targets max) — check angle between bear facing and direction to player
- Bear drops: `RAW_MEAT x5` + `PELT x2` on death

Server (`server/src/core/World.ts`):
- Add `spawnBear()` method: places 1 bear in a random FOREST biome tile, only if no other bear is alive
- Called from `Game.ts` on game start and every 10 minutes after death

Client (`client/src/game/EntityRenderer.ts`):
- Render bear as a large brown circle (r=40) with a health bar above; use `bear` sprite if available

---

### TASK-26 — Spider enemy with web slow  [~] PR #31 open
**Priority:** MEDIUM
**Branch:** `feat/task-26-spider`
**Source:** IDEA-14

Spiders spawn at night in forest biome. Attack applies "webbed" debuff: −60% speed for 3 s. Drop thread.

Shared (`shared/packets.ts`):
- Add `SPIDER: 17` to `EntityType`

Server (`server/src/entities/Animal.ts`):
- Add `SPIDER` to `ANIMAL_CONFIGS`: `hp: 60, speed: 160, radius: 18, aggroRange: 200, attackRange: 30, attackDamage: 8, attackCooldown: 800, xpReward: 25`
- Spider only active at night (check `game.isNight` — pass as param or via world flag)

Server (`server/src/entities/Player.ts`):
- Add `webTimer: number = 0` field

Server (`server/src/systems/CombatSystem.ts`):
- When a spider hits a player, set `target.webTimer = 3000`

Server (`server/src/entities/Player.ts` — `getEffectiveSpeed`):
- If `webTimer > 0`, apply extra 0.4 multiplier on top of hunger slowdown

Server (`server/src/systems/SurvivalSystem.ts`):
- Decrement `player.webTimer -= dt * 1000` each tick

Server (`server/src/core/Game.ts`):
- Spawn 5–8 spiders in forest biome on day→night transition; remove on night→day

Spider drops: `THREAD x1` (50% chance)

---

### TASK-27 — Campfire fire spread to wood structures  [ ]
**Priority:** MEDIUM
**Branch:** `feat/task-27-fire-spread`
**Source:** IDEA-06

Campfires have a 0.5% chance per tick to ignite adjacent wood walls/spikes within 80px. Burning structures take 8 HP/s and emit a fire particle on client.

Server — new `FireSystem.ts` in `server/src/systems/`:
- `processFireSpread(world: World): void`
- Iterate all FIRE structures (campfires); for each, call `world.getNearbyStructures(x, y, 80)`
- For each wood structure (`WALL_WOOD`, `SPIKE_WOOD`) within range: roll `Math.random() < 0.005`; if hit, add to `world.burningStructures: Set<number>` (structure IDs)
- Each tick: for each burning structure ID, damage it `8 * dt` HP; remove from burning set if dead
- On structure death by fire, broadcast `ENTITY_REMOVE`

Server (`server/src/core/Game.ts`):
- Import and call `processFireSpread(world)` each tick

Client (`client/src/game/EntityRenderer.ts`):
- Structures with `isBurning` flag (send via entity update — add optional flag to entity serialize, or reuse a spare field): render orange/yellow glow ring around them

No new packets needed — use `DAMAGE` packet to notify clients of burning damage.

---

### TASK-28 — Anti-cheat: server-side position validation  [ ]
**Priority:** HIGH
**Branch:** `feat/task-28-anticheat`

Players currently move at any speed because the server trusts client direction input and applies speed server-side, but doesn't validate the resulting delta per tick. Add basic sanity checks.

Server (`server/src/core/World.ts`):
- In the player movement tick, after computing the new `(nx, ny)`:
  - Calculate `maxDelta = player.getEffectiveSpeed() * dt * 1.15` (15% tolerance for network jitter)
  - If `Math.hypot(nx - player.x, ny - player.y) > maxDelta`, clamp the move to `maxDelta` distance
  - Log a warning `[ANTICHEAT] player ${id} clamped move from ${actual} to ${maxDelta}`

Server (`server/src/entities/Player.ts`):
- Add `violationCount: number = 0`
- Increment on each clamped move; if `violationCount > 20` within 5 seconds, mark player for kick (emit DEATH + disconnect socket after 1s)

Server (`server/src/core/Game.ts`):
- Every 5 seconds, reset `violationCount = 0` for all players (sliding window reset)

No client changes. No new packets. No new dependencies.

---

## Completed Tasks

- [x] **TASK-01** — Fix build errors (fixed on master, PRs #1 #7 closed)
- [x] **TASK-02** — Fix map sync between server and client (PR #8, merged 2026-03-02)
- [x] **TASK-03** — Implement respawn after death (PR #9, merged 2026-03-02)
- [x] **TASK-04** — Wire up food use (R key) (PR #10, merged 2026-03-02)
- [x] **TASK-05** — Animal corpse despawn (PR #11, merged 2026-03-02)
- [x] **TASK-06** — Mammoth AI snow biome boss (PR #12, merged 2026-03-02)
- [x] **TASK-07** — PvP kill feed (PR #14, merged; KILL_FEED reassigned to ID 27)
- [x] **TASK-08** — Hat equip client-side (PR #15, merged 2026-03-02)
- [x] **TASK-09** — Chest structure / item storage (PR #16, blockers fixed on master 2026-03-02)
- [x] **TASK-10** — Mobile touch controls baseline (PR #17, merged 2026-03-02)
- [x] **TASK-11** — Sound effects Web Audio API (PR #18, merged 2026-03-02)
- [x] **TASK-12** — Touch joystick visual + polish (fix/task-12-touch-polish, merged 2026-03-02)
- [x] **TASK-13** — Kill streak counter + XP bonus (PR #20, merged 2026-03-02)
- [x] **TASK-14** — Floating damage numbers (PR #21, merged 2026-03-02)
- [x] **TASK-15** — Minimap entity icons (PR #22, merged 2026-03-02)
- [x] **TASK-16** — Hunger slows movement (merged on master 2026-03-02)
- [x] **TASK-17** — Leaderboard kills column (merged on master 2026-03-02)
- [x] **TASK-18** — Wolf pack spawns at night (merged on master 2026-03-02)
- [x] **TASK-19** — Furnace structure / cook raw meat (PR #24, merged 2026-03-02)
- [x] **TASK-20** — Snowstorm dynamic weather (PR #25, merged 2026-03-02)
- [x] **TASK-21** — Respawn with score penalty (merged on master 2026-03-02)
- [x] **TASK-22** — Workshop structure / tier-gated crafting (PR #26, merged 2026-03-02)

## Ideas Source

See **IDEAS.md** in the repo root for 25 feature/content ideas with complexity ratings.  
OpenCode picks from IDEAS.md when writing new tasks for OpenClaw.

---

## Notes for OpenClaw

- Always run `npm run build` in both `server/` and `client/` before opening a PR
- If a task is unclear, open the PR anyway with questions in the PR body — OpenCode will answer
- Do not modify this file (TODO.md) — OpenCode manages it
- Do not modify AGENTS.md or shared/constants.ts without explicit instruction
