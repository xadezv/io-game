export default class DeathScreen {
  private overlay: HTMLDivElement | null = null;
  private scoreEl: HTMLSpanElement | null = null;
  private respawnBtn: HTMLButtonElement | null = null;
  private respawnCallback: (() => void) | null = null;

  constructor() {}

  init(): void {
    // ---- Overlay ----
    this.overlay = document.createElement("div");
    this.overlay.className = "death-screen";
    this.overlay.style.cssText = [
      "display: none",
      "position: fixed",
      "inset: 0",
      "z-index: 500",
      "background: rgba(0,0,0,0)",
      "backdrop-filter: blur(0px)",
      "align-items: center",
      "justify-content: center",
      "flex-direction: column",
      "gap: 18px",
      "transition: background 0.6s ease, backdrop-filter 0.6s ease",
    ].join(";");

    // ---- Inner card ----
    const card = document.createElement("div");
    card.style.cssText = [
      "background: rgba(10,5,20,0.88)",
      "border: 1px solid rgba(239,68,68,0.4)",
      "border-radius: 16px",
      "padding: 40px 56px",
      "display: flex",
      "flex-direction: column",
      "align-items: center",
      "gap: 18px",
      "box-shadow: 0 0 60px rgba(239,68,68,0.25), 0 8px 40px rgba(0,0,0,0.7)",
      "animation: deathCardIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both",
    ].join(";");

    // ---- Skull icon ----
    const skull = document.createElement("div");
    skull.textContent = "💀";
    skull.style.cssText = [
      "font-size: 72px",
      "line-height: 1",
      "filter: drop-shadow(0 0 20px rgba(239,68,68,0.6))",
    ].join(";");

    // ---- Title ----
    const title = document.createElement("h1");
    title.textContent = "You Died";
    title.style.cssText = [
      "margin: 0",
      "font-family: 'Fredoka One', sans-serif",
      "font-size: 52px",
      "font-weight: 400",
      "color: #ef4444",
      "text-shadow: 0 0 30px rgba(239,68,68,0.7)",
      "letter-spacing: 2px",
    ].join(";");

    // ---- Score ----
    const scoreRow = document.createElement("div");
    scoreRow.style.cssText = [
      "display: flex",
      "flex-direction: column",
      "align-items: center",
      "gap: 4px",
    ].join(";");

    const scoreLabel = document.createElement("div");
    scoreLabel.textContent = "Final Score";
    scoreLabel.style.cssText = [
      "font-family: 'Fredoka One', sans-serif",
      "font-size: 14px",
      "color: rgba(255,255,255,0.45)",
      "letter-spacing: 1px",
      "text-transform: uppercase",
    ].join(";");

    this.scoreEl = document.createElement("span");
    this.scoreEl.textContent = "0";
    this.scoreEl.style.cssText = [
      "font-family: 'Fredoka One', sans-serif",
      "font-size: 40px",
      "color: #fbbf24",
      "text-shadow: 0 0 16px rgba(251,191,36,0.5)",
    ].join(";");

    scoreRow.appendChild(scoreLabel);
    scoreRow.appendChild(this.scoreEl);

    // ---- Divider ----
    const divider = document.createElement("div");
    divider.style.cssText = [
      "width: 80px",
      "height: 1px",
      "background: rgba(239,68,68,0.3)",
    ].join(";");

    // ---- Respawn button ----
    this.respawnBtn = document.createElement("button");
    this.respawnBtn.textContent = "Respawn";
    this.respawnBtn.style.cssText = [
      "margin-top: 6px",
      "padding: 12px 48px",
      "background: linear-gradient(135deg, #7c3aed, #4f46e5)",
      "border: none",
      "border-radius: 50px",
      "color: #fff",
      "font-family: 'Fredoka One', sans-serif",
      "font-size: 20px",
      "cursor: pointer",
      "letter-spacing: 1px",
      "box-shadow: 0 4px 24px rgba(124,58,237,0.5)",
      "transition: transform 0.15s, box-shadow 0.15s",
      "pointer-events: auto",
    ].join(";");

    this.respawnBtn.addEventListener("mouseenter", () => {
      this.respawnBtn!.style.transform = "scale(1.06)";
      this.respawnBtn!.style.boxShadow = "0 6px 32px rgba(124,58,237,0.7)";
    });
    this.respawnBtn.addEventListener("mouseleave", () => {
      this.respawnBtn!.style.transform = "scale(1)";
      this.respawnBtn!.style.boxShadow = "0 4px 24px rgba(124,58,237,0.5)";
    });
    this.respawnBtn.addEventListener("click", () => {
      if (this.respawnCallback) this.respawnCallback();
    });

    // ---- Hint ----
    const hint = document.createElement("div");
    hint.textContent = "Press Enter to respawn";
    hint.style.cssText = [
      "font-family: 'Fredoka One', sans-serif",
      "font-size: 12px",
      "color: rgba(255,255,255,0.25)",
    ].join(";");

    // ---- Keydown shortcut ----
    document.addEventListener("keydown", (e: KeyboardEvent) => {
      if (
        e.key === "Enter" &&
        this.overlay?.style.display !== "none" &&
        this.respawnCallback
      ) {
        this.respawnCallback();
      }
    });

    // ---- CSS animation keyframes ----
    const styleEl = document.createElement("style");
    styleEl.textContent = `
      @keyframes deathCardIn {
        from { transform: scale(0.7) translateY(40px); opacity: 0; }
        to   { transform: scale(1) translateY(0);      opacity: 1; }
      }
    `;
    document.head.appendChild(styleEl);

    card.appendChild(skull);
    card.appendChild(title);
    card.appendChild(scoreRow);
    card.appendChild(divider);
    card.appendChild(this.respawnBtn);
    card.appendChild(hint);
    this.overlay.appendChild(card);
    document.body.appendChild(this.overlay);
  }

  show(points: number): void {
    if (!this.overlay || !this.scoreEl) return;
    this.scoreEl.textContent = String(points);
    this.overlay.style.display = "flex";

    // Trigger transition on next frame
    requestAnimationFrame(() => {
      if (this.overlay) {
        this.overlay.style.background = "rgba(20,0,0,0.72)";
        this.overlay.style.backdropFilter = "blur(6px)";
      }
    });
  }

  hide(): void {
    if (!this.overlay) return;
    this.overlay.style.background = "rgba(0,0,0,0)";
    this.overlay.style.backdropFilter = "blur(0px)";

    setTimeout(() => {
      if (this.overlay) this.overlay.style.display = "none";
    }, 400);
  }

  onRespawn(cb: () => void): void {
    this.respawnCallback = cb;
  }
}
