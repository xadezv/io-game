import express from 'express';
import http from 'http';
import path from 'path';
import { Server as SocketIOServer } from 'socket.io';
import { Game } from '../core/Game';
import { PacketType } from '../../../shared/packets';

export function createServer(port: number = 3000): void {
  const app = express();
  const httpServer = http.createServer(app);
  const io = new SocketIOServer(httpServer, {
    cors: { origin: '*' },
    transports: ['websocket'],
  });

  // Serve client files
  const clientPublicPath = path.join(__dirname, '..', '..', '..', '..', 'client', 'public');
  app.use(express.static(clientPublicPath));

  const game = new Game(io);
  game.start();

  io.on('connection', (socket) => {
    let joined = false;

    console.log(`[WS] Connected: ${socket.id}`);

    socket.on('msg', (data: unknown[]) => {
      if (!Array.isArray(data)) return;

      if (!joined) {
        if (data[0] === PacketType.HANDSHAKE) {
          const nickname = (data[1] as string) ?? 'Player';
          const player = game.addPlayer(socket.id, nickname);
          // Attach socket ref to player
          (player as any).socket = socket;
          joined = true;
          socket.emit('msg', game.getHandshakeData(player));
        }
        return;
      }

      game.handleInput(socket.id, data);
    });

    socket.on('disconnect', () => {
      if (joined) {
        game.removePlayer(socket.id);
        // Notify others
        io.emit('msg', [PacketType.ENTITY_REMOVE, socket.id]);
        console.log(`[WS] Disconnected: ${socket.id}`);
      }
    });
  });

  httpServer.listen(port, () => {
    console.log(`[Server] Running at http://localhost:${port}`);
  });
}
