# Game Ideas — IO Game Project

A curated list of improvement and feature ideas for the multiplayer survival browser game.
Ideas are ordered by category and tagged with complexity and implementation scope.

---

## [IDEA-01] Floating Damage Numbers
**Complexity:** low
**Category:** ui
**Description:** When a player or entity takes damage, a number floats upward from the hit point and fades out over ~0.8 seconds. Critical hits could display in a larger red font. This gives immediate visual feedback that attacks are connecting and makes combat feel more satisfying.
**Implementation hint:** `client/src/game/ParticleSystem.ts` — add a `DamageLabel` particle type; trigger on `DAMAGE` packet in `GameClient.ts`.

---

## [IDEA-02] Kill Streak Counter
**Complexity:** low
**Category:** ui
**Description:** Track consecutive player kills without dying and display the streak count in the HUD (e.g. "3x KILL STREAK"). Streaks reset on death and could grant small XP bonuses at milestone counts (3, 5, 10). This encourages aggressive PvP play and rewards skilled survivors.
**Implementation hint:** `server/src/systems/CombatSystem.ts` for tracking; `client/src/ui/HUD.ts` for display; `shared/packets.ts` may need a new field in `PLAYER_STATS`.

---

## [IDEA-03] Minimap Entity Icons
**Complexity:** low
**Category:** ui
**Description:** Show colored dots on the minimap for different entity types — green for players, red for wolves, white for rabbits, yellow for resources. This helps players plan navigation, avoid danger, and locate food sources without fully exploring the map.
**Implementation hint:** `client/src/ui/Minimap.ts` — iterate entities from the world snapshot and draw colored dots scaled to minimap coordinates.

---

## [IDEA-04] Hunger Slows Movement
**Complexity:** low
**Category:** balance
**Description:** When a player's hunger drops below 25%, their movement speed is reduced by 30%. At 10% hunger the penalty increases to 50%. This makes food management a real survival pressure rather than a secondary concern, and forces players to forage actively.
**Implementation hint:** `server/src/entities/Player.ts` — compute effective speed from hunger level each tick; `shared/constants.ts` for threshold values.

---

## [IDEA-05] Gold Tool Durability
**Complexity:** low
**Category:** balance
**Description:** Gold tools deal high damage and gather resources faster but have limited durability (e.g. 200 uses before breaking). When a tool breaks it reverts to HAND. This prevents gold gear from being permanently dominant and creates ongoing resource demand.
**Implementation hint:** `server/src/entities/Player.ts` — add a `durability` map per slot; decrement on use; `shared/items.ts` — add `maxDurability` field to `ItemDef`.

---

## [IDEA-06] Campfire Spreads to Nearby Wood Structures
**Complexity:** medium
**Category:** gameplay
**Description:** If a campfire is placed adjacent to a wooden wall or spike, there is a small chance per tick that the structure catches fire and is destroyed over ~10 seconds. This adds a risk/reward element to using fire near your base and enables griefing counterplay.
**Implementation hint:** `server/src/systems/CombatSystem.ts` or a new `FireSystem.ts`; query nearby structures in `World.ts` within a radius; apply damage over time.

---

## [IDEA-07] Respawn with Score Penalty
**Complexity:** low
**Category:** balance
**Description:** Instead of a clean slate on death, players respawn retaining 20% of their accumulated points and a basic starter kit (axe + 10 wood). This rewards long survivors while giving returning players a small head start over brand-new joiners.
**Implementation hint:** `server/src/core/Game.ts` respawn logic; `server/src/entities/Player.ts` — store `carryoverPoints`; `shared/packets.ts` `DEATH` / `HANDSHAKE_RESPONSE` already handle this flow.

---

## [IDEA-08] Wolf Pack Spawns at Night
**Complexity:** medium
**Category:** gameplay
**Description:** At night, additional wolves spawn in groups of 2–3 near the edges of each biome and their aggro range increases by 50%. During the day wolf count returns to normal. This makes night genuinely dangerous and rewards players who build fires and shelter before sundown.
**Implementation hint:** `server/src/core/Game.ts` — listen to day/night cycle transitions; `server/src/entities/Animal.ts` — adjust `aggroRange`; `server/src/core/World.ts` — trigger pack spawn.

---

## [IDEA-09] Furnace Structure — Cook Raw Meat
**Complexity:** medium
**Category:** content
**Description:** A craftable furnace structure that players interact with (press E) to convert RAW_MEAT to COOKED_MEAT over 5 seconds. Cooked meat restores significantly more hunger than berries and is the primary incentive to hunt animals. Without a furnace, raw meat provides minimal nutrition.
**Implementation hint:** `shared/items.ts` — add FURNACE item; `server/src/systems/BuildSystem.ts`; `server/src/entities/Structure.ts`; new interaction packet in `shared/packets.ts`.

---

## [IDEA-10] Farm Plot — Grow Berries
**Complexity:** medium
**Category:** content
**Description:** Players can place farm plots on plains biome tiles. After 60 seconds a berry bush spawns on the plot, providing a renewable food source near base. Plots can be destroyed by enemies. This rewards base-building playstyles and reduces reliance on foraging deep into the map.
**Implementation hint:** `shared/items.ts` — add FARM_PLOT; `server/src/entities/Structure.ts`; `server/src/core/Game.ts` — timer to spawn a BERRY resource on the plot location.

---

## [IDEA-11] Trading Post Structure
**Complexity:** high
**Category:** economy
**Description:** A craftable trading post allows two players standing near it to open a barter UI, offering items from their inventory for exchange. Both players must confirm the trade before items swap. This enables player-driven economies and cooperation on servers with large populations.
**Implementation hint:** `shared/packets.ts` — new TRADE_OFFER / TRADE_CONFIRM packets; `server/src/systems/` new `TradeSystem.ts`; `client/src/ui/` new `TradeMenu.ts`.

---

## [IDEA-12] Volcano Biome
**Complexity:** high
**Category:** content
**Description:** A central volcanic zone with obsidian and sulfur ore nodes that yield rare crafting materials. The biome periodically erupts, spawning lava pools (damaging tiles) for 15 seconds. Players are incentivized to brave the hazard for high-tier crafting ingredients unavailable elsewhere.
**Implementation hint:** `shared/packets.ts` — add VOLCANO to `BiomeType`; `server/src/map/MapGen.ts`; `server/src/core/World.ts` — lava pool entities; `client/src/game/WorldRenderer.ts` — lava tile rendering.

---

## [IDEA-13] Bear Boss Animal
**Complexity:** medium
**Category:** content
**Description:** A rare, large bear spawns once per map in the forest biome. It has 500 HP, deals heavy melee damage in a wide arc, and drops a large amount of meat plus a unique pelt item used to craft a warm fur hat. It respawns every 10 minutes, creating a recurring world event.
**Implementation hint:** `server/src/entities/Animal.ts` — extend with bear-specific AI (charge attack, wide hitbox); `shared/packets.ts` — add BEAR to `EntityType`; `client/src/game/EntityRenderer.ts` — render bear sprite.

---

## [IDEA-14] Spider Enemy — Web Slow Mechanic
**Complexity:** medium
**Category:** content
**Description:** Spiders spawn in forest biome at night. On attack they apply a "webbed" debuff for 3 seconds, reducing the player's movement speed by 60%. Spiders drop thread (useful for hat crafting) making them worth hunting despite the danger. Multiple spiders attacking simultaneously can be lethal.
**Implementation hint:** `server/src/entities/Animal.ts`; new SPIDER `EntityType` in `shared/packets.ts`; `server/src/entities/Player.ts` — status effect system (debuff map + expiry tick).

---

## [IDEA-15] River Zone with Fishing
**Complexity:** high
**Category:** content
**Description:** Rivers carve through the map procedurally. Players can wade into shallow water (slowed 40%) to find rare fish resources but cannot enter deep water without drowning (thirst drains inverted — water floods instead). Fish are a high-value food source encouraging risk-taking near water edges.
**Implementation hint:** `server/src/map/MapGen.ts` — add river generation; `shared/packets.ts` — new RIVER tile; `server/src/systems/SurvivalSystem.ts` — detect player-in-water and apply effects.

---

## [IDEA-16] Workshop Structure — Tier-Gated Crafting
**Complexity:** medium
**Category:** balance
**Description:** High-tier tools (gold axe, gold sword) can only be crafted at a workshop structure, not from the base craft menu. This spatially gates power progression — players must first build a workshop at their base before accessing the strongest gear, adding a meaningful mid-game objective.
**Implementation hint:** `shared/items.ts` — add `requiresWorkshop: boolean` to `ItemDef`; `server/src/systems/CraftSystem.ts` — validate proximity to workshop structure; `shared/items.ts` — add WORKSHOP item.

---

## [IDEA-17] Alliance / Team System
**Complexity:** high
**Category:** social
**Description:** Players can form alliances (up to 4 members) using a chat command. Allied players appear with a green name tag, cannot deal friendly-fire damage, and share a minimap overlay showing ally positions. Alliances dissolve on server restart or when all members die.
**Implementation hint:** `server/src/core/Game.ts` — alliance map; `server/src/systems/CombatSystem.ts` — skip damage between allies; `shared/packets.ts` — add alliance ID to entity update; `client/src/game/EntityRenderer.ts` — green name tags.

---

## [IDEA-18] Spectator Mode
**Complexity:** medium
**Category:** server
**Description:** After dying, players can choose to spectate instead of returning to lobby. A spectator follows a living player (clicking cycles targets) with a read-only view, unable to interact with the world. The death screen gains a "Spectate" button alongside "Respawn".
**Implementation hint:** `server/src/entities/Player.ts` — `isSpectator` flag; `server/src/network/WSServer.ts` — send full world state to spectators; `client/src/ui/DeathScreen.ts` — spectate button; `client/src/game/GameClient.ts` — spectator camera mode.

---

## [IDEA-19] Multiple Lobby Rooms
**Complexity:** medium
**Category:** server
**Description:** The server hosts 2–4 independent game rooms, each with its own world seed and player list (max 50 players per room). The lobby screen shows room occupancy and lets players pick a room. This prevents overcrowding and allows friends to choose the same room.
**Implementation hint:** `server/src/index.ts` — instantiate multiple `Game` instances; `server/src/network/WSServer.ts` — room routing on handshake; `client/src/ui/Lobby.ts` — room selection UI.

---

## [IDEA-20] Territory Control — Flag Capture
**Complexity:** high
**Category:** gameplay
**Description:** Three capturable flags are placed at fixed landmark positions on the map. Standing near a flag for 10 uninterrupted seconds captures it for your team/alliance. Controlling more flags increases XP gain rate for all allied players. Flags reset on server restart, encouraging ongoing PvP conflict over map control.
**Implementation hint:** `server/src/core/World.ts` — Flag entity type; `server/src/core/Game.ts` — capture tick logic; `shared/packets.ts` — FLAG entity type; `client/src/game/WorldRenderer.ts` — flag rendering with owner color.

---

## [IDEA-21] Poison Mushroom Resource
**Complexity:** low
**Category:** content
**Description:** Dark mushrooms spawn in forest biome. Eating one raw applies a poison debuff (lose 2 HP/s for 10 seconds). However, combining mushrooms with gold ore at a workshop yields a poison coating item that can be applied to weapons, adding damage-over-time to hits for 60 seconds.
**Implementation hint:** `shared/items.ts` — add MUSHROOM and POISON_COATING items; `server/src/systems/CombatSystem.ts` — apply DoT on coated weapon hit; `server/src/systems/SurvivalSystem.ts` — poison debuff tick.

---

## [IDEA-22] Dynamic Weather — Snowstorm
**Complexity:** medium
**Category:** gameplay
**Description:** Every 5–10 minutes a random-duration snowstorm hits the snow biome, reducing visibility (client-side fog overlay) and causing temperature to drain 2x faster for all players in the zone. Players must retreat to fires or risk freezing. A weather warning appears in chat 30 seconds before the storm.
**Implementation hint:** `server/src/core/Game.ts` — weather timer; `shared/packets.ts` — new WEATHER packet; `client/src/game/WorldRenderer.ts` — snowflake particle overlay; `client/src/ui/Chat.ts` — broadcast warning message.

---

## [IDEA-23] Chest Structure — Item Storage
**Complexity:** medium
**Category:** content
**Description:** Players can craft and place a chest to store up to 10 item stacks. Only the owner (or allies) can open it. Chests can be destroyed by enemies, dropping their contents. This enables base-building strategies around protecting stored resources and reduces inventory pressure during long sessions.
**Implementation hint:** `shared/items.ts` — add CHEST item; `server/src/entities/Structure.ts` — storage map per chest; `shared/packets.ts` — CHEST_OPEN / CHEST_CONTENTS packets; `client/src/ui/` — new `ChestMenu.ts`.

---

## [IDEA-24] Leaderboard Kill Column
**Complexity:** low
**Category:** ui
**Description:** Add a kills column to the existing top-10 leaderboard panel alongside points. Show both `points` and `kills` for each listed player. This motivates PvP play independently from resource gathering and lets players see who the current most dangerous player is at a glance.
**Implementation hint:** `server/src/entities/Player.ts` — track `kills` counter; `shared/packets.ts` — add kills to `LEADERBOARD` packet; `client/src/ui/Leaderboard.ts` — render kills column.

---

## [IDEA-25] Mammoth Boss — Snow Biome
**Complexity:** medium
**Category:** content
**Description:** A mammoth spawns in the snow biome as a rare world boss (one at a time). It has 800 HP, charges in a straight line dealing massive knockback, and summons a cold aura that rapidly drains temperature for nearby players. Killing it drops a rare ivory material used to craft the best hat in the game.
**Implementation hint:** `server/src/entities/Animal.ts` — mammoth AI with charge state machine; `shared/packets.ts` — add MAMMOTH to `EntityType`; `shared/items.ts` — add IVORY and HAT_MAMMOTH; `client/src/game/EntityRenderer.ts` — mammoth sprite.

---

*Ideas are proposals only — implementation priority is determined by OpenCode in `TODO.md`.*

---

## [IDEA-26] Biome Events: Sandstorm / Blizzard
**Complexity:** medium
**Category:** gameplay
**Description:** Trigger short random biome events every 8–12 minutes: sandstorms in desert (reduced visibility + extra thirst drain) and blizzards in snow (faster temperature drain, slower movement). Events create rotating danger zones and force players to adapt routes and shelter timing.

---

## [IDEA-27] Tribal Totem Buff Structure
**Complexity:** high
**Category:** content
**Description:** Add a late-game craftable totem that gives nearby allies a small passive buff (e.g. +10% gather speed or +5% movement). Totems have high build cost and can be destroyed by enemies, creating strategic PvP objectives around base control.

---

## [IDEA-28] Fishing at Ocean Edge
**Complexity:** medium
**Category:** gameplay
**Description:** Allow players to craft a basic fishing rod and catch fish near ocean tiles. Fish can be eaten raw for low value or cooked for high hunger/thirst restore. This adds a peaceful food path and makes edge biomes more useful than just map borders.
