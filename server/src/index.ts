import "dotenv/config";
import express from "express";
import cors from "cors";
import http from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import { v4 as uuid } from "uuid";
import { roomManager } from "./signaling/roomManager.js";
import type { ClientMessage, DeviceInfo, ServerMessage } from "./signaling/types.js";

const PORT = Number(process.env.PORT) || 4000;

const app = express();
app.use(cors());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const socketState = new WeakMap<WebSocket, { roomCode: string; deviceId: string }>();

wss.on("connection", (ws) => {
  ws.on("message", (raw) => {
    let message: ClientMessage;
    try {
      message = JSON.parse(raw.toString());
    } catch {
      send(ws, { type: "error", message: "Malformed message: not valid JSON." });
      return;
    }

    switch (message.type) {
      case "join": {
        const roomCode = message.roomCode.trim().toUpperCase();
        const device: DeviceInfo = {
          id: uuid(),
          name: "",
          type: message.deviceType,
        };
        socketState.set(ws, { roomCode, deviceId: device.id });
        roomManager.join(roomCode, ws, device);
        send(ws, { type: "joined", selfId: device.id, selfName: device.name, roomCode });
        console.log(
          `[join] ${device.name} (${device.id}) -> room "${roomCode}" (${roomManager.roomSize(
            roomCode
          )} device(s) now in this room)`
        );
        break;
      }

      case "leave": {
        const state = socketState.get(ws);
        if (state) {
          roomManager.leave(state.roomCode, state.deviceId);
          socketState.delete(ws);
        }
        break;
      }

      case "signal": {
        const state = socketState.get(ws);
        if (!state) {
          send(ws, { type: "error", message: "You must join a room before signaling." });
          return;
        }
        const delivered = roomManager.sendTo(state.roomCode, message.targetId, {
          type: "signal",
          fromId: state.deviceId,
          data: message.data,
        });
        if (!delivered) {
          send(ws, { type: "error", message: `No device with id ${message.targetId} in this room.` });
        }
        break;
      }

      case "broadcast": {
        const state = socketState.get(ws);
        if (!state) {
          send(ws, { type: "error", message: "You must join a room before broadcasting." });
          return;
        }
        roomManager.broadcastExcept(state.roomCode, state.deviceId, {
          type: "broadcast",
          fromId: state.deviceId,
          data: message.data,
        });
        break;
      }
    }
  });

  ws.on("close", () => {
    const state = socketState.get(ws);
    if (state) {
      roomManager.leave(state.roomCode, state.deviceId);
      console.log(`[leave] device ${state.deviceId} left room "${state.roomCode}"`);
      socketState.delete(ws);
    }
  });
});

function send(ws: WebSocket, message: ServerMessage): void {
  ws.send(JSON.stringify(message));
}

server.listen(PORT, () => {
  console.log(`GESTURA signaling server listening on http://localhost:${PORT}`);
});
