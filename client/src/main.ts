import { GameClient } from './game/GameClient';

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
if (!canvas) throw new Error('Canvas #gameCanvas not found');

// Determine server URL — same origin in production, localhost in dev
const serverUrl = process.env.NODE_ENV === 'production'
  ? window.location.origin
  : 'http://localhost:3000';

function showError(msg: string): void {
  const div = document.createElement('div');
  div.style.cssText = 'position:fixed;inset:0;z-index:9999;background:#1a0000;color:#ff4444;font:18px monospace;padding:40px;white-space:pre-wrap;overflow:auto;';
  div.textContent = 'GAME ERROR:\n\n' + msg;
  document.body.appendChild(div);
}

window.addEventListener('error', (e) => {
  showError(e.message + '\n\n' + (e.filename || '') + ':' + e.lineno + '\n\n' + (e.error?.stack || ''));
});

window.addEventListener('unhandledrejection', (e) => {
  showError(String(e.reason?.stack || e.reason || 'Unhandled promise rejection'));
});

try {
  const game = new GameClient(canvas, serverUrl);
  game.start();
} catch (e: any) {
  showError(e?.stack || String(e));
}
