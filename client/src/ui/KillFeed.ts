export default class KillFeed {
  private container: HTMLDivElement | null = null;

  init(): void {
    this.container = document.createElement('div');
    this.container.style.cssText = [
      'position: fixed','top: 16px','left: 50%','transform: translateX(-50%)',
      'z-index: 120','display: flex','flex-direction: column','gap: 6px','pointer-events:none'
    ].join(';');
    document.body.appendChild(this.container);
  }

  addKill(killer: string, victim: string): void {
    if (!this.container) return;
    const row = document.createElement('div');
    row.textContent = `${killer} killed ${victim}`;
    row.style.cssText = [
      'padding: 6px 10px','border-radius: 8px','background: rgba(0,0,0,0.7)',
      'color: #fff','font: 12px Fredoka One, sans-serif','opacity:1','transition: opacity .4s ease'
    ].join(';');
    this.container.prepend(row);
    while (this.container.childElementCount > 5) this.container.lastElementChild?.remove();
    setTimeout(() => row.style.opacity = '0', 4600);
    setTimeout(() => row.remove(), 5000);
  }
}
