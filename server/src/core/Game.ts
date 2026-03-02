import { World } from './World';
import { Player } from '../entities/Player';
import { PacketType } from '../../../shared/packets';
import { handlePacket } from '../packet/PacketHandler';
import { updateSurvival } from '../systems/SurvivalSystem';
import { processAnimalAttacks } from '../systems/CombatSystem';
import { ItemId } from '../../../shared/items';
import {
  TICK_MS, DAY_DURATION, NIGHT_DURATION, PLAYER_MAX_HP,
  PLAYER_MAX_HUNGER, PLAYER_MAX_THIRST, PLAYER_MAX_TEMP,
} from '../../../shared/constants';

export class Game {
  world:    World;
  private io: any;
  private tickInterval: NodeJS.Timeout | null = null;
  private lastTime      = Date.now();
  private gameTime      = 0;
  private isNight       = false;
  private prevIsNight   = false;
  private cycleMax      = DAY_DURATION;
  private lbTimer       = 0;

  constructor(io: any) {
    this.io    = io;
    this.world = new World();
    console.log(`[Game] Seed: ${this.world.mapData.seed}`);
  }

  start(): void {
    this.lastTime = Date.now();
    this.tickInterval = setInterval(() => this.tick(), TICK_MS);
    console.log(`[Game] Running`);
  }

  stop(): void {
    if (this.tickInterval) { clearInterval(this.tickInterval); this.tickInterval = null; }
  }

  addPlayer(socketId: string, nickname: string): Player {
    const pos    = this.world.findSpawnPos();
    const player = new Player(socketId, nickname, pos.x, pos.y);
    this.world.addPlayer(player);
    console.log(`[+] ${nickname} @ (${Math.round(pos.x)},${Math.round(pos.y)})`);
    return player;
  }

  removePlayer(socketId: string): void {
    const p = this.world.players.get(socketId);
    if (p) {
      this.io.emit('msg', [PacketType.ENTITY_REMOVE, p.id]);
    }
    this.world.removePlayer(socketId);
  }

  respawnPlayer(socketId: string): void {
    const p = this.world.players.get(socketId);
    if (!p) return;
    const pos = this.world.findSpawnPos();
    p.x       = pos.x;
    p.y       = pos.y;
    p.hp      = PLAYER_MAX_HP;
    p.hunger  = PLAYER_MAX_HUNGER;
    p.thirst  = PLAYER_MAX_THIRST;
    p.temp    = PLAYER_MAX_TEMP;
    p.dead       = false;
    p.moveDir    = 0;
    p.killStreak = 0;
    // Clear inventory on death (fresh start)
    p.inventory = Array(10).fill(null).map(() => ({ itemId: -1, count: 0 }));

    const socket = this.io.sockets.sockets.get(socketId);
    if (socket) {
      socket.emit('msg', this.getHandshakeData(p));
    }
  }

  handleInput(socketId: string, data: unknown[]): void {
    const player = this.world.players.get(socketId);
    if (!player) return;

    // Respawn packet — allow even if dead
    if (Array.isArray(data) && data[0] === PacketType.RESPAWN) {
      if (player.dead) this.respawnPlayer(socketId);
      return;
    }

    if (player.dead) return;
    handlePacket(player, data, this.world, this.io, (targetId, damage) => {
      this.io.emit('msg', [PacketType.DAMAGE, targetId, damage]);
    });
  }

  getHandshakeData(player: Player): unknown[] {
    return [
      PacketType.HANDSHAKE_RESPONSE,
      player.id,
      Math.round(player.x),
      Math.round(player.y),
      this.world.mapData.seed,
      this.isNight ? 1 : 0,
      this.gameTime,
      this.world.getLeaderboard(),
      this.world.getEntitiesInView(player.x, player.y).map(e => e.serialize()),
    ];
  }

  // ─── Main tick ────────────────────────────────────────────────────────────

  private tick(): void {
    const now = Date.now();
    const dt  = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;

    // Day/night cycle
    this.prevIsNight  = this.isNight;
    this.gameTime    += dt * 1000;
    if (this.gameTime >= this.cycleMax) {
      this.gameTime = 0;
      this.isNight  = !this.isNight;
      this.cycleMax = this.isNight ? NIGHT_DURATION : DAY_DURATION;
    }

    // Handle day→night transition: spawn pack + boost existing wolves
    if (!this.prevIsNight && this.isNight) {
      const nightIds = this.world.spawnNightWolves();
      // Broadcast the newly spawned night wolves to all clients
      const nightEntities = nightIds
        .map(id => this.world.animals.get(id))
        .filter((a): a is NonNullable<typeof a> => a !== undefined)
        .map(a => a.serialize());
      if (nightEntities.length > 0) {
        this.io.emit('msg', [PacketType.ENTITY_UPDATE, nightEntities]);
      }
      // Boost aggroRange on all existing (non-night) wolves
      for (const animal of this.world.animals.values()) {
        if (!animal.isNightWolf && animal.type === 6 /* EntityType.WOLF */) {
          animal.aggroRange = animal.baseAggroRange * 1.5;
        }
      }
    }

    // Handle night→day transition: remove pack + restore existing wolves
    if (this.prevIsNight && !this.isNight) {
      const removedIds = this.world.removeNightWolves();
      for (const id of removedIds) {
        this.io.emit('msg', [PacketType.ENTITY_REMOVE, id]);
      }
      // Restore aggroRange on all remaining (non-night) wolves
      for (const animal of this.world.animals.values()) {
        if (!animal.isNightWolf && animal.type === 6 /* EntityType.WOLF */) {
          animal.aggroRange = animal.baseAggroRange;
        }
      }
    }

    // World physics + animal AI
    this.world.update(dt);

    // Spike damage events — BUG-17: emit DAMAGE packet + trigger killPlayer
    for (const hit of this.world.spikeHits) {
      const p = this.world.players.get(hit.socketId);
      if (!p || p.dead) continue;
      const s = this.io.sockets.sockets.get(hit.socketId);
      if (s) s.emit('msg', [PacketType.DAMAGE, hit.playerId, Math.round(hit.damage)]);
      if (p.hp <= 0) this.killPlayer(p);
    }

    // Survival drain
    for (const p of this.world.players.values()) {
      if (p.dead) continue;
      updateSurvival(p, this.world, dt, this.isNight);
      if (p.hp <= 0) this.killPlayer(p);
    }

    // Animal attacks
    for (const { playerId, damage } of processAnimalAttacks(this.world)) {
      const p = this.world.players.get(playerId);
      if (!p) continue;
      const s = this.io.sockets.sockets.get(playerId);
      if (s) s.emit('msg', [PacketType.DAMAGE, p.id, damage]);
      if (p.hp <= 0) this.killPlayer(p);
    }

    // Furnace cooking timers
    const deltaMs = dt * 1000;
    for (const s of this.world.structures.values()) {
      if (!s.isCooking) continue;
      s.cookTimer -= deltaMs;
      if (s.cookTimer <= 0) {
        s.isCooking = false;
        // Find the cooking player by their entity id
        let cookingPlayer: Player | undefined;
        for (const p of this.world.players.values()) {
          if (p.id === s.cookingPlayerId) { cookingPlayer = p; break; }
        }
        if (cookingPlayer && !cookingPlayer.dead) {
          cookingPlayer.addItem(ItemId.COOKED_MEAT, 1);
          const sock = this.io.sockets.sockets.get(cookingPlayer.socketId);
          if (sock) {
            sock.emit('msg', [PacketType.PLAYER_STATS, cookingPlayer.serializeStats()]);
            sock.emit('msg', [PacketType.INTERACT_RESULT, s.id, 1, ItemId.COOKED_MEAT, 1]);
          }
        }
        s.cookingPlayerId = -1;
      }
    }

    // Broadcast removed entities
    for (const id of this.world.removedEntityIds) {
      this.io.emit('msg', [PacketType.ENTITY_REMOVE, id]);
    }

    // Per-player updates
    for (const p of this.world.players.values()) {
      if (p.dead) continue;
      const s = this.io.sockets.sockets.get(p.socketId);
      if (!s) continue;
      const entities = this.world.getEntitiesInView(p.x, p.y);
      s.emit('msg', [PacketType.ENTITY_UPDATE,  entities.map(e => e.serialize())]);
      s.emit('msg', [PacketType.PLAYER_STATS,   p.serializeStats()]);
      s.emit('msg', [PacketType.TIME_UPDATE,    this.isNight ? 1 : 0, this.gameTime, this.cycleMax]);
    }

    // Leaderboard every 3s
    this.lbTimer += dt * 1000;
    if (this.lbTimer >= 3000) {
      this.lbTimer = 0;
      this.io.emit('msg', [PacketType.LEADERBOARD, this.world.getLeaderboard()]);
    }
  }

  private killPlayer(player: Player): void {
    player.dead       = true;
    player.hp         = 0;
    player.killStreak = 0;
    const s = this.io.sockets.sockets.get(player.socketId);
    if (s) s.emit('msg', [PacketType.DEATH, player.points]);
  }
}
