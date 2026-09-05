/**
 * These types describe the small JSON messages that travel over the
 * WebSocket connection. This channel is ONLY used to introduce devices
 * to each other, pass WebRTC handshake info, and relay broadcast
 * messages (e.g. "I am now sharing file X"). Actual file bytes
 * never travel through here — they go over WebRTC data channels.
 */

export type DeviceType = "phone" | "laptop";

export interface DeviceInfo {
  id: string;        // unique per browser tab/app instance, assigned by the server
  name: string;      // server-assigned sequential name: "Phone 1", "Laptop 2", etc.
  type: DeviceType;
}

/** Messages a client can send to the server. */
export type ClientMessage =
  | { type: "join"; roomCode: string; name: string; deviceType: DeviceType }
  | { type: "leave" }
  | { type: "signal"; targetId: string; data: unknown }
  | { type: "broadcast"; data: unknown };

/** Messages the server can send to a client. */
export type ServerMessage =
  | { type: "joined"; selfId: string; selfName: string; roomCode: string }
  | { type: "device-list"; devices: DeviceInfo[] }
  | { type: "error"; message: string }
  | { type: "signal"; fromId: string; data: unknown }
  | { type: "broadcast"; fromId: string; data: unknown };
