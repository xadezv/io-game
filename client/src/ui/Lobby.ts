export default class Lobby {
  private overlay: HTMLDivElement | null = null;
  private nicknameInput: HTMLInputElement | null = null;
  private playCallback: ((nickname: string) => void) | null = null;

  constructor() {}

  init(): void {
    // ---- Keyframe styles ----
    const styleEl = document.createElement("style");
    styleEl.textContent = `
      @keyframes lobbyFadeIn {
        from { opacity: 0; transform: translateY(-20px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      @keyframes titlePulse {
        0%,100% { text-shadow: 0 0 20px rgba(167,139,250,0.4), 0 0 60px rgba(124,58,237,0.2); }
        50%      { text-shadow: 0 0 40px rgba(167,139,250,0.8), 0 0 100px rgba(124,58,237,0.5); }
      }
      @keyframes floatParticle {
        0%   { transform: translateY(0)   rotate(0deg);   opacity: 0.6; }
        50%  { transform: translateY(-30px) rotate(180deg); opacity: 0.3; }
        100% { transform: translateY(0)   rotate(360deg); opacity: 0.6; }
      }
      .lobby-play-btn:hover {
        transform: scale(1.05) !important;
        box-shadow: 0 8px 48px rgba(124,58,237,0.8) !important;
      }
      .lobby-play-btn:active {
        transform: scale(0.97) !important;
      }
      .lobby-nick-input:focus {
        border-color: rgba(167,139,250,0.8) !important;
        box-shadow: 0 0 0 3px rgba(124,58,237,0.2) !important;
        outline: none;
      }
    `;
    document.head.appendChild(styleEl);

    // ---- Overlay ----
    this.overlay = document.createElement("div");
    this.overlay.className = "lobby-overlay";
    this.overlay.style.cssText = [
      "position: fixed",
      "inset: 0",
      "z-index: 400",
      "background: radial-gradient(ellipse at 50% 40%, #0f0a1e 0%, #050510 60%, #000 100%)",
      "display: flex",
      "align-items: center",
      "justify-content: center",
      "overflow: hidden",
    ].join(";");

    // ---- Decorative particles ----
    this._addParticles(this.overlay);

    // ---- Card ----
    const card = document.createElement("div");
    card.style.cssText = [
      "position: relative",
      "z-index: 1",
      "display: flex",
      "flex-direction: column",
      "align-items: center",
      "gap: 22px",
      "padding: 50px 60px 44px",
      "background: rgba(255,255,255,0.03)",
      "border: 1px solid rgba(255,255,255,0.08)",
      "border-radius: 20px",
      "backdrop-filter: blur(10px)",
      "box-shadow: 0 0 80px rgba(124,58,237,0.15), 0 16px 60px rgba(0,0,0,0.6)",
      "animation: lobbyFadeIn 0.5s ease both",
      "min-width: 340px",
    ].join(";");

    // ---- Logo/Icon ----
    const icon = document.createElement("div");
    icon.textContent = "⚔️";
    icon.style.cssText = [
      "font-size: 64px",
      "line-height: 1",
      "filter: drop-shadow(0 0 20px rgba(167,139,250,0.5))",
    ].join(";");

    // ---- Title ----
    const title = document.createElement("h1");
    title.textContent = "IO Game";
    title.style.cssText = [
      "margin: 0",
      "font-family: 'Fredoka One', sans-serif",
      "font-size: 64px",
      "font-weight: 400",
      "color: #fff",
      "letter-spacing: 4px",
      "animation: titlePulse 3s ease-in-out infinite",
      "line-height: 1",
    ].join(";");

    // ---- Tagline ----
    const tagline = document.createElement("p");
    tagline.textContent = "Survive. Craft. Dominate.";
    tagline.style.cssText = [
      "margin: -10px 0 0",
      "font-family: 'Fredoka One', sans-serif",
      "font-size: 15px",
      "color: rgba(167,139,250,0.7)",
      "letter-spacing: 3px",
      "text-transform: uppercase",
    ].join(";");

    // ---- Divider ----
    const divider = document.createElement("div");
    divider.style.cssText = [
      "width: 100%",
      "height: 1px",
      "background: linear-gradient(90deg, transparent, rgba(167,139,250,0.3), transparent)",
      "margin: 2px 0",
    ].join(";");

    // ---- Nickname label ----
    const nickLabel = document.createElement("label");
    nickLabel.textContent = "Your Name";
    nickLabel.style.cssText = [
      "align-self: flex-start",
      "font-family: 'Fredoka One', sans-serif",
      "font-size: 12px",
      "color: rgba(255,255,255,0.4)",
      "letter-spacing: 1.5px",
      "text-transform: uppercase",
      "margin-bottom: -14px",
    ].join(";");

    // ---- Nickname input ----
    this.nicknameInput = document.createElement("input");
    this.nicknameInput.className = "lobby-nick-input";
    this.nicknameInput.type = "text";
    this.nicknameInput.placeholder = "Enter nickname...";
    this.nicknameInput.maxLength = 20;
    this.nicknameInput.autocomplete = "off";
    this.nicknameInput.style.cssText = [
      "width: 100%",
      "box-sizing: border-box",
      "padding: 12px 16px",
      "background: rgba(255,255,255,0.05)",
      "border: 1.5px solid rgba(255,255,255,0.12)",
      "border-radius: 10px",
      "color: #fff",
      "font-family: 'Fredoka One', sans-serif",
      "font-size: 16px",
      "transition: border-color 0.2s, box-shadow 0.2s",
      "letter-spacing: 0.5px",
    ].join(";");

    // Restore from localStorage
    const savedNick = localStorage.getItem("io_game_nickname");
    if (savedNick) this.nicknameInput.value = savedNick;

    this.nicknameInput.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === "Enter") this._handlePlay();
    });

    // ---- Play button ----
    const playBtn = document.createElement("button");
    playBtn.className = "lobby-play-btn";
    playBtn.textContent = "Play";
    playBtn.style.cssText = [
      "width: 100%",
      "padding: 14px 0",
      "background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
      "border: none",
      "border-radius: 50px",
      "color: #fff",
      "font-family: 'Fredoka One', sans-serif",
      "font-size: 22px",
      "letter-spacing: 2px",
      "cursor: pointer",
      "box-shadow: 0 4px 32px rgba(124,58,237,0.55)",
      "transition: transform 0.15s, box-shadow 0.15s",
      "margin-top: 4px",
    ].join(";");

    playBtn.addEventListener("click", () => this._handlePlay());

    // ---- Footer hint ----
    const footer = document.createElement("div");
    footer.style.cssText = [
      "font-family: 'Fredoka One', sans-serif",
      "font-size: 11px",
      "color: rgba(255,255,255,0.2)",
      "letter-spacing: 0.5px",
      "margin-top: -6px",
    ].join(";");
    footer.textContent = "WASD to move  •  C to craft  •  T to chat";

    card.appendChild(icon);
    card.appendChild(title);
    card.appendChild(tagline);
    card.appendChild(divider);
    card.appendChild(nickLabel);
    card.appendChild(this.nicknameInput);
    card.appendChild(playBtn);
    card.appendChild(footer);
    this.overlay.appendChild(card);
    document.body.appendChild(this.overlay);
  }

  show(): void {
    if (this.overlay) this.overlay.style.display = "flex";
  }

  hide(): void {
    if (!this.overlay) return;
    this.overlay.style.opacity = "0";
    this.overlay.style.transition = "opacity 0.4s ease";
    setTimeout(() => {
      if (this.overlay) this.overlay.style.display = "none";
    }, 400);
  }

  onPlay(cb: (nickname: string) => void): void {
    this.playCallback = cb;
  }

  private _handlePlay(): void {
    const raw = this.nicknameInput?.value.trim() ?? "";
    const nickname = raw.length > 0 ? raw : "Anonymous";
    localStorage.setItem("io_game_nickname", nickname);
    if (this.playCallback) this.playCallback(nickname);
  }

  private _addParticles(container: HTMLDivElement): void {
    const symbols = ["⚔️", "🌲", "🪨", "🍎", "🏹", "⛏️", "🔥", "🌾"];
    for (let i = 0; i < 18; i++) {
      const p = document.createElement("div");
      const sym = symbols[i % symbols.length];
      p.textContent = sym;

      const x = Math.random() * 100;
      const y = Math.random() * 100;
      const delay = Math.random() * 5;
      const duration = 4 + Math.random() * 6;
      const size = 14 + Math.random() * 20;

      p.style.cssText = [
        "position: absolute",
        `left: ${x}%`,
        `top: ${y}%`,
        `font-size: ${size}px`,
        `opacity: ${0.08 + Math.random() * 0.12}`,
        `animation: floatParticle ${duration}s ease-in-out ${delay}s infinite`,
        "pointer-events: none",
        "user-select: none",
        "z-index: 0",
      ].join(";");

      container.appendChild(p);
    }
  }
}
