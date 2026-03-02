import express from 'express';
import http from 'http';
import path from 'path';
import { Server as SocketIOServer } from 'socket.io';
import { Game } from '../core/Game';
import { PacketType } from '../../../shared/packets';

export function createServer(port = 3000): void {
  const app        = express();
  const httpServer = http.createServer(app);
  const io         = new SocketIOServer(httpServer, {
    cors:       { origin: '*' },
    transports: ['websocket'],
  });

  const clientPublic = path.join(__dirname, '..', '..', '..', '..', 'client', 'public');
  app.use(express.static(clientPublic));

  const game = new Game(io);
  game.start();

  io.on('connection', (socket) => {
    let joined = false;
    let player: ReturnType<typeof game.addPlayer> | null = null;

    socket.on('msg', (data: unknown[]) => {
      if (!Array.isArray(data)) return;

      if (!joined) {
        if (data[0] === PacketType.HANDSHAKE) {
          const nick = String(data[1] ?? 'Anon').trim().substring(0, 16) || 'Anon';
          player = game.addPlayer(socket.id, nick);
          player.socket = socket;
          joined = true;
          socket.emit('msg', game.getHandshakeData(player));
        }
        return;
      }

      game.handleInput(socket.id, data);
    });

    socket.on('disconnect', () => {
      if (joined) game.removePlayer(socket.id);
    });
  });

  httpServer.listen(port, () => {
    console.log(`[Server] http://localhost:${port}`);
  });
}
