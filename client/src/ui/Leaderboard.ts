export interface LeaderboardEntry {
  id: number;
  nickname: string;
  points: number;
  kills?: number;
}

const MAX_ENTRIES = 10;

// Medal colors for top 3
const RANK_STYLES: Record<number, { color: string; badge: string }> = {
  1: { color: "#fbbf24", badge: "🥇" },
  2: { color: "#d1d5db", badge: "🥈" },
  3: { color: "#b45309", badge: "🥉" },
};

export default class Leaderboard {
  private container: HTMLDivElement | null = null;
  private listEl: HTMLDivElement | null = null;

  constructor() {}

  init(): void {
    // --- Outer container ---
    this.container = document.createElement("div");
    this.container.className = "leaderboard";
    this.container.style.cssText = [
      "position: fixed",
      "top: 14px",
      "right: 14px",
      "width: 200px",
      "z-index: 100",
      "background: rgba(5,5,15,0.78)",
      "border: 1px solid rgba(255,255,255,0.1)",
      "border-radius: 10px",
      "overflow: hidden",
      "backdrop-filter: blur(6px)",
      "box-shadow: 0 4px 24px rgba(0,0,0,0.5)",
      "pointer-events: none",
      "user-select: none",
    ].join(";");

    // --- Header ---
    const header = document.createElement("div");
    header.style.cssText = [
      "padding: 7px 10px 5px",
      "background: rgba(124,58,237,0.35)",
      "border-bottom: 1px solid rgba(255,255,255,0.08)",
      "display: flex",
      "align-items: center",
      "gap: 6px",
    ].join(";");

    const trophy = document.createElement("span");
    trophy.textContent = "🏆";
    trophy.style.fontSize = "14px";

    const title = document.createElement("span");
    title.textContent = "Leaderboard";
    title.style.cssText = [
      "color: #fff",
      "font-family: 'Fredoka One', sans-serif",
      "font-size: 13px",
      "letter-spacing: 0.5px",
    ].join(";");

    header.appendChild(trophy);
    header.appendChild(title);

    // --- List ---
    this.listEl = document.createElement("div");
    this.listEl.style.cssText = [
      "padding: 4px 0",
      "display: flex",
      "flex-direction: column",
    ].join(";");

    this.container.appendChild(header);
    this.container.appendChild(this.listEl);
    document.body.appendChild(this.container);
  }

  update(entries: LeaderboardEntry[]): void {
    if (!this.listEl) return;

    const sorted = [...entries]
      .sort((a, b) => b.points - a.points)
      .slice(0, MAX_ENTRIES);

    this.listEl.innerHTML = "";

    sorted.forEach((entry, idx) => {
      const rank = idx + 1;
      const rankInfo = RANK_STYLES[rank];

      const row = document.createElement("div");
      row.style.cssText = [
        "display: flex",
        "align-items: center",
        "padding: 3px 10px",
        "gap: 6px",
        rank === 1 ? "background: rgba(251,191,36,0.08);" : "",
      ].join(";");

      // Rank
      const rankEl = document.createElement("span");
      rankEl.style.cssText = [
        "min-width: 22px",
        "font-family: 'Fredoka One', sans-serif",
        "font-size: 12px",
        rankInfo ? `color: ${rankInfo.color}` : "color: rgba(255,255,255,0.45)",
        "text-align: center",
      ].join(";");
      rankEl.textContent = rankInfo ? rankInfo.badge : `#${rank}`;

      // Nickname
      const nameEl = document.createElement("span");
      nameEl.style.cssText = [
        "flex: 1",
        "font-family: 'Fredoka One', sans-serif",
        "font-size: 12px",
        "color: rgba(255,255,255,0.88)",
        "overflow: hidden",
        "text-overflow: ellipsis",
        "white-space: nowrap",
      ].join(";");
      nameEl.textContent = entry.nickname;
      nameEl.title = entry.nickname;

      // Points
      const ptsEl = document.createElement("span");
      ptsEl.style.cssText = [
        "font-family: 'Fredoka One', sans-serif",
        "font-size: 11px",
        rankInfo ? `color: ${rankInfo.color}` : "color: rgba(255,255,255,0.5)",
        "white-space: nowrap",
      ].join(";");
      ptsEl.textContent = this._formatPoints(entry.points);

      // Kills
      const killsEl = document.createElement("span");
      killsEl.style.cssText = [
        "font-family: 'Fredoka One', sans-serif",
        "font-size: 10px",
        "color: rgba(239,68,68,0.85)",
        "white-space: nowrap",
        "min-width: 28px",
        "text-align: right",
      ].join(";");
      killsEl.textContent = `⚔${entry.kills ?? 0}`;
      killsEl.title = `${entry.kills ?? 0} kills`;

      row.appendChild(rankEl);
      row.appendChild(nameEl);
      row.appendChild(ptsEl);
      row.appendChild(killsEl);
      this.listEl!.appendChild(row);

      // Divider (not after last)
      if (idx < sorted.length - 1) {
        const div = document.createElement("div");
        div.style.cssText = [
          "height: 1px",
          "margin: 0 8px",
          "background: rgba(255,255,255,0.05)",
        ].join(";");
        this.listEl!.appendChild(div);
      }
    });
  }

  private _formatPoints(pts: number): string {
    if (pts >= 1000000) return (pts / 1000000).toFixed(1) + "M";
    if (pts >= 1000) return (pts / 1000).toFixed(1) + "K";
    return String(pts);
  }
}
