import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
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

  // Works for both ts-node (src/network/) and compiled (dist/network/)
  const clientPublic = path.resolve(__dirname, '..', '..', '..', 'client', 'public');
  app.use(express.static(clientPublic));

  // ── Hot reload ──────────────────────────────────────────────────────────────
  // Watch bundle.js for changes (esbuild --watch rebuilds it).
  // When it changes, emit 'reload' to all connected browsers.
  const bundlePath = path.join(clientPublic, 'bundle.js');
  let reloadDebounce: NodeJS.Timeout | null = null;
  try {
    fs.watch(bundlePath, () => {
      if (reloadDebounce) return;
      reloadDebounce = setTimeout(() => {
        reloadDebounce = null;
        console.log('[HMR] bundle.js changed — reloading clients');
        io.emit('__reload__');
      }, 120); // debounce: esbuild writes in multiple chunks
    });
    console.log('[HMR] Watching bundle.js for changes');
  } catch {
    // bundle.js may not exist yet on first run — that's fine
  }

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
