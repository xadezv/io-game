# IO Game — starve.io inspired

Multiplayer survival IO game. TypeScript backend (Socket.io) + vanilla TypeScript frontend (Canvas 2D engine, no frameworks).

## Stack

- **Server**: Node.js + TypeScript + Socket.io + Express
- **Client**: TypeScript + Canvas 2D (custom engine) + esbuild
- **Shared**: common types, constants, item definitions

## Structure

```
├── shared/          # Constants, packet types, items/recipes
├── server/          # Game server (Socket.io, game loop, ECS-lite)
│   └── src/
│       ├── core/    # Game loop, World
│       ├── entities/# Player, Animal, Resource, Structure
│       ├── map/     # Procedural map generation (LCG seed)
│       ├── network/ # WebSocket server
│       ├── packet/  # Packet handler
│       └── systems/ # Combat, Craft, Build, Survival
└── client/          # Browser client
    └── src/
        ├── engine/  # Renderer, Camera, Input, Animations, Assets
        ├── game/    # GameClient, WorldRenderer, EntityRenderer, Particles
        ├── network/ # WSClient
        └── ui/      # HUD, Chat, Inventory, Minimap, Leaderboard, Lobby
```

## Features (MVP)

- Multiplayer real-time movement & combat
- Procedural world with biomes (Plains, Forest, Desert, Snow, Ocean)
- Resources: Trees, Stone, Gold, Berries, Cactus
- Animals: Rabbits (flee), Wolves (aggressive AI)
- Survival stats: HP, Hunger, Thirst, Temperature
- Crafting system (axe, pickaxe, sword, campfire, walls, spikes)
- Building placement
- Day/night cycle
- Chat + Leaderboard
- Particles & animations

## Running locally

### Server
```bash
cd server
npm install
npm run dev
```

### Client
```bash
cd client
npm install
npm run dev
# open http://localhost:3000
```

## Controls

| Key | Action |
|-----|--------|
| WASD / Arrows | Move |
| Left Click | Attack / Harvest |
| 1-0 | Select inventory slot |
| C | Toggle craft menu |
| T | Chat |
| R | Use selected food item |
