# Agent Collaboration Guide

This file is the source of truth for any AI agent (OpenClaw, OpenCode, etc.) contributing to this project.

---

## Agent Roles

### OpenCode (this agent)
- **Owns the codebase** — maintains architecture, reviews PRs, merges or integrates changes
- **Writes tasks** for OpenClaw in `TODO.md`
- **Reviews every PR** from OpenClaw before merging
- **Makes final decisions** on architecture and breaking changes

### OpenClaw (external agent)
- **Reads `TODO.md`** to pick up assigned tasks
- **Works on feature branches** — never pushes directly to `master`
- **Opens PRs** for every completed task, referencing the task ID from `TODO.md`
- **Does not modify** `AGENTS.md`, `TODO.md`, `shared/packets.ts`, or `shared/constants.ts` without explicit instruction from OpenCode

---

## Workflow

```
OpenCode writes task → TODO.md
         ↓
OpenClaw picks task → creates branch feat/task-name or fix/task-name
         ↓
OpenClaw implements → commits with message "type(scope): description"
         ↓
OpenClaw opens PR → title references task ID, e.g. "[TASK-04] fix wolf aggro"
         ↓
OpenCode reviews PR → requests changes or merges into master
         ↓
OpenCode updates TODO.md → marks task done
```

### Branch naming
- `feat/task-id-short-description` — new features
- `fix/task-id-short-description` — bug fixes
- `refactor/task-id-short-description` — refactoring

### PR requirements (OpenClaw must follow)
- Title: `[TASK-XX] short description`
- Body: what was changed, why, any known issues
- Must not break `npm run build` in both `server/` and `client/`
- Must not introduce new npm dependencies without prior approval in the task description
- Must not change shared protocol (`shared/packets.ts`) unless the task explicitly says so

---

## Project: IO Game (starve.io inspired)

Multiplayer survival browser game. Real-time, top-down, Canvas 2D renderer, TypeScript everywhere.

**Live repo:** https://github.com/xadezv/io-game

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Server | Node.js + TypeScript + Socket.io 4 + Express |
| Client | TypeScript + Canvas 2D (custom engine, zero frameworks) |
| Build | esbuild (client), tsc (server) |
| Transport | WebSocket via Socket.io (`transports: ['websocket']`) |
| Shared | `/shared/` — constants, packet types, item definitions |

---

## Repo Structure

```
/
├── shared/                   # Shared between server & client
│   ├── constants.ts          # MAP_SIZE, TICK_RATE, player stats caps, etc.
│   ├── packets.ts            # PacketType enum, EntityType enum, BiomeType enum
│   └── items.ts              # ItemId enum, ItemDef, ITEMS record, RECIPES array
│
├── server/
│   ├── src/
│   │   ├── index.ts          # Entry point — calls createServer(PORT)
│   │   ├── core/
│   │   │   ├── Game.ts       # Main game loop (30 TPS), orchestrates everything
│   │   │   └── World.ts      # Entity storage, spatial queries, physics tick
│   │   ├── entities/
│   │   │   ├── Entity.ts     # Abstract base: id, type, x, y, hp, radius, serialize()
│   │   │   ├── Player.ts     # Player: inventory, stats, movement, attack state
│   │   │   ├── Animal.ts     # AI animals: RABBIT (flee) + WOLF (aggro)
│   │   │   ├── Resource.ts   # Tree/Stone/Gold/Berry/Cactus — respawn logic
│   │   │   └── Structure.ts  # Placed buildings: campfire, walls, spikes
│   │   ├── map/
│   │   │   └── MapGen.ts     # LCG-based procedural map (seed reproducible)
│   │   ├── network/
│   │   │   └── WSServer.ts   # Socket.io server, handshake, routes input to Game
│   │   ├── packet/
│   │   │   └── PacketHandler.ts  # Routes incoming packets to systems
│   │   └── systems/
│   │       ├── CombatSystem.ts   # Attack processing, drops, XP
│   │       ├── CraftSystem.ts    # Recipe validation + item crafting
│   │       ├── BuildSystem.ts    # Structure placement
│   │       └── SurvivalSystem.ts # HP/hunger/thirst/temp decay + food use
│   ├── package.json
│   └── tsconfig.json
│
├── client/
│   ├── src/
│   │   ├── main.ts           # Entry point — new GameClient(canvas, serverUrl).start()
│   │   ├── engine/
│   │   │   ├── Renderer.ts   # Canvas 2D helpers (drawImage, drawBar, drawText, etc.)
│   │   │   ├── Camera.ts     # Smooth follow, zoom, worldToScreen / screenToWorld
│   │   │   ├── Input.ts      # WASD + mouse, moveDir bitmask, callbacks
│   │   │   ├── AnimationSystem.ts  # Tweens, easing functions, lerp/lerpAngle
│   │   │   ├── AssetLoader.ts      # Parallel image loading, ASSET_URLS map
│   │   │   └── RNG.ts        # LCG — identical to server MapGen for map sync
│   │   ├── game/
│   │   │   ├── GameClient.ts     # Top-level: WS + game loop + input + UI wiring
│   │   │   ├── WorldRenderer.ts  # Tiled world rendering with viewport culling
│   │   │   ├── EntityRenderer.ts # Render all entity types, interpolation, particles
│   │   │   └── ParticleSystem.ts # Hit sparks, blood, wood chips, smoke
│   │   ├── network/
│   │   │   └── WSClient.ts   # Socket.io-client wrapper, per-type handlers
│   │   └── ui/
│   │       ├── HUD.ts        # Canvas-drawn: stat bars (HP/Hunger/Thirst/Temp), inventory slots
│   │       ├── Chat.ts       # DOM chat log + input (T to focus, Enter to send)
│   │       ├── Leaderboard.ts    # DOM top-10 panel (top-right)
│   │       ├── Minimap.ts    # Separate canvas overlay (top-left, 160×160)
│   │       ├── CraftMenu.ts  # Canvas craft panel (C to toggle, right side)
│   │       ├── Lobby.ts      # DOM fullscreen lobby with nickname input
│   │       └── DeathScreen.ts    # DOM death overlay with respawn button
│   ├── public/
│   │   └── index.html        # Socket.io CDN + bundle.js, all CSS for DOM UI
│   ├── package.json
│   └── tsconfig.json
│
├── AGENTS.md                 # ← You are here
├── README.md
└── .gitignore
```

---

## Network Protocol

All packets are JSON arrays: `[packetId, ...args]`  
Sent/received via Socket.io event `'msg'`.

### Client → Server

| ID | Name | Args |
|----|------|------|
| 0 | CHAT | `[0, message: string]` |
| 1 | HANDSHAKE | `[1, nickname: string]` |
| 2 | MOVE | `[2, dirBitmask: number]` — LEFT=1, RIGHT=2, DOWN=4, UP=8 |
| 5 | ATTACK | `[5, angle: number]` |
| 7 | SELECT_ITEM | `[7, slotIndex: number]` |
| 10 | PLACE | `[10, itemId: number, angle: number]` |
| 11 | CRAFT | `[11, resultItemId: number]` |
| 20 | PING | `[20]` |

### Server → Client

| ID | Name | Args |
|----|------|------|
| 3 | HANDSHAKE_RESPONSE | `[3, myId, x, y, mapSeed, isNight, gameTime, leaderboard[], entities[]]` |
| 4 | ENTITY_UPDATE | `[4, [[id,type,x,y,angle,hp,itemId,hatId,nickname,level,isAttacking,attackAngle], ...]]` |
| 6 | PLAYER_STATS | `[6, [hp,hunger,thirst,temp,xp,level,points,inventory,selectedSlot,hatId]]` |
| 8 | ENTITY_REMOVE | `[8, entityId]` |
| 12 | DAMAGE | `[12, entityId, damage]` |
| 13 | CHAT_BROADCAST | `[13, playerId, nickname, message]` |
| 14 | LEADERBOARD | `[14, [{id,nickname,points}, ...]]` |
| 15 | TIME_UPDATE | `[15, isNight: 0|1, gameTime, cycleMax]` |
| 16 | CRAFT_RESULT | `[16, success: bool, itemId, count]` |
| 17 | DEATH | `[17]` |
| 21 | PONG | `[21, timestamp]` |

---

## Entity Types (EntityType enum in shared/packets.ts)

| Value | Name | Description |
|-------|------|-------------|
| 0 | PLAYER | Human player |
| 1 | TREE | Wood source, plains/forest |
| 2 | STONE | Stone source |
| 3 | GOLD | Gold ore |
| 4 | BERRY | Berry bush, food source |
| 5 | RABBIT | Passive AI, flees players |
| 6 | WOLF | Aggressive AI, attacks on sight |
| 7 | FIRE | Campfire structure, warms nearby players |
| 8 | WALL_WOOD | Wooden wall structure |
| 9 | WALL_STONE | Stone wall structure |
| 10 | SPIKE | Spike trap, damages on contact |
| 11 | CACTUS | Desert resource |
| 12 | SNOW_TREE | Snow biome tree, also drops thread |

---

## Biomes (BiomeType enum in shared/packets.ts)

| Value | Name | Effect |
|-------|------|--------|
| 0 | PLAINS | Default, safe temperature |
| 1 | FOREST | Dense trees, safe |
| 2 | DESERT | High temp during day, thirst drains faster |
| 3 | SNOW | Cold — temperature drains fast without fire/hat |
| 4 | OCEAN | Border, impassable |

---

## Items & Crafting

Defined in `shared/items.ts`:
- `ItemId` enum — tools, food, resources, structures, hats
- `ITEMS` record — full item definitions (damage, range, food values, etc.)
- `RECIPES` array — ingredients + result for crafting

Key items:
- **Tools**: HAND(0), AXE(1), PICK(2), SWORD(3), BIG_AXE(4), BIG_PICK(5), GOLD_AXE(6), GOLD_SWORD(7)
- **Food**: BERRIES(20), COOKED_MEAT(21), RAW_MEAT(22)
- **Resources**: WOOD(30), STONE(31), GOLD(32), THREAD(33)
- **Structures**: CAMPFIRE(40), WALL_WOOD(41), WALL_STONE(42), SPIKE_WOOD(43)
- **Hats**: HAT_WINTER(50), HAT_COWBOY(51)

---

## Key Constants (shared/constants.ts)

```
MAP_SIZE       = 14400   (world size in px)
TILE_SIZE      = 32
TICK_RATE      = 30      (server TPS)
PLAYER_SPEED   = 200     (px/s)
PLAYER_RADIUS  = 24
VIEW_DISTANCE  = 1400    (px radius sent per player)
DAY_DURATION   = 60000ms
NIGHT_DURATION = 30000ms
```

---

## Current Status / TODO

### Done (MVP)
- [x] Server game loop, physics, collision
- [x] Procedural world generation (LCG seed, biomes)
- [x] Player movement, attack, combat
- [x] Resources + respawn
- [x] AI animals (rabbit flee, wolf aggro)
- [x] Survival stats (HP/hunger/thirst/temp + decay)
- [x] Crafting system
- [x] Building placement
- [x] Client engine (Renderer, Camera, Input, Animations, Assets)
- [x] WorldRenderer with tile culling
- [x] EntityRenderer with interpolation
- [x] Particle system
- [x] Full UI (HUD, Chat, Leaderboard, Minimap, Lobby, DeathScreen, CraftMenu)
- [x] Day/night cycle

### Needs Work / Known Issues
- [ ] Build errors need to be checked and fixed (imports, type mismatches)
- [ ] Map sync: client map generation from seed must match server exactly
- [ ] Respawn after death not implemented
- [ ] Food use (R key) not hooked up end-to-end
- [ ] Hat equip not implemented client-side
- [ ] `WHEAT` item referenced in recipes but not defined in ItemId enum
- [ ] `PacketHandler.ts` has unused `Structure` placement broadcast (needs wiring)
- [ ] Animal dead bodies should despawn after a few seconds
- [ ] No mobile/touch support yet

### Next Features to Add
- [ ] Mammoth (snow biome boss animal)
- [ ] Chest structure for item storage
- [ ] Windmill + bread crafting
- [ ] PvP kill feed
- [ ] Sound effects
- [ ] Mobile touch controls
- [ ] Respawn with score penalty
- [ ] Server-side anti-cheat (position validation)

---

## How to Run

```bash
# Server (port 3000)
cd server && npm install && npm run dev

# Client (watches and rebuilds)
cd client && npm install && npm run dev

# Open browser at http://localhost:3000
```

---

## Conventions

- **Packets**: always arrays, first element is numeric ID
- **Positions**: world space in pixels (float), sent as `Math.round()` integers
- **Angles**: radians, `Math.atan2(dy, dx)`
- **IDs**: auto-incrementing integers from `genId()` in `Entity.ts`
- **const enum**: avoid across esbuild module boundaries — use plain numeric constants in client code
- **No external game libs**: Phaser, Pixi, Three.js etc. are NOT used — pure Canvas 2D
- **Assets**: loaded from `https://starve.io/img/` CDN for MVP

---

## Agent Instructions

If you are an AI agent working on this repo:

1. **Read this file first** before making any changes
2. **Read `TODO.md`** — that is your task list; pick the first unassigned task
3. **Check `shared/`** before adding new packet types or items — avoid duplication
4. **Server changes** that affect the protocol must be reflected in both `shared/packets.ts` AND client handlers in `GameClient.ts`
5. **Do not add npm dependencies** without prior approval in the task description
6. **Test with `npm run build`** in both `server/` and `client/` before committing
7. **Commit message format**: `type(scope): description` — e.g. `fix(server): resolve wolf aggro range bug`
8. **Branch per task**: create a branch like `feat/task-03-mammoth-ai` or `fix/task-01-map-sync`
9. **Open a PR** when done — title must be `[TASK-XX] short description`; never push directly to `master`
