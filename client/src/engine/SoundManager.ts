export default class SoundManager {
  private ctx: AudioContext | null = null;
  private enabled = false;

  toggle(): boolean {
    this.enabled = !this.enabled;
    if (this.enabled && !this.ctx) this.ctx = new AudioContext();
    return this.enabled;
  }

  play(name: string, volume = 0.2): void {
    if (!this.enabled) return;
    if (!this.ctx) this.ctx = new AudioContext();
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    const t = ctx.currentTime;
    const freq = name === 'death' ? 120 : name === 'craft' ? 720 : name === 'eat' ? 480 : 260;
    o.type = name === 'hit' ? 'square' : 'triangle';
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(80, freq * 0.7), t + 0.12);
    g.gain.setValueAtTime(volume, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    o.connect(g); g.connect(ctx.destination);
    o.start(t); o.stop(t + 0.14);
  }
}
