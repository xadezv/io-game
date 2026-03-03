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

## [IDEA-29] Caravan Events
**Complexity:** medium
**Description:** Neutral NPC caravans periodically cross the map carrying random resources. Players can protect the caravan for shared rewards or ambush it for loot. This creates moving PvP/PvE hotspots.

## [IDEA-30] Reinforced Gate Structure
**Complexity:** medium
**Description:** Add a placeable gate that can be opened by owner/allies and damaged by enemies. Gives base builders controlled entry points and more tactical defense than simple wall spam.

## [IDEA-31] Echo Compass
**Complexity:** low
**Description:** Craftable utility item that pings nearest high-value target (gold node, mammoth, or enemy player) with a cooldown. Helps solo players navigate objectives without opening full-map intel.

## New Ideas (2026-03-02)

### 1) Sandstorm Event
- **Description:** Periodic desert-wide sandstorms reduce visibility, increase thirst drain, and reveal rare buried loot nodes after storm ends.
- **Complexity:** medium

### 2) Totem Buff Structures
- **Description:** Craftable tribal totems that grant a small aura bonus (movement speed, gathering speed, or temperature resistance) to nearby allies.
- **Complexity:** medium

### 3) River Fishing + Cooking Loop
- **Description:** Add fish resources in water edges, simple fishing rod crafting, and campfire recipes for fish-based hunger/thirst restoration.
- **Complexity:** low

### 4) Dynamic Boss Migration
- **Description:** World bosses (like mammoth variants) migrate between biomes over time, creating PvP hotspots and temporary objective markers.
- **Complexity:** high

### 5) Caravan NPC Trader
- **Description:** Neutral caravan appears at random intervals and exchanges surplus materials for rare crafting components and cosmetic hats.
- **Complexity:** medium

## IDEA-26 — Biome Contracts
**Description:** NPC boards in biomes give rotating mini-quests (gather, hunt, survive night) for XP and cosmetics.
**Complexity:** medium

## IDEA-27 — Caravan Event
**Description:** Periodic neutral caravan crosses map; players can protect it for rewards or raid it for risky loot.
**Complexity:** high

## IDEA-28 — Fishing Holes
**Description:** Add water-edge fishing with simple timing minigame and biome-specific fish buffs.
**Complexity:** medium

## New Ideas (2026-03-02)

### 1) Tracking Totem
- **Description:** Placeable totem that periodically pings direction/distance to the nearest hostile player within a limited radius.
- **Complexity:** medium

### 2) Meteor Shower Event
- **Description:** Rare world event where small meteors impact random zones, creating temporary fire patches and dropping rare ore.
- **Complexity:** high

### 3) Water Skin Item
- **Description:** Craftable consumable container that stores 2-3 thirst uses, useful in desert travel and long fights.
- **Complexity:** low

### 4) Decoy Dummy Structure
- **Description:** Buildable dummy that attracts wolves/spiders for a short duration, enabling escape or trap setups.
- **Complexity:** medium

### 5) Biome Relic Hunts
- **Description:** Hidden relic spawns once per cycle in each biome; delivering relics to campfire grants teamwide buffs.
- **Complexity:** high

## Fresh ideas from 2026-03-02 run

- Dynamic biome events: desert mirage that temporarily hides minimap entity dots outside 300px.
- Ritual totem structure: team-claimable buff zone that grants +10% gather speed nearby.
- Fishing at ocean edge: simple timing minigame yielding food and rare crafting mats.
- Broken cart world prop: repair with wood/stone to unlock periodic shared resource drops.
- Night owl perk hat: improves vision radius at night but slightly increases daytime thirst drain.

---

## [IDEA-26] Blood Moon world event
**Complexity:** medium
**Category:** gameplay
**Description:** During rare nights, a Blood Moon increases hostile mob speed and aggro range, but doubles rare drop chances. Players get a high-risk, high-reward event to prepare for.

## [IDEA-27] Fishing system on ocean edges
**Complexity:** medium
**Category:** content
**Description:** Add a craftable fishing rod and fish catches by biome/time. Fish can be cooked for strong hunger and thirst recovery, creating a calmer alternative progression path.

## [IDEA-28] Totem of Recall
**Complexity:** medium
**Category:** progression
**Description:** Placeable totem that stores one respawn location with limited charges and cooldown. Encourages exploration while preserving meaningful death penalties.

## Fresh gameplay ideas (2026-03-02)

- **Fog of War Totems:** buildable totems reveal minimap vision in a radius; enemy players can destroy them.
- **Seasonal Migration Events:** herds move between biomes every in-game day and create temporary resource hotspots.
- **Ritual Circle PvP Zones:** short timed zones with boosted XP/loot that attract player conflicts.
- **River Fishing System:** craft rods/nets, fish schools spawn at dawn/dusk, fish can be cooked or traded.
- **Camp Upgrades Tree:** campfire can be upgraded into kitchen/smithy/medical tent branches with different bonuses.
- **Biome Relics:** rare relics grant passive effects but broadcast holder position periodically.
- **Treasure Map Fragments:** combine map pieces from events/mobs to reveal buried loot coordinates.
- **Companion Raven:** craftable scout pet that marks nearby threats/resources on minimap on cooldown.

### IDEA-26 — Seasonal migration events
Every 15–20 minutes, temporary migration waves cross the map (deer-like passive mobs, scavenger packs, trader caravan NPC). Players can hunt, escort, or raid for different rewards.

### IDEA-27 — Biome relic shrines
Add rare shrines per biome that can be activated with offerings (wood/stone/gold/thread) for timed buffs (warmth aura, gather speed, crit chance).

### IDEA-28 — Dynamic footprint tracking
Players and large animals leave temporary footprints that fade over 30–60 seconds. Useful for tracking enemies and prey, especially at night or during snowstorms.

### IDEA-29 — Camp upgrade tiers
Allow CAMPFIRE and WORKSHOP upgrades (tier I/II/III) that improve radius, crafting speed, and efficiency. Encourages base progression without adding many new structures.

### IDEA-30 — World event: eclipse night
Rare longer night event with stronger mobs and boosted drops/XP. Server announces countdown, and players can prepare defenses for high-risk/high-reward sessions.

## Fresh gameplay ideas (2026-03-02, late run)

- **Poison Swamp Micro-biome:** tiny toxic patches between forest/plains with unique herbs, slow movement, and periodic gas bursts.
- **Portable Bedroll:** consumable structure that grants one safe logout/respawn anchor but can be looted if discovered.
- **Beast Tracker Lens:** craftable utility item that highlights nearby elite creatures for a few seconds on use.
- **Clan Banner Buffs:** placeable banner gives minor aura buffs to nearby allies but reveals base position on minimap.
- **Meteor Ore Showers:** rare falling-star events spawn contested high-tier ore nodes with timed despawn.

## New ideas (2026-03-02 cron)
- Dynamic biome events: desert heatwave and forest fog with temporary stat modifiers
- Tamed pet companion from rescued rabbit that gathers berries passively
- World relic shrines that grant team-wide buffs when activated
- Fishing spots in lake/ocean edges with rare food + crafting materials
- Traveling trader NPC that appears at dusk with rotating item deals

## Fresh ideas (2026-03-02 cron run)
- Dynamic eclipse event: short global darkness with boosted rare mob spawns and unique drops.
- Biome relic shrines: capture-and-hold structures granting small team buffs (warmth, regen, mining speed).
- Caravan NPCs: neutral traders that roam map edges and offer rotating barter deals.
- River fishing mini-system: craft rod, fish at water edges, cook for buffs.
- Seasonal migration: herds move between biomes by time of day, changing risk/reward routes.

## Fresh Ideas (2026-03-02 nightly)

- Dynamic biome events: heatwave in desert / blizzard in snow that temporarily changes resource yields.
- Hunter contracts: rotating mini-quests ("hunt 3 wolves", "collect 20 wood") with XP + cosmetic rewards.
- Camp upgrades: evolve campfire into bonfire with aura buffs and larger warmth radius.
- Traveling trader NPC: appears at random edge each day cycle, swaps rare crafting mats.
- Territory totems: small buildable objectives that grant nearby team buffs if defended.
- Echo caves: hidden underground pocket zones with high-risk mobs and rare drops.
- Fishing system near ocean tiles with biome-specific fish and cooking recipes.
- Seasonal world seeds: weekly modifiers (double animals, scarce berries, longer nights).

## Fresh Gameplay Ideas (2026-03-02)

- **Heatwave Event (Desert-only):** Short daytime events that increase thirst drain and reduce visibility with shimmer. Encourages temporary migration and campfire/water prep.
- **Hunter Contract Board:** A craftable board that periodically gives mini-objectives (e.g., kill 3 wolves, gather 30 wood) for XP/points rewards.
- **Caravan Drops:** Neutral AI caravans cross the map edge-to-edge carrying loot crates; players can protect or raid them for rewards.
- **Biome Relics:** Rare relic nodes in each biome that grant a passive buff while carried (e.g., +temp resist, +gather speed) but reveal holder on minimap.
- **Fog-of-War Totems:** Placeable totems that clear minimap fog in a radius for your team/clan, creating map-control gameplay.
- **Blood Moon Night:** Rare night modifier where aggressive mobs spawn more often and yield bonus XP/drops.
- **Traps 2.0:** Craftable snare/net traps that immobilize animals/players briefly; visible if close enough.
- **Portable Water Skin:** Craftable consumable container that restores thirst over time and helps survive long desert runs.
- **Seasonal Biome Shift:** Every in-game hour, biome borders subtly shift, forcing adaptation and repositioning.
- **World Event Boss Beacon:** Random beacon appears; first players to activate it spawn a boss encounter with shared loot table.

## Cron Gameplay Ideas (2026-03-02 23:11 UTC)
- **Campfire Cooking Queue:** Let campfires cook multiple raw meats over time with a visible progress queue to reduce repetitive interaction spam.
- **Predator Scent Trails:** Injured animals leave temporary tracks that players can follow, improving hunting gameplay and map awareness.
- **Storm Shelter Bonus:** Staying near walls + fire during storms grants minor regen/temperature resistance, rewarding base prep before night events.
- **Resource Hotspots:** Short-lived map pings mark rich gathering zones, creating PvP skirmishes over contested nodes.
- **Crafting Mastery:** Repeated crafting of the same recipe grants tiny efficiency perks (faster craft or small material refund cap).

## Cron Gameplay Ideas (2026-03-02 23:21 UTC)
- **Signal Fires:** Build ridge beacons that allies can light for temporary map-wide pings and warmth trails at night.
- **Foraging Satchel:** Craftable utility bag that auto-collects nearby berries/mushrooms while moving, with limited charges.
- **Pack Alpha Hunts:** Rare elite wolf alpha spawns that buffs nearby wolves until defeated, dropping unique crafting tokens.
- **Broken Ruins POIs:** Small ruined camps with randomized loot + environmental hazards to create roaming objectives.
- **Duel Totem:** Optional 1v1 challenge structure that grants bonus XP to winner and temporary safe duel arena rules.

## Additional Ideas (2026-03-02 cron)

- Dynamic fog-of-war scouts: craftable flare that reveals minimap area for 20s.
- Biome events: desert sandstorm that reduces visibility and drains extra thirst outside shelter.
- Clan totems: placeable structure giving small regen aura to nearby clanmates.
- Tracking footprints: temporary trails for recently moved players/animals (counterplay for stealth).
- Seasonal world modifier voting in lobby (e.g. long night, rich resources, hardcore hunger).

## Extra ideas — 2026-03-02 (cron run)

26. **Seasonal migration events** *(Medium)*  
   Every 12–15 minutes, herds (rabbits/wolves) migrate between biomes, temporarily changing local resource pressure and danger zones.

27. **Craftable map pings** *(Low)*  
   Add a consumable flare that places a temporary minimap ping visible to nearby allies for 20 seconds.

28. **Biome relic shrines** *(High)*  
   Rare shrine structures spawn per biome and grant a short regional buff when activated (e.g., snow = cold resistance, desert = thirst resistance).

29. **Tool special attacks** *(Medium)*  
   Gold tools gain a cooldown-based active ability (axe cleave, pick armor break, sword dash) to deepen combat choices.

30. **Dynamic wildlife nesting** *(Medium)*  
   Animals create temporary nests/dens; destroying them reduces local spawns, preserving them increases long-term population around that biome.

## IDEA-26 — Biome world events (Complexity: M)
Random biome-specific events every 6–10 minutes (sand gust in desert, blizzard pulse in snow, dense fog in forest) that temporarily change visibility or stat drain, with short global warnings.

## IDEA-27 — Hunter contracts board (Complexity: M)
Add a craftable board where players can accept rotating PvE contracts (e.g., hunt 3 wolves, gather 20 berries) for XP and resource rewards; contracts refresh every few minutes.

## IDEA-28 — Structure decay + repair hammer (Complexity: S)
Unmaintained player structures slowly decay over time; introduce a repair hammer item that restores structure HP using wood/stone, encouraging base upkeep.

## IDEA-29 — Fishing at biome water edges (Complexity: M)
Allow players to craft a fishing rod and fish at ocean/lake borders for food and rare drops; night fishing has higher rare chance but increased danger.

## IDEA-30 — Seasonal server mutators (Complexity: L)
Server can enable weekly mutators (e.g., Double Night, Cold Front, Rich Veins) that alter balance and spawn tables, shown in lobby before join.

## Extra ideas — 2026-03-03 (cron run)

31. **Camp raids (PvE waves)** *(Complexity: M)*  
   When a player keeps a campfire lit for too long, periodic hostile waves spawn nearby, creating risk/reward for staying in one place.

32. **Biome mastery perks** *(Complexity: M)*  
   Track time survived per biome and unlock minor passive perks (e.g., slower thirst drain in desert, better warmth retention in snow).

33. **Trap variants with status effects** *(Complexity: S)*  
   Add upgraded spikes (bleed spike, frost spike) that apply short debuffs and open more base-defense strategies.

34. **Caravan loot event** *(Complexity: L)*  
   A guarded NPC caravan crosses the map on a schedule; players can escort for rewards or ambush for high-risk loot.

35. **Crafting queue at structures** *(Complexity: M)*  
   Workshop/furnace can queue 2–3 jobs with progress bars, reducing repetitive interaction spam in mid/late game.

## New Ideas (2026-03-03)

- **Blizzard Totem Structure**: placeable totem that creates a small warm zone in snow biome but attracts wolves at night.
- **Fishing System**: craft fishing rod, fish at ocean edge for food and rare loot; different fish by time of day.
- **Seasonal World Events**: periodic meteor shower that drops temporary high-value resource nodes in random biomes.
- **Tribe Banner Buff**: build a banner that grants minor regen/speed bonus to nearby tribe members.
- **Poison Antidote Craft**: brew antidote from berries + mushroom to clear poison/web effects instantly.

## Gameplay ideas (2026-03-03)
- Dynamic world events: roaming merchant caravan that appears randomly and trades rare resources for limited time.
- Biome relics: hidden shrines in each biome that grant temporary buffs when activated.
- Clan totems: placeable structure that grants small aura buffs to nearby allies and can be raided.
- Seasonal fish system: ponds/ocean edges yield different catches by day/night affecting hunger and buffs.
- Fog-of-war map fragments: exploration reveals permanent minimap fragments that can be traded.

## Gameplay ideas (2026-03-03, batch 2)
- **Nomad camp event:** temporary neutral camp spawns with craftable-only recipes and disappears after 5 minutes.
- **Heatstroke mechanic:** during desert noon, stamina regen slows unless player is near shade or has water flask.
- **Echo caves biome pocket:** rare underground entrances with dense ore and spider nests, high risk/high reward.
- **Tameable rabbit scout:** feed berries to a rabbit to briefly reveal nearby predators/resources on minimap.
- **Storm lantern item:** consumable that halves weather penalties for 90 seconds and lights a wider vision radius.

## Gameplay ideas (2026-03-03, batch 3)
- **Ruin dungeons:** small instanced ruins with timed puzzle-combat rooms and a chest at the end.
- **Campfire cooking buffs:** specific cooked meals grant short buffs (cold resist, move speed, bonus gather yield).
- **Night owl set bonus:** wearing a full hat/gear combo grants vision boost and reduced aggro at night.
- **Resource overharvest system:** frequently farmed zones temporarily deplete, nudging players to rotate territories.
- **Bounty board contracts:** optional server-generated hunts (kill X wolves, gather Y gold) for XP and cosmetic rewards.

## Gameplay ideas (2026-03-03, batch 4)
- **Aurora night bonus:** during rare aurora nights, snow biome grants bonus XP but spawns stronger predators.
- **Portable drying rack:** deployable utility that slowly converts raw meat to jerky without needing a furnace.
- **Territory claim stones:** optional PvP structure that grants minor defense buffs near home base but reveals location on minimap.
- **Herbalism kit:** gather biome plants to craft temporary resistance potions (cold, heat, poison).
- **World boss rotation:** one biome boss is "empowered" each hour with unique drops and global announcement.

## Gameplay ideas (2026-03-03, batch 5)
- **River biome strips:** narrow rivers that slow movement, enable fishing spots, and act as natural PvP chokepoints.
- **Tracking footprints:** temporary footprints in snow/sand reveal recent player movement for hunting/ambush play.
- **Forge heat tiers:** furnaces gain speed when fueled continuously, encouraging defended production hubs.
- **Totem corruption event:** cursed totems periodically spawn mobs until destroyed, rewarding nearby participants.
- **Rescue downed teammate:** short downed state in team modes where allies can revive before full death.

## Fresh ideas (2026-03-03)

- **Meteor Shower Event (night-only):** Random meteor impacts create temporary fire zones and rare ore nodes for 60 seconds, forcing short risk/reward fights.
- **Tracking Footprints:** Moving entities leave short-lived biome-dependent footprints (snow/sand/mud) that players can follow for ambushes.
- **Totem of Return:** Craftable structure that sets a one-time respawn anchor with long cooldown and visible map marker to encourage raiding.
- **Fishing System:** Lakes/ocean edges allow fishing mini-loot table (food, junk, rare treasure map fragments).
- **Fog of War Camps:** Unclaimed mini-camps with AI guards spawn around the map and reward materials if captured.

## Idea Drop — 2026-03-03

- Dynamic footprints: leave temporary footprints in snow/sand that fade and can be tracked by players.
- Biome events: desert heatwave and forest fog cycles with temporary visibility/survival modifiers.
- Totem system: placeable tribe totems that grant small aura buffs and can be contested in PvP.
- Fishing spots: ocean-edge nodes with a timing minigame for food and rare crafting materials.
- Craft queue at structures: furnace/workshop process multiple queued recipes with visible progress.
- Seasonal world seeds: weekly rotating seed modifiers (double berries, harsher nights, richer caves).
- Simple quests from campfire: short survival objectives granting XP and cosmetic rewards.
- Taming system lite: feed rabbits/wolves special bait to gain short-lived companion bonuses.

## Additional gameplay ideas (2026-03-03)

26. **Fog of war towers** (Medium) — Build watchtowers that permanently reveal a circular area on the minimap for your team.
27. **Seasonal migration events** (Medium) — Every few in-game days, herds cross the map and can be hunted/guarded for rewards.
28. **Ritual totems** (High) — Placeable totems that grant area buffs (warmth, speed, regen) but can be destroyed by enemies.
29. **Tracking footprints** (Low) — Recent player/animal paths leave fading footprints in snow/desert to support hunting and PvP ambushes.
30. **Biome relic dungeons** (High) — Rare instanced mini-arenas with a timed boss challenge and unique cosmetic drops.

## Gameplay ideas (2026-03-03, batch 6)
- **Storm shelters:** small buildable shelter that reduces snowstorm and heatwave penalties for nearby players.
- **Beast trails:** periodic animal migration lanes with higher spawn density and rare predator ambush chances.
- **Salvage pits:** diggable debris nodes that yield random mixed resources with a chance for traps.
- **Signal flare item:** consumable that reveals your position but grants short global loot radar to your team.
- **Ruined outposts:** procedurally spawned micro-POIs with breakable containers, light AI defense, and map flavor lore.

---

## Fresh Gameplay Ideas (2026-03-03)

- **Blood Moon Event:** once per night cycle there is a small chance of a blood moon that increases hostile mob spawn rate and grants +25% XP for all kills until dawn.
- **Fishing System:** craft a fishing rod, fish in ocean-edge tiles, and cook or trade rare fish for buffs.
- **Biome Relics:** each biome has a rare relic drop; collecting all relics grants a temporary global passive bonus.
- **Tribal Totems:** place a team totem that gives nearby allies minor regen/temperature resistance, but can be raided.
- **Footprint Tracking:** players and animals leave short-lived tracks in snow/sand to support hunting and ambush gameplay.
- **Season Rotation:** every 30 real minutes, world shifts season (dry, rainy, frost) and resource yields + survival pressure adjust.
- **Rift Crystals:** periodic map objective that spawns contested crystal nodes; holding a crystal slowly grants score but reveals holder on minimap.
- **Companion Pet (non-combat):** tame a rabbit/fox companion that auto-loots nearby drops with small carry limit.

## Fresh ideas (2026-03-03)

- **Migrating sandstorms (desert event):** a moving hazard band crosses the desert for 60–90s, reducing vision range and applying minor thirst drain; players can hide behind walls/rocks to reduce effect.
- **Totem of Recall:** craftable single-use structure that lets a player set a temporary bind point and respawn there once (with heavy score penalty) if they die within 5 minutes.
- **Beekeeper ecosystem:** wild hives in forest; harvesting grants honey (food + poison resistance) but may spawn angry bees that chase nearby players.
- **Seasonal world seed modifiers:** every server restart can roll a “season” (drought, long night, fertile forest) that tweaks spawn/decay values and changes meta without code changes.
- **Trade caravan NPC:** periodically spawns at map edge and slowly moves across biomes; players can exchange surplus resources for rare crafting components.
- **Capture campfires mode:** neutral campfires scattered around map grant periodic points to the nearest team/player controlling the zone.
- **Tracking footprints:** temporary ground decals showing recent movement direction in snow/desert tiles to support hunting and ambush gameplay.
- **Tool mastery perks:** repeated use of a tool class unlocks tiny passive bonuses (e.g., +5% wood yield for axe mastery), reset on death for roguelite progression.

## Gameplay ideas (2026-03-03)

- Dynamic world events: meteor showers that spawn rare ore hotspots for 3 minutes.
- Seasonal migration: herds move between biomes daily, creating temporary hunting routes.
- Totem buffs: placeable team totems grant nearby passive bonuses but can be raided.
- Poison biome pockets: brief hazard zones with unique antidote crafting loop.
- Contract board: rotating PvE/PvP mini-objectives for bonus XP and cosmetic rewards.

## Gameplay ideas (2026-03-03, cron batch)

- **Heatwave event:** daytime desert heatwave lowers vision shimmer and doubles thirst drain for 90 seconds, with oasis tiles granting temporary resistance.
- **Portable bedroll:** one-time craftable that lets a player set a safer respawn point for a short duration, then burns out.
- **Bandit camp raid:** roaming PvE camp appears with guards and a loot chest; clearing it grants team-wide score bonus.
- **Resource quality tiers:** occasional "rich" trees/ores spawn with distinct tint and yield +50% materials.
- **Hunter marks:** landing consecutive hits on the same target applies a brief tracking mark visible on minimap to nearby allies.

## New gameplay ideas (2026-03-03)
- Dynamic fog-of-war bursts: temporary map darkening events that force players to rely on minimap pings and campfires.
- Caravan event: neutral merchant cart spawns and travels biome-to-biome; players can trade resources for rare utility items.
- Biome mastery perks: survive X minutes in a biome to unlock a passive bonus (e.g., snow cold resistance, desert thirst efficiency).
- Totem capture points: small world objectives that grant nearby teamless aura buffs to whoever controls them.
- Echo footprints: high-speed movement leaves short-lived tracks visible to nearby players for tracking and counterplay.

## Gameplay ideas (2026-03-03, cron run 03:51 UTC)

- **Night lantern item:** portable light cone at night that slightly increases visibility but makes the holder easier to spot by enemies.
- **River fishing spots:** interactable water-edge nodes with timed mini-loot (food, junk, rare pearls for crafting).
- **Storm shelters:** craftable temporary lean-to that halves weather penalties for players inside a small radius.
- **Bounty ping system:** top leaderboard player periodically gets a minimap ping for others, increasing PvP pressure.
- **Animal den mechanic:** wolves/rabbits spawn from den structures that can be destroyed for temporary biome control.

## IDEA-29 — Dynamic biome events
- Random short-lived biome events (heat wave in desert, berry bloom in forest, blizzard in snow).
- Each event modifies one survival stat drain and one resource spawn rate for 2–4 minutes.
- Broadcast event start/end in chat and render a subtle HUD icon.

## IDEA-30 — Tracking footprints
- Players and large animals leave temporary footprints on matching terrain.
- Footprints fade after ~20s; snow footprints last longer than plains.
- Can be used to track recent enemy movement and encourage scouting.

## IDEA-31 — Totem buff structures
- Craftable totems grant small aura buffs (warmth, faster gathering, minor speed).
- Totems have upkeep fuel cost so they are strategic, not permanent power spikes.
- Enemy players can destroy totems to break local control.

## Extra Gameplay Ideas (2026-03-03)

- **Blood Moon event:** once every few nights, stronger hostile mobs spawn and players gain +25% XP for all kills during the event.
- **Fishing system:** craft a fishing rod, fish at ocean/river edges for food and rare crafting drops.
- **Clan totems:** placeable clan structure that grants small regen/temperature aura to nearby clan members.
- **Treasure map drops:** elite mobs can drop map fragments; combining fragments reveals a buried chest location.
- **Seasonal world modifiers:** rotating weekly modifiers (e.g., "Harsh Winter", "Abundant Berries", "Aggressive Wildlife").

## Extra ideas (2026-03-03)

- **Blizzard Beacons:** craftable beacon that creates a small warm zone during snowstorms but attracts nearby predators.
- **River Fishing:** add fish nodes in water-edge tiles; simple timing mini-game rewards food and rare crafting materials.
- **Totem Buffs:** tribe totems that provide regional buffs (faster gather, cold resistance) while fueled by resources.
- **World Events:** meteor shower/night comet event spawning temporary rare ore clusters with PvP hotspots.
- **Animal Taming:** feed rabbits/wolves to temporarily tame them as scouts/guards with limited lifetime.
- **Bandit Camps (PvE):** periodic hostile NPC camp spawns with loot chest and escalating difficulty over in-game days.
- **Craft Queue:** optional 2-slot craft queue unlocked by workshop upgrade to reduce menu micromanagement.
- **Biome Relics:** hidden relics per biome that unlock passive account-style cosmetics and emotes.

## Extra ideas (2026-03-03, run 2)

- **Fog of War Camps:** unexplored map chunks remain dark on minimap until discovered; campfires slowly reveal nearby fog for teammates.
- **Heatstroke Meter:** staying in desert at noon without water/hat builds heatstroke stacks causing aim wobble and thirst spikes.
- **Hunter Trails:** wounded animals leave short-lived blood tracks, making tracking/hunting a skill play.
- **Portable Bedroll:** one-time deployable respawn point with decay timer; destroyed if enemy stands near for 5 seconds.
- **Caravan Event:** neutral merchant caravan crosses map twice per day cycle; escort/ambush opportunities with dynamic loot.
- **Trap Toolkit:** craftable rope/net traps that briefly root players/animals, with visible counterplay and break-on-damage behavior.

## Auto Ideas Batch — 2026-03-03

- Dynamic world events: migrating herds that temporarily change predator/prey density in nearby biomes.
- Totem buffs: placeable tribal totems granting small area buffs (gather speed, warmth, stamina regen) with clear counterplay.
- Ruins points-of-interest: rare mini-dungeons with timed PvE waves and guaranteed high-tier crafting materials.
- Seasonal crop system: biome-dependent farming patches that rotate yields by in-game season/day cycle.
- Caravan NPC encounters: neutral traders that appear on map edges and move across world, enabling risk/reward trade routes.

## Extra ideas (2026-03-03, run 3)

- **Underground Caverns:** rare sinkhole entrances lead to small instanced cave pockets with high ore density and low visibility.
- **Weatherproof Clothing Set Bonuses:** wearing matched biome gear pieces grants bonus effects (e.g., reduced thirst drain in desert).
- **Signal Fire Pings:** upgraded campfire can send a short minimap ping visible to allies, enabling lightweight team coordination.
- **Beast Migration Seasons:** certain animals migrate between biomes by time-of-day, creating moving hunting hotspots.
- **Relic Curses:** powerful relic pickups give strong buffs but apply drawbacks (slower healing, louder footsteps) until cleansed.

## Additional Ideas — 2026-03-03

26. **Biome Events: Sandstorm in desert** *(Complexity: Medium)*  
   Random desert-only storm that reduces visibility and slightly pushes players with wind direction.

27. **Tracking Footprints** *(Complexity: Medium)*  
   Players and large animals leave short-lived footprints; useful for hunting and PvP tracking.

28. **Totem Buff Structure** *(Complexity: High)*  
   Placeable totem gives nearby allies minor buffs (gather speed / cold resistance), creating team hotspots.

29. **Fishing at Water Edge** *(Complexity: Medium)*  
   Craft fishing rod, stand near ocean tiles to catch food/resources with timing mini-game.

30. **Seasonal World Rotation** *(Complexity: High)*  
   Server rotates seasonal modifiers every real day (e.g., long nights, rich forests, harsh cold) to vary meta.


## IDEA-26 — Seasonal migration events
**Complexity:** Medium

Every 12 in-game minutes, trigger a migration wave (e.g., rabbit herds in plains, wolves crossing forest edge). Players can track and hunt the wave for bonus loot and XP while risking PvP ambushes around predictable routes.

---

## IDEA-27 — Craftable map markers and shared pings
**Complexity:** Low

Allow players to place temporary map pings visible to nearby teammates (or party members when parties exist). Useful for coordinating resources, danger zones, and rally points without adding voice chat dependency.

---

## IDEA-28 — Biome relics and passive buffs
**Complexity:** Medium

Rare relic nodes spawn per biome (snow charm, desert idol, forest totem). Carrying a relic grants a small passive buff (temperature resist, thirst reduction, gather speed), but marks the carrier with a minimap pulse that attracts enemies.

---

## IDEA-29 — Dynamic trader caravan
**Complexity:** Medium

A neutral caravan periodically traverses the map edge-to-edge. Players can trade excess resources for rotating goods (food bundles, thread, hats). Caravans can be attacked for loot, turning them into moving PvP hotspots.

---

## IDEA-30 — Ruins micro-dungeons
**Complexity:** High

Add small ruin zones with dense resources, traps, and elite mobs. Entering ruins gives high-reward runs (gold/thread/pelts) but limited exits and high player collision density, encouraging risk-reward decision making.

## Additional Gameplay Ideas — 2026-03-03

- **Dynamic world events: Meteor Shower**  
  Rare nighttime event where small meteorites land in random biomes, creating temporary high-value mining nodes (gold/thread/rare drops) but spawning aggressive mobs nearby.

- **Clan Totem Structure**  
  Placeable team structure that grants a small aura buff (e.g., +5% gather speed) to nearby allied players and can be contested/destroyed in PvP.

- **Seasonal Migration Herds**  
  Neutral animal herds periodically traverse the map; players can hunt or protect them for different rewards and reputation-style bonuses.

- **Biome Relics & Passive Perks**  
  Hidden relic pickups in each biome that grant one passive bonus (cold resistance, thirst reduction, faster crafting) until death.

- **Risk Zones (High-Loot Circles)**  
  Temporary marked areas with boosted resource yields and chest spawns that attract players and increase PvP tension.

- **Companion Pet (Non-combat)**  
  Craftable pet that follows the player and performs utility actions (auto-pick nearby dropped items, minor warning pings when enemies approach).

- **Cooking Depth: Stews & Buff Foods**  
  Extend food system with multi-ingredient meals that grant short buffs (regen, speed, cold resist), encouraging resource diversity.

- **Fog-of-War Scout Tower**  
  Buildable structure revealing a wider minimap radius and tracking nearby enemy movement pulses every few seconds.

- **World Quests / Daily Contracts**  
  Rotating objectives (gather, hunt, survive night, craft tier item) that reward XP, cosmetics, or utility materials.

- **Raft & Coastal Exploration**  
  Limited-use raft for shallow ocean traversal to reach tiny offshore islands with unique resources and miniboss encounters.

## Additional Gameplay Ideas — 2026-03-03 (run 2)

- **Heatstroke Debuff in Desert**  
  During extreme daytime heat, players without headgear slowly accumulate heatstroke stacks that reduce accuracy and vision range until cooled.

- **Portable Bedroll Respawn Point**  
  Craftable consumable to set a one-time respawn location; destroyed on use to prevent permanent safe spawn abuse.

- **Resource Bloom Cycles**  
  Biomes enter short "bloom" states (berry bloom, stone surge, thread-rich snow) that shift farming routes and map traffic.

- **Hunter Trails System**  
  Injured animals leave temporary tracks visible on nearby ground, letting skilled players track prey through forests/snow.

- **Storm Lantern Utility Item**  
  Equipable lantern that improves visibility during night/weather events and slightly slows nearby temperature loss.

## Additional Ideas (2026-03-03)

- Dynamic biome events: desert heatwaves and forest fog that temporarily change visibility and survival drain.
- Ritual totem structure: players can spend rare resources to summon a world event boss for server-wide cooperation/competition.
- Caravan NPC traders: periodic neutral NPCs appear at map edges to exchange surplus materials for unique utility items.
- Territory banners: placeable structures that grant minor buffs in a radius when defended by tribe members.
- Seasonal relic drops: low-chance drops from elite mobs that unlock temporary passive effects (e.g., faster gather speed).


---

## New ideas (2026-03-03)

- **Blizzard camp event:** temporary campfires spawn in snow during storms; first team to hold area for 60s gets loot crates.
- **Tracking footprints:** players and large animals leave short-lived biome-specific footprints; enables hunting and ambush gameplay.
- **Totem buffs:** placeable tribe totems grant small aura bonuses (gather speed, warmth, move speed) with diminishing returns when stacked.
- **Fishing spots:** ocean-edge nodes that can be harvested with crafted fishing spear for hydration-rich food.
- **Raider NPC caravan:** periodic neutral caravan that can be traded with or attacked for rare materials, affecting reputation.
- **Biome contracts:** rotating objectives (e.g., "hunt 3 wolves", "deliver 20 wood") granting XP and cosmetic unlock tokens.
- **Fog-of-war minimap memory:** explored map stays faintly visible; unexplored regions remain dark, encouraging scouting roles.

## New ideas (2026-03-03)

- **Migrating trader caravan event:** once per day cycle, an NPC caravan crosses the map edge-to-edge, offering limited-time trades (gold/resources for rare utility items). Adds moving objective and PvP hotspots.
- **Biome relic shrines:** each biome has a capturable shrine that grants localized buffs (snow: cold resist, desert: thirst resist, forest: gather speed). Ownership rotates via contesting radius.
- **Fishing + river nodes:** add fishable spots on water edges with a simple timing mini-game; fish can be cooked or used in new crafting recipes.
- **Fog-of-war scouting towers:** buildable towers reveal minimap activity in a radius for your team/clan and ping hostile movement.
- **Seasonal world modifiers:** every real-time week rotates a global rule (e.g., "long nights", "double berry growth", "aggressive fauna") to keep runs fresh.
- **Totem revival mechanic:** craft/place a fragile totem that stores a one-time delayed respawn nearby if destroyed player reaches it in time.
- **Supply drop meteor:** random visible sky marker lands with high-tier loot but spawns elite mobs around impact zone.
- **Track footprints system:** recent movement leaves temporary footprints in snow/sand, enabling hunting/tracking gameplay.

---

## [IDEA-26] Biome Relics and Temporary Global Buffs
**Complexity:** medium
**Category:** gameplay
**Description:** Add rare relic objects that spawn once per biome (forest totem, desert obelisk, snow crystal). Interacting with a relic starts a short capture channel; on success, all nearby teammates get a 3-minute buff themed to that biome (e.g. +gather speed in forest, slower thirst drain in desert, cold resistance in snow). Relics then go on cooldown before relocating. This creates rotating map objectives and dynamic PvP hotspots.
**Implementation hint:** `server/src/core/World.ts` for relic spawn/cooldown state, `server/src/core/Game.ts` for timed buffs, `client/src/game/WorldRenderer.ts` for relic markers/effects.

---

## [IDEA-27] Dynamic Footprints and Tracking
**Complexity:** medium
**Category:** immersion
**Description:** Players and animals leave temporary footprints (or trails) that persist longer at night and in snow biomes. Trails gradually fade and can be followed to find prey, enemies, or recent fight locations. Rain/snowstorm can erase tracks faster. This adds scouting gameplay and improves world atmosphere.
**Implementation hint:** client-side render trail decals in `client/src/game/ParticleSystem.ts`/`WorldRenderer.ts`; optional server broadcast for important tracks if anti-cheat visibility rules are needed.

---

## [IDEA-28] Craft Queue with Campfire Utility Slots
**Complexity:** low
**Category:** quality-of-life
**Description:** Let players queue up to 3 craft actions and let campfires process one utility action in parallel (e.g. drying thread or warming meal). Queue executes over time with clear progress UI; interrupted if inventory requirements are no longer met. This reduces repetitive clicking while adding mild base-management depth.
**Implementation hint:** extend `server/src/systems/CraftSystem.ts` with per-player queue state; UI queue panel in `client/src/ui/CraftMenu.ts`; reuse existing tick loop for progress updates.

---

## [IDEA-29] Heatstroke + Shade Gameplay in Desert
**Complexity:** medium
**Category:** survival
**Description:** During peak daytime in desert biome, players accumulate heatstroke if they stay in direct sun too long. Standing near cacti, structures, or crafted shade tents slows/pauses buildup. At high heatstroke, vision blurs slightly and stamina/move speed penalties apply until cooled.
**Implementation hint:** add heatstroke meter in `server/src/systems/SurvivalSystem.ts`; biome/time checks in `server/src/core/Game.ts`; overlay effect in `client/src/game/GameClient.ts`.

---

## [IDEA-30] Animal Territory System
**Complexity:** medium
**Category:** AI
**Description:** Predators claim soft territories and become more aggressive when players gather/fight inside them. Territory borders shift over time based on spawns and deaths, creating dynamic danger zones instead of static behavior.
**Implementation hint:** maintain territory clusters in `server/src/core/World.ts`; apply aggro multipliers in `server/src/entities/Animal.ts`; optional minimap warning tint in `client/src/ui/Minimap.ts`.

---

## [IDEA-31] Salvage Wrecks Event
**Complexity:** low
**Category:** event
**Description:** Random wreck sites spawn with breakable debris piles containing mixed loot (wood/stone/thread/chance for rare item). Wrecks despawn quickly, encouraging short contested skirmishes.
**Implementation hint:** spawn timed event entities in `server/src/core/Game.ts`; represent wreck as resource variants in `server/src/entities/Resource.ts`; render marker in `client/src/game/WorldRenderer.ts`.
