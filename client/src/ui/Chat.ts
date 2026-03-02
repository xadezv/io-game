interface ChatMessage {
  playerId: number;
  nickname: string;
  message: string;
  timestamp: number;
}

const MAX_MESSAGES = 8;
const MESSAGE_TTL = 12000; // ms before message fades

export default class Chat {
  private container: HTMLDivElement | null = null;
  private log: HTMLDivElement | null = null;
  private input: HTMLInputElement | null = null;
  private messages: ChatMessage[] = [];
  private sendCallback: ((msg: string) => void) | null = null;
  private _focused: boolean = false;

  constructor() {}

  init(): void {
    // --- Container ---
    this.container = document.createElement("div");
    this.container.className = "chat-container";
    this.container.style.cssText = [
      "position: fixed",
      "bottom: 140px",
      "left: 14px",
      "width: 280px",
      "z-index: 100",
      "display: flex",
      "flex-direction: column",
      "gap: 4px",
      "pointer-events: none",
    ].join(";");

    // --- Log ---
    this.log = document.createElement("div");
    this.log.className = "chat-log";
    this.log.style.cssText = [
      "max-height: 160px",
      "overflow-y: auto",
      "display: flex",
      "flex-direction: column",
      "gap: 2px",
      "padding: 6px 8px",
      "background: rgba(0,0,0,0.45)",
      "border-radius: 8px 8px 0 0",
      "border: 1px solid rgba(255,255,255,0.08)",
      "backdrop-filter: blur(4px)",
      "scrollbar-width: none", // Firefox
    ].join(";");

    // Hide scrollbar on webkit
    const scrollStyle = document.createElement("style");
    scrollStyle.textContent = `.chat-log::-webkit-scrollbar { display: none; }`;
    document.head.appendChild(scrollStyle);

    // --- Input ---
    this.input = document.createElement("input");
    this.input.className = "chat-input";
    this.input.type = "text";
    this.input.maxLength = 80;
    this.input.placeholder = "Press T to chat...";
    this.input.style.cssText = [
      "width: 100%",
      "box-sizing: border-box",
      "padding: 6px 10px",
      "background: rgba(0,0,0,0.65)",
      "border: 1px solid rgba(255,255,255,0.15)",
      "border-top: none",
      "border-radius: 0 0 8px 8px",
      "color: #fff",
      "font-family: 'Fredoka One', sans-serif",
      "font-size: 13px",
      "outline: none",
      "pointer-events: auto",
      "transition: border-color 0.2s",
    ].join(";");

    this.input.addEventListener("focus", () => {
      this._focused = true;
      this.input!.style.borderColor = "rgba(167,139,250,0.7)";
      this.input!.style.background = "rgba(10,10,20,0.85)";
    });

    this.input.addEventListener("blur", () => {
      this._focused = false;
      this.input!.style.borderColor = "rgba(255,255,255,0.15)";
      this.input!.style.background = "rgba(0,0,0,0.65)";
    });

    this.input.addEventListener("keydown", (e: KeyboardEvent) => {
      e.stopPropagation();
      if (e.key === "Enter") {
        const msg = this.input!.value.trim();
        if (msg && this.sendCallback) {
          this.sendCallback(msg);
        }
        this.input!.value = "";
        this.input!.blur();
      }
      if (e.key === "Escape") {
        this.input!.value = "";
        this.input!.blur();
      }
    });

    // Global T key to focus
    document.addEventListener("keydown", (e: KeyboardEvent) => {
      if (
        (e.key === "t" || e.key === "T") &&
        !this._focused &&
        document.activeElement !== this.input
      ) {
        e.preventDefault();
        this.input?.focus();
      }
    });

    this.container.appendChild(this.log);
    this.container.appendChild(this.input);
    document.body.appendChild(this.container);

    // Prune old messages periodically
    setInterval(() => this._pruneOldMessages(), 2000);
  }

  addMessage(playerId: number, nickname: string, message: string): void {
    const entry: ChatMessage = {
      playerId,
      nickname,
      message,
      timestamp: Date.now(),
    };

    this.messages.push(entry);

    // Keep only last MAX_MESSAGES
    if (this.messages.length > MAX_MESSAGES) {
      this.messages = this.messages.slice(-MAX_MESSAGES);
    }

    this._renderMessages();
  }

  onSend(cb: (msg: string) => void): void {
    this.sendCallback = cb;
  }

  isFocused(): boolean {
    return this._focused;
  }

  private _renderMessages(): void {
    if (!this.log) return;
    this.log.innerHTML = "";

    for (const msg of this.messages) {
      const age = Date.now() - msg.timestamp;
      const opacity = Math.max(0.3, 1 - age / MESSAGE_TTL);

      const row = document.createElement("div");
      row.style.cssText = [
        "display: flex",
        "gap: 5px",
        "line-height: 1.3",
        `opacity: ${opacity.toFixed(2)}`,
        "transition: opacity 1s",
        "font-size: 12px",
        "font-family: 'Fredoka One', sans-serif",
        "word-break: break-word",
      ].join(";");

      const nameEl = document.createElement("span");
      nameEl.style.cssText = [
        `color: ${this._playerColor(msg.playerId)}`,
        "font-weight: 600",
        "white-space: nowrap",
        "flex-shrink: 0",
      ].join(";");
      nameEl.textContent = msg.nickname + ":";

      const msgEl = document.createElement("span");
      msgEl.style.cssText = "color: rgba(255,255,255,0.9);";
      msgEl.textContent = msg.message;

      row.appendChild(nameEl);
      row.appendChild(msgEl);
      this.log.appendChild(row);
    }

    // Auto-scroll to bottom
    this.log.scrollTop = this.log.scrollHeight;
  }

  private _pruneOldMessages(): void {
    const now = Date.now();
    const before = this.messages.length;
    this.messages = this.messages.filter(
      (m) => now - m.timestamp < MESSAGE_TTL
    );
    if (this.messages.length !== before) {
      this._renderMessages();
    }
  }

  private _playerColor(id: number): string {
    const colors = [
      "#60a5fa", "#f87171", "#4ade80", "#fbbf24",
      "#a78bfa", "#34d399", "#fb923c", "#e879f9",
    ];
    return colors[Math.abs(id) % colors.length];
  }
}
