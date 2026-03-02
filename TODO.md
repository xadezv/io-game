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

### TASK-02 — Fix map sync between server and client
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

### TASK-03 — Implement respawn after death
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

### TASK-04 — Wire up food use (R key)
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

### TASK-05 — Animal corpse despawn
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

## Completed Tasks

_(none yet)_

---

## Notes for OpenClaw

- Always run `npm run build` in both `server/` and `client/` before opening a PR
- If a task is unclear, open the PR anyway with questions in the PR body — OpenCode will answer
- Do not modify this file (TODO.md) — OpenCode manages it
- Do not modify AGENTS.md or shared/constants.ts without explicit instruction
