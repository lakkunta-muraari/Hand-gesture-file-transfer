import type { WebSocket } from "ws";
import type { DeviceInfo, DeviceType, ServerMessage } from "./types.js";

interface Member {
  ws: WebSocket;
  device: DeviceInfo;
}

/**
 * A "room" is just a group of devices that scanned/entered the same
 * code. It exists only in server memory - nothing is persisted to
 * disk, so a restart clears everything (that's fine, rooms are
 * meant to be short-lived per session).
 *
 * v3: Sequential device naming - Phone 1, Phone 2, Laptop 1, etc.
 */
class RoomManager {
  private rooms = new Map<string, Map<string, Member>>();
  /** Per-room counters for sequential device naming */
  private counters = new Map<string, { phone: number; laptop: number }>();

  join(roomCode: string, ws: WebSocket, device: DeviceInfo): void {
    let room = this.rooms.get(roomCode);
    if (!room) {
      room = new Map();
      this.rooms.set(roomCode, room);
      this.counters.set(roomCode, { phone: 0, laptop: 0 });
    }

    // Assign sequential name
    const counter = this.counters.get(roomCode)!;
    if (device.type === "phone") {
      counter.phone++;
      device.name = `Phone ${counter.phone}`;
    } else {
      counter.laptop++;
      device.name = `Laptop ${counter.laptop}`;
    }

    room.set(device.id, { ws, device });
    this.broadcastDeviceList(roomCode);
  }

  leave(roomCode: string, deviceId: string): void {
    const room = this.rooms.get(roomCode);
    if (!room) return;
    room.delete(deviceId);
    if (room.size === 0) {
      this.rooms.delete(roomCode);
      this.counters.delete(roomCode);
    } else {
      this.broadcastDeviceList(roomCode);
    }
  }

  /** Get the device info for a member */
  getDevice(roomCode: string, deviceId: string): DeviceInfo | undefined {
    return this.rooms.get(roomCode)?.get(deviceId)?.device;
  }

  /** Used to relay a WebRTC offer/answer/ICE to one peer. */
  sendTo(roomCode: string, targetId: string, message: ServerMessage): boolean {
    const room = this.rooms.get(roomCode);
    const member = room?.get(targetId);
    if (!member) return false;
    member.ws.send(JSON.stringify(message));
    return true;
  }

  /** Broadcast a message to all members EXCEPT the sender */
  broadcastExcept(roomCode: string, senderId: string, message: ServerMessage): void {
    const room = this.rooms.get(roomCode);
    if (!room) return;
    const payload = JSON.stringify(message);
    for (const [id, member] of room) {
      if (id !== senderId) {
        member.ws.send(payload);
      }
    }
  }

  /** How many devices are currently in a room. */
  roomSize(roomCode: string): number {
    return this.rooms.get(roomCode)?.size ?? 0;
  }

  private broadcastDeviceList(roomCode: string): void {
    const room = this.rooms.get(roomCode);
    if (!room) return;
    const devices: DeviceInfo[] = Array.from(room.values()).map((m) => m.device);
    const message: ServerMessage = { type: "device-list", devices };
    const payload = JSON.stringify(message);
    for (const member of room.values()) {
      member.ws.send(payload);
    }
  }
}

export const roomManager = new RoomManager();
