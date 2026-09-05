import { signaling } from "./signaling";

export type PeerState = "idle" | "connecting" | "connected" | "failed" | "closed";

type SignalPayload =
  | { kind: "offer"; sdp: RTCSessionDescriptionInit }
  | { kind: "answer"; sdp: RTCSessionDescriptionInit }
  | { kind: "ice"; candidate: RTCIceCandidateInit };

interface PeerEntry {
  pc: RTCPeerConnection;
  channel: RTCDataChannel | null;
  makingOffer: boolean;
  polite: boolean;
  pendingCandidates: RTCIceCandidateInit[];
}

type StateListener = (deviceId: string, state: PeerState) => void;
type MessageListener = (deviceId: string, text: string) => void;
type BinaryListener = (deviceId: string, buffer: ArrayBuffer) => void;

const CONNECTION_STATE_MAP: Record<RTCPeerConnectionState, PeerState> = {
  new: "connecting",
  connecting: "connecting",
  connected: "connected",
  disconnected: "failed",
  failed: "failed",
  closed: "closed",
};

class WebRTCService {
  private peers = new Map<string, PeerEntry>();
  private stateListeners: StateListener[] = [];
  private messageListeners: MessageListener[] = [];
  private binaryListeners: BinaryListener[] = [];

  constructor() {
    signaling.on("signal", (msg) => {
      this.handleSignal(msg.fromId, msg.data as SignalPayload).catch((err) =>
        console.error("[webrtc] failed to handle signal:", err)
      );
    });
  }

  onStateChange(cb: StateListener): () => void {
    this.stateListeners.push(cb);
    return () => {
      this.stateListeners = this.stateListeners.filter((l) => l !== cb);
    };
  }

  onMessage(cb: MessageListener): () => void {
    this.messageListeners.push(cb);
    return () => {
      this.messageListeners = this.messageListeners.filter((l) => l !== cb);
    };
  }

  onBinaryMessage(cb: BinaryListener): () => void {
    this.binaryListeners.push(cb);
    return () => {
      this.binaryListeners = this.binaryListeners.filter((l) => l !== cb);
    };
  }

  private emitState(deviceId: string, state: PeerState): void {
    this.stateListeners.forEach((cb) => cb(deviceId, state));
  }

  private getOrCreatePeer(deviceId: string): PeerEntry {
    const existing = this.peers.get(deviceId);
    if (existing) return existing;

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
      ],
    });

    const polite = (signaling.selfId ?? "") < deviceId;
    const entry: PeerEntry = {
      pc,
      channel: null,
      makingOffer: false,
      polite,
      pendingCandidates: [],
    };
    this.peers.set(deviceId, entry);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        signaling.sendSignal(deviceId, {
          kind: "ice",
          candidate: event.candidate.toJSON(),
        } satisfies SignalPayload);
      }
    };

    pc.onconnectionstatechange = () => {
      console.log(`[webrtc] ${deviceId} connection state -> ${pc.connectionState}`);
      this.emitState(deviceId, CONNECTION_STATE_MAP[pc.connectionState]);
    };

    pc.ondatachannel = (event) => {
      console.log(`[webrtc] incoming data channel from ${deviceId}`);
      this.wireChannel(deviceId, event.channel);
    };

    return entry;
  }

  private wireChannel(deviceId: string, channel: RTCDataChannel): void {
    channel.binaryType = "arraybuffer";
    channel.bufferedAmountLowThreshold = 64 * 1024;

    const entry = this.peers.get(deviceId);
    if (entry) entry.channel = channel;

    channel.onopen = () => {
      console.log(`[webrtc] data channel to ${deviceId} is open`);
      this.emitState(deviceId, "connected");
    };
    channel.onmessage = (event) => {
      if (typeof event.data === "string") {
        this.messageListeners.forEach((cb) => cb(deviceId, event.data));
      } else {
        this.binaryListeners.forEach((cb) => cb(deviceId, event.data));
      }
    };
    channel.onclose = () => this.emitState(deviceId, "closed");
    channel.onerror = (err) => console.error(`[webrtc] channel error on ${deviceId}:`, err);
  }

  async connectTo(deviceId: string): Promise<void> {
    const entry = this.getOrCreatePeer(deviceId);
    if (entry.channel?.readyState === "open") return;
    if (entry.pc.signalingState !== "stable") return;

    this.emitState(deviceId, "connecting");

    if (!entry.channel) {
      const channel = entry.pc.createDataChannel("gestura");
      this.wireChannel(deviceId, channel);
    }

    try {
      entry.makingOffer = true;
      const offer = await entry.pc.createOffer();
      if (entry.pc.signalingState !== "stable") return;

      await entry.pc.setLocalDescription(offer);
      signaling.sendSignal(deviceId, { kind: "offer", sdp: entry.pc.localDescription! } satisfies SignalPayload);
      console.log(`[webrtc] sent offer to ${deviceId}`);
    } catch (err) {
      console.warn(`[webrtc] offer to ${deviceId} failed:`, err);
    } finally {
      entry.makingOffer = false;
    }
  }

  async ensureConnection(deviceId: string, timeoutMs = 8000): Promise<boolean> {
    if (this.getState(deviceId) === "connected") return true;

    if (this.getState(deviceId) === "idle") {
      await this.connectTo(deviceId);
    }

    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (this.getState(deviceId) === "connected") return true;
      await new Promise((r) => setTimeout(r, 100));
    }
    return this.getState(deviceId) === "connected";
  }

  private async flushCandidates(entry: PeerEntry, fromId: string): Promise<void> {
    while (entry.pendingCandidates.length > 0) {
      const candidate = entry.pendingCandidates.shift()!;
      try {
        await entry.pc.addIceCandidate(candidate);
      } catch (err) {
        console.warn(`[webrtc] could not add queued ICE candidate from ${fromId}:`, err);
      }
    }
  }

  private async handleSignal(fromId: string, data: SignalPayload): Promise<void> {
    const entry = this.getOrCreatePeer(fromId);

    if (data.kind === "offer") {
      const offerCollision = entry.makingOffer || entry.pc.signalingState !== "stable";
      const ignoreOffer = !entry.polite && offerCollision;

      if (ignoreOffer) {
        console.log(`[webrtc] ignoring colliding offer from ${fromId}`);
        return;
      }

      if (offerCollision && entry.polite) {
        try {
          await entry.pc.setLocalDescription({ type: "rollback" });
        } catch (e) {
          console.warn(`[webrtc] rollback on ${fromId} failed:`, e);
        }
      }

      this.emitState(fromId, "connecting");
      await entry.pc.setRemoteDescription(data.sdp);
      await this.flushCandidates(entry, fromId);

      const answer = await entry.pc.createAnswer();
      await entry.pc.setLocalDescription(answer);
      signaling.sendSignal(fromId, { kind: "answer", sdp: entry.pc.localDescription! } satisfies SignalPayload);
      console.log(`[webrtc] accepted offer from ${fromId}, sent answer`);
    } else if (data.kind === "answer") {
      await entry.pc.setRemoteDescription(data.sdp);
      await this.flushCandidates(entry, fromId);
      console.log(`[webrtc] received answer from ${fromId}`);
    } else if (data.kind === "ice") {
      if (!entry.pc.remoteDescription) {
        // Queue candidate until remote description is set
        entry.pendingCandidates.push(data.candidate);
      } else {
        try {
          await entry.pc.addIceCandidate(data.candidate);
        } catch (err) {
          console.warn(`[webrtc] could not add ICE candidate from ${fromId}:`, err);
        }
      }
    }
  }

  send(deviceId: string, data: string | ArrayBuffer): boolean {
    const channel = this.peers.get(deviceId)?.channel;
    if (!channel || channel.readyState !== "open") {
      return false;
    }
    try {
      channel.send(data as any);
      return true;
    } catch (err) {
      console.warn(`[webrtc] channel.send error to ${deviceId}:`, err);
      return false;
    }
  }

  bufferedAmount(deviceId: string): number {
    return this.peers.get(deviceId)?.channel?.bufferedAmount ?? 0;
  }

  getState(deviceId: string): PeerState {
    const entry = this.peers.get(deviceId);
    if (!entry) return "idle";
    if (entry.channel?.readyState === "open") return "connected";
    return CONNECTION_STATE_MAP[entry.pc.connectionState];
  }

  disconnect(deviceId: string): void {
    const entry = this.peers.get(deviceId);
    if (!entry) return;
    entry.channel?.close();
    entry.pc.close();
    this.peers.delete(deviceId);
    this.emitState(deviceId, "closed");
    console.log(`[webrtc] closed connection to ${deviceId}`);
  }
}

export const webrtc = new WebRTCService();
