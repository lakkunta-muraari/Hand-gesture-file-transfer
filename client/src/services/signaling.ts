import type { DeviceInfo, DeviceType } from "../types/device";

export type ServerMessage =
  | { type: "joined"; selfId: string; selfName: string; roomCode: string }
  | { type: "device-list"; devices: DeviceInfo[] }
  | { type: "error"; message: string }
  | { type: "signal"; fromId: string; data: unknown }
  | { type: "broadcast"; fromId: string; data: unknown };

type Listener<T> = (payload: T) => void;

class SignalingService {
  private ws: WebSocket | null = null;
  private listeners: Record<string, Listener<any>[]> = {};
  private lastDeviceList: DeviceInfo[] | null = null;
  private _selfId: string | null = null;
  private _selfName: string | null = null;

  get selfId(): string | null {
    return this._selfId;
  }

  get selfName(): string | null {
    return this._selfName;
  }

  private resolveUrl(): string {
    const configured = import.meta.env.VITE_SIGNALING_URL as string | undefined;
    if (configured) return configured;
    return `ws://${window.location.hostname}:4000`;
  }

  connect(roomCode: string, name: string, deviceType: DeviceType): Promise<{ selfId: string; selfName: string }> {
    return new Promise((resolve, reject) => {
      const url = this.resolveUrl();
      console.log(`[signaling] connecting to ${url}`);
      const ws = new WebSocket(url);
      this.ws = ws;

      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error(`Signaling server at ${url} did not respond. Make sure the server is running.`));
      }, 8000);

      ws.onopen = () => {
        clearTimeout(timeout);
        ws.send(JSON.stringify({ type: "join", roomCode, name, deviceType }));
      };

      ws.onmessage = (event) => {
        const message: ServerMessage = JSON.parse(event.data);
        if (message.type === "joined") {
          this._selfId = message.selfId;
          this._selfName = message.selfName;
          resolve({ selfId: message.selfId, selfName: message.selfName });
        }
        if (message.type === "error") reject(new Error(message.message));
        if (message.type === "device-list") this.lastDeviceList = message.devices;
        this.listeners[message.type]?.forEach((cb) => cb(message));
      };

      ws.onerror = () => {
        clearTimeout(timeout);
        reject(new Error(`Could not reach the signaling server at ${url}. Make sure server is running on port 4000.`));
      };
    });
  }

  on<T extends ServerMessage["type"]>(type: T, cb: Listener<Extract<ServerMessage, { type: T }>>): () => void {
    (this.listeners[type] ??= []).push(cb as Listener<any>);
    if (type === "device-list" && this.lastDeviceList) {
      cb({ type: "device-list", devices: this.lastDeviceList } as any);
    }
    return () => {
      this.listeners[type] = (this.listeners[type] ?? []).filter((l) => l !== cb);
    };
  }

  sendSignal(targetId: string, data: unknown): void {
    this.ws?.send(JSON.stringify({ type: "signal", targetId, data }));
  }

  sendBroadcast(data: unknown): void {
    this.ws?.send(JSON.stringify({ type: "broadcast", data }));
  }

  disconnect(): void {
    this.ws?.send(JSON.stringify({ type: "leave" }));
    this.ws?.close();
    this.ws = null;
    this._selfId = null;
    this._selfName = null;
  }
}

export const signaling = new SignalingService();
