# TODO — Task List for OpenClaw

This file is maintained by **OpenCode**. OpenClaw picks tasks from here, implements them on a branch, and opens a PR.

**Status legend:** `[ ]` open · `[~]` in progress · `[x]` done · `[!]` blocked

---

## Active Tasks

### TASK-01 — Fix build errors in server and client
**Priority:** HIGH  
**Branch:** `fix/task-01-build-errors`

The codebase was written but never compiled. Fix all TypeScript errors so that:
- `cd server && npm install && npm run build` exits with code 0
- `cd client && npm install && npm run build` exits with code 0

Known issues to look for:
- `const enum` values from `shared/packets.ts` and `shared/items.ts` may not work across esbuild module boundaries — replace with plain `const` objects or numeric literals in client code
- `WHEAT` item is referenced in `shared/items.ts` RECIPES but not defined in `ItemId` enum — add `WHEAT = 36` to the enum or remove the recipe
- `PacketHandler.ts` references `player.socket` which is declared via module augmentation — verify the augmentation is correctly picked up
- `shared/items.ts` has a broken `declare module` block at the bottom — remove it, just add `WHEAT = 36` directly to the `ItemId` enum
- Check all import paths resolve correctly (especially `../../../shared/...` from deep client files)

Do **not** change `shared/packets.ts` structure or packet IDs.

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

### TASK-06 — Mammoth AI (snow biome boss)
**Priority:** LOW  
**Branch:** `feat/task-06-mammoth`

Add a Mammoth enemy that roams only in the snow biome.

Specs:
- New `EntityType.MAMMOTH = 13` in `shared/packets.ts`
- Config in `server/src/entities/Animal.ts` ANIMAL_CONFIGS:
  - hp: 500, radius: 40, speed: 120, aggroRange: 300, attackRange: 70, attackDamage: 35, attackCooldown: 2000
  - drops: RAW_MEAT ×5-10, THREAD ×3-6, xpReward: 100
- Spawn 10 mammoths in snow biome in `World.spawnAnimals()`
- Client: render as a large dark-gray circle (radius 40) with tusk lines, or use asset `mammoth.png` from starve.io CDN if it exists

---

### TASK-07 — Kill feed (PvP death announcements)
**Priority:** MEDIUM
**Branch:** `feat/task-07-kill-feed`

When a player kills another player in PvP combat, broadcast a kill feed message to all clients.

Server (`server/src/systems/CombatSystem.ts`, `server/src/core/Game.ts`):
- When a player dies to another player's attack (detected in `processAttack` where target is a Player and hp reaches 0), emit a new packet `KILL_FEED = 23` to all clients: `[23, killerId, killerNickname, victimId, victimNickname]`
- Add `KILL_FEED = 23` to `shared/packets.ts` PacketType object

Client (`client/src/game/GameClient.ts`, new `client/src/ui/KillFeed.ts`):
- Create `KillFeed.ts`: DOM overlay (top-center), shows last 5 kills, each fades out after 5 seconds. Format: "PlayerA killed PlayerB"
- Handle PT_KILL_FEED = 23 in GameClient, call `killFeed.addKill(killerNick, victimNick)`
- Init KillFeed in `start()` with `this.killFeed.init()`

Do not break existing DAMAGE packet (ID 12).

---

### TASK-08 — Hat equip client-side
**Priority:** MEDIUM
**Branch:** `feat/task-08-hat-equip`

Players can craft hats (HAT_WINTER=50, HAT_COWBOY=51) but cannot equip them.

Server (`server/src/packet/PacketHandler.ts`):
- Handle `SELECT_ITEM` packet when selected item is a hat (`ITEMS[itemId]?.isHat === true`): set `player.hatId = itemId` and remove it from inventory (it's equipped, not held). Send updated PLAYER_STATS.
- To un-equip: if player selects the same hat slot again, set `player.hatId = -1` and return hat to inventory.

Client (`client/src/game/GameClient.ts`):
- When slot 1-9 is selected and the item in that slot `isHat`, send `SELECT_ITEM` as normal — server handles the logic.
- HUD should show the equipped hat icon somewhere (small icon near stat bars). Modify `client/src/ui/HUD.ts` to render hat icon if `stats.hatId !== -1`.

---

### TASK-09 — Chest structure (item storage)
**Priority:** MEDIUM
**Branch:** `feat/task-09-chest`

Add a placeable Chest that stores up to 5 item stacks.

Server:
- Add `CHEST = 46` to structure handling in `BuildSystem.ts` (already in ItemId)
- Add `storage: {itemId: number, count: number}[]` field to `Structure.ts` (max 5 slots)
- Add new packet `CHEST_OPEN = 24` (client → server, args: `[24, structureId]`) — server responds with `CHEST_DATA = 25` (`[25, structureId, [[itemId,count], ...]]`)
- Add `CHEST_STORE = 26` (client → server: `[26, structureId, slotIndex, itemId, count]`)
- Add packet IDs 24, 25, 26 to shared/packets.ts

Client:
- Show chest UI (modal) when player right-clicks a chest structure in placement mode — but since we don't have right-click-on-entity yet, use `F` key when near a chest (detect by distance to nearest chest in entities)
- Simple canvas-drawn grid of 5 slots showing chest contents

---

### TASK-10 — Mobile touch controls
**Priority:** LOW
**Branch:** `feat/task-10-touch`

Add virtual joystick and attack button for mobile browsers.

Client (`client/src/engine/Input.ts`, new `client/src/ui/TouchControls.ts`):
- Detect `'ontouchstart' in window` to enable touch mode
- Left half of screen: virtual joystick (fixed position, tracks touch movement, computes moveDir bitmask)
- Right half of screen: tap = attack at touch angle from player center
- `TouchControls.ts`: creates DOM canvas overlay elements, emits same events as keyboard/mouse Input
- Wire into GameClient: if touch mode, send MOVE/ATTACK from TouchControls events

---

### TASK-11 — Sound effects (Web Audio API)
**Priority:** LOW
**Branch:** `feat/task-11-sounds`

Add basic sound effects using the Web Audio API (no external library, no new npm deps).

Client (new `client/src/engine/SoundManager.ts`):
- Use `AudioContext` + `fetch()` to load `.ogg`/`.mp3` files
- Sounds needed: hit (metal clang), wood chop, stone hit, animal death, player death, craft success, eating
- Use starve.io CDN sounds if available (`https://starve.io/sounds/`) or generate simple tones with Web Audio oscillators as fallback
- `SoundManager.play(name: string, volume?: number)` — called from GameClient on DAMAGE, on craft result, on death
- Keep it opt-in: muted by default, M key toggles

---

## Completed Tasks

- [x] **TASK-02** — Fix map sync between server and client (PR #8, merged 2026-03-02)
- [x] **TASK-03** — Implement respawn after death (PR #9, merged 2026-03-02)
- [x] **TASK-04** — Wire up food use (R key) (PR #10, merged 2026-03-02)
- [x] **TASK-05** — Animal corpse despawn (PR #11, merged 2026-03-02)

---

## Notes for OpenClaw

- Always run `npm run build` in both `server/` and `client/` before opening a PR
- If a task is unclear, open the PR anyway with questions in the PR body — OpenCode will answer
- Do not modify this file (TODO.md) — OpenCode manages it
- Do not modify AGENTS.md or shared/constants.ts without explicit instruction
