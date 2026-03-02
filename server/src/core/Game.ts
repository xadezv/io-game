import { World } from './World';
import { Player } from '../entities/Player';
import { PacketType } from '../../../shared/packets';
import { handlePacket } from '../packet/PacketHandler';
import { updateSurvival } from '../systems/SurvivalSystem';
import { processAnimalAttacks } from '../systems/CombatSystem';
import {
  TICK_MS, DAY_DURATION, NIGHT_DURATION, PLAYER_MAX_HP,
  PLAYER_MAX_HUNGER, PLAYER_MAX_THIRST, PLAYER_MAX_TEMP,
} from '../../../shared/constants';

export class Game {
  world:    World;
  private io: any;
  private tickInterval: NodeJS.Timeout | null = null;
  private lastTime  = Date.now();
  private gameTime  = 0;
  private isNight   = false;
  private cycleMax  = DAY_DURATION;
  private lbTimer   = 0;

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
    p.dead    = false;
    p.moveDir = 0;
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
    this.gameTime += dt * 1000;
    if (this.gameTime >= this.cycleMax) {
      this.gameTime = 0;
      this.isNight  = !this.isNight;
      this.cycleMax = this.isNight ? NIGHT_DURATION : DAY_DURATION;
    }

    // World physics + animal AI
    this.world.update(dt);

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
    player.dead = true;
    player.hp   = 0;
    const s = this.io.sockets.sockets.get(player.socketId);
    if (s) s.emit('msg', [PacketType.DEATH]);
  }
}
