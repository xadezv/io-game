import { io, Socket } from 'socket.io-client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PacketHandler = (data: unknown[]) => void;

// ---------------------------------------------------------------------------
// WSClient
// ---------------------------------------------------------------------------

/**
 * Thin wrapper around socket.io-client that speaks the game's array-based
 * packet protocol: every message is [packetTypeId, ...payload].
 */
export class WSClient {
  private readonly socket:   Socket;
  private readonly handlers: Map<number, PacketHandler> = new Map();
  private messageCallback: ((data: unknown[]) => void) | null = null;
  private disconnectCallback: (() => void) | null = null;

  constructor(url: string) {
    this.socket = io(url, {
      transports:         ['websocket'],
      reconnection:       true,
      reconnectionDelay:  1000,
      reconnectionAttempts: 5,
    });

    // Route inbound messages — supports both per-type handlers and a global cb
    this.socket.on('msg', (data: unknown[]) => {
      if (!Array.isArray(data) || data.length === 0) return;

      // Per-type handler
      const typeId = data[0] as number;
      const handler = this.handlers.get(typeId);
      if (handler) handler(data);

      // Global handler
      this.messageCallback?.(data);
    });

    this.socket.on('disconnect', () => {
      this.disconnectCallback?.();
    });
  }

  // -------------------------------------------------------------------------
  // Connection
  // -------------------------------------------------------------------------

  connect(): void {
    // socket.io connects automatically on construction; this method is provided
    // for compatibility with the spec and for explicit reconnect scenarios.
    if (!this.socket.connected) {
      this.socket.connect();
    }
  }

  // -------------------------------------------------------------------------
  // Sending
  // -------------------------------------------------------------------------

  send(data: unknown[]): void {
    if (this.socket.connected) {
      this.socket.emit('msg', data);
    }
  }

  // -------------------------------------------------------------------------
  // Receiving
  // -------------------------------------------------------------------------

  /**
   * Register a handler for a specific packet type id.
   * Called every time a message whose first element equals `typeId` arrives.
   */
  on(typeId: number, handler: PacketHandler): void {
    this.handlers.set(typeId, handler);
  }

  /** Global message callback — called for *every* inbound message. */
  onMessage(cb: (data: unknown[]) => void): void {
    this.messageCallback = cb;
  }

  onConnect(cb: () => void): void {
    this.socket.on('connect', cb);
  }

  onDisconnect(cb: () => void): void {
    this.disconnectCallback = cb;
    // Also register directly so it fires even if onDisconnect is called late
    this.socket.on('disconnect', cb);
  }

  // -------------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------------

  isConnected(): boolean {
    return this.socket.connected;
  }

  get connected(): boolean {
    return this.socket.connected;
  }
}

export default WSClient;
