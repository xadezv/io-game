import { GameClient } from './game/GameClient';

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
if (!canvas) throw new Error('Canvas #gameCanvas not found');

// Determine server URL — same origin in production, localhost in dev
const serverUrl = process.env.NODE_ENV === 'production'
  ? window.location.origin
  : 'http://localhost:3000';

const game = new GameClient(canvas, serverUrl);
game.start();
