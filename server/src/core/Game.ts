import { World } from './World';
import { Player } from '../entities/Player';
import { PacketType } from '../../../shared/packets';
import { handlePacket } from '../packet/PacketHandler';
import { updateSurvival } from '../systems/SurvivalSystem';
import { processAnimalAttacks } from '../systems/CombatSystem';
import {
  TICK_RATE, TICK_MS, DAY_DURATION, NIGHT_DURATION, MAP_SIZE, LEADERBOARD_SIZE
} from '../../../shared/constants';

export class Game {
  world: World;
  private io: any;
  private tickInterval: NodeJS.Timeout | null = null;
  private lastTime: number = Date.now();
  private gameTime: number = 0; // ms into current day/night cycle
  private isNight: boolean = false;
  private cycleMax: number = DAY_DURATION;

  constructor(io: any) {
    this.io = io;
    this.world = new World();
    console.log(`[Game] World generated, seed: ${this.world.mapData.seed}`);
  }

  start(): void {
    this.lastTime = Date.now();
    this.tickInterval = setInterval(() => this.tick(), TICK_MS);
    console.log(`[Game] Started at ${TICK_RATE} TPS`);
  }

  stop(): void {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }

  addPlayer(socketId: string, nickname: string): Player {
    const pos = this.world.findSpawnPos();
    const player = new Player(socketId, nickname, pos.x, pos.y);
    this.world.players.set(socketId, player);
    console.log(`[Game] Player joined: ${nickname} (${socketId}) at (${Math.round(pos.x)},${Math.round(pos.y)})`);
    return player;
  }

  removePlayer(socketId: string): void {
    this.world.players.delete(socketId);
  }

  handleInput(socketId: string, data: unknown[]): void {
    const player = this.world.players.get(socketId);
    if (!player || player.dead) return;

    handlePacket(player, data, this.world, this.io, (targetId, damage, targetType) => {
      this.broadcastDamage(targetId, damage, targetType);
    });
  }

  private tick(): void {
    const now = Date.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.1); // cap at 100ms
    this.lastTime = now;

    // Day/night cycle
    this.gameTime += now - (now - dt * 1000);
    this.gameTime += dt * 1000;
    if (this.gameTime > this.cycleMax) {
      this.gameTime = 0;
      this.isNight = !this.isNight;
      this.cycleMax = this.isNight ? NIGHT_DURATION : DAY_DURATION;
    }

    // Update world physics
    this.world.update(dt);

    // Update survival for each player
    for (const player of this.world.players.values()) {
      if (player.dead) continue;
      updateSurvival(player, this.world, dt, this.isNight);

      // Check death
      if (player.hp <= 0) {
        this.killPlayer(player);
      }
    }

    // Animal attacks
    const animalDamages = processAnimalAttacks(this.world);
    for (const { playerId, damage } of animalDamages) {
      const p = this.world.players.get(playerId);
      if (p) {
        const socket = this.io.sockets.sockets.get(playerId);
        if (socket) socket.emit('msg', [PacketType.DAMAGE, p.id, damage]);
        if (p.hp <= 0) this.killPlayer(p);
      }
    }

    // Broadcast entity updates to each player based on view
    this.broadcastUpdates();

    // Leaderboard update every 3 seconds
    if (Math.floor(now / 3000) !== Math.floor((now - dt * 1000) / 3000)) {
      this.broadcastLeaderboard();
    }
  }

  private killPlayer(player: Player): void {
    player.dead = true;
    player.hp = 0;
    const socket = this.io.sockets.sockets.get(player.socketId);
    if (socket) {
      socket.emit('msg', [PacketType.DEATH]);
    }
  }

  private broadcastDamage(targetId: number, damage: number, targetType: string): void {
    // Send to all players in view — simplified: broadcast to all
    this.io.emit('msg', [PacketType.DAMAGE, targetId, damage]);
  }

  private broadcastUpdates(): void {
    for (const player of this.world.players.values()) {
      if (player.dead) continue;
      const socket = this.io.sockets.sockets.get(player.socketId);
      if (!socket) continue;

      const entities = this.world.getEntitiesInView(player.x, player.y);
      const serialized = entities.map(e => e.serialize());

      socket.emit('msg', [PacketType.ENTITY_UPDATE, serialized]);
      socket.emit('msg', [PacketType.PLAYER_STATS, player.serializeStats()]);
      socket.emit('msg', [PacketType.TIME_UPDATE, this.isNight ? 1 : 0, this.gameTime, this.cycleMax]);
    }
  }

  private broadcastLeaderboard(): void {
    const lb = this.world.getLeaderboard();
    this.io.emit('msg', [PacketType.LEADERBOARD, lb]);
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
}
