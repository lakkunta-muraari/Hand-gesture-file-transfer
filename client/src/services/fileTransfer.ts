import { webrtc } from "./webrtc";
import { saveChunkToIDB, assembleBlobFromIDB, clearTransferChunksFromIDB } from "./indexedDBStorage";

// 64 KB optimal chunk size for high-throughput WebRTC data channels
const CHUNK_SIZE = 64 * 1024;
// 1 MB pipeline buffer to maximize throughput over Wi-Fi without stalling
const MAX_BUFFERED_AMOUNT = 1024 * 1024;
const ACCEPT_TIMEOUT_MS = 60_000;

type ControlMessage =
  | { kind: "file-meta"; transferId: string; name: string; mimeType: string; size: number; totalChunks: number }
  | { kind: "file-accept"; transferId: string }
  | { kind: "file-reject"; transferId: string }
  | { kind: "file-complete"; transferId: string }
  | { kind: "file-cancel"; transferId: string };

type FileMetaMessage = Extract<ControlMessage, { kind: "file-meta" }>;

export type TransferDirection = "send" | "receive";
export type TransferStatus =
  | "awaiting-accept"
  | "in-progress"
  | "complete"
  | "rejected"
  | "cancelled"
  | "error";

export interface TransferProgress {
  transferId: string;
  deviceId: string;
  direction: TransferDirection;
  name: string;
  mimeType: string;
  size: number;
  bytesTransferred: number;
  status: TransferStatus;
  blob?: Blob;
  startedAt: number;
}

type ProgressListener = (t: TransferProgress) => void;

interface IncomingState {
  meta: FileMetaMessage;
  chunkCount: number;
  bytesReceived: number;
  startedAt: number;
  useIndexedDB: boolean;
  inMemoryChunks: Uint8Array[];
}

interface PendingOffer {
  meta: FileMetaMessage;
  deviceId: string;
}

class FileTransferService {
  private incoming = new Map<string, IncomingState>();
  private pendingOffers = new Map<string, PendingOffer>();
  private sendContexts = new Map<string, Omit<TransferProgress, "bytesTransferred" | "status">>();
  private acceptWaiters = new Map<string, (accepted: boolean) => void>();
  private cancelledTransfers = new Set<string>();
  private progressListeners: ProgressListener[] = [];

  private _stagedFile: File | null = null;
  private autoAcceptEnabled: boolean = true;

  constructor() {
    webrtc.onMessage((deviceId, raw) => this.handleControlMessage(deviceId, raw));
    webrtc.onBinaryMessage((deviceId, buffer) => this.handleChunk(deviceId, buffer));

    webrtc.onStateChange((deviceId, state) => {
      if (state === "failed" || state === "closed") {
        this.failActiveTransfersFor(deviceId);
      }
    });
  }

  private _stagedFiles: File[] = [];

  stageFile(file: File | null): void {
    this._stagedFile = file;
    this._stagedFiles = file ? [file] : [];
    console.log(`[fileTransfer] Staged file: ${file ? file.name : "none"}`);
  }

  stageFiles(files: File[]): void {
    this._stagedFiles = files;
    this._stagedFile = files[0] || null;
    console.log(`[fileTransfer] Staged ${files.length} file(s)`);
  }

  getStagedFile(): File | null {
    return this._stagedFile;
  }

  getStagedFiles(): File[] {
    return this._stagedFiles;
  }

  async sendFiles(
    deviceId: string,
    files: File[],
    onEachComplete?: (file: File, index: number, total: number) => void
  ): Promise<void> {
    for (let i = 0; i < files.length; i++) {
      await this.sendFile(deviceId, files[i]);
      onEachComplete?.(files[i], i + 1, files.length);
    }
  }

  setAutoAccept(enabled: boolean): void {
    this.autoAcceptEnabled = enabled;
  }

  onProgress(cb: ProgressListener): () => void {
    this.progressListeners.push(cb);
    return () => {
      this.progressListeners = this.progressListeners.filter((l) => l !== cb);
    };
  }

  private lastEmitTimes = new Map<string, number>();

  private emit(t: TransferProgress): void {
    this.progressListeners.forEach((cb) => cb(t));
  }

  private emitThrottled(t: TransferProgress, force = false): void {
    const now = Date.now();
    const last = this.lastEmitTimes.get(t.transferId) || 0;
    if (force || t.status !== "in-progress" || now - last >= 80) {
      this.lastEmitTimes.set(t.transferId, now);
      this.emit(t);
    }
  }

  async sendFile(deviceId: string, file: File): Promise<void> {
    const connected = await webrtc.ensureConnection(deviceId, 8000);
    if (!connected) {
      console.error(`[fileTransfer] connection to ${deviceId} failed.`);
      throw new Error(`Connection to peer not established.`);
    }

    const transferId = crypto.randomUUID();
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    const mimeType = file.type || "application/octet-stream";
    const startedAt = Date.now();

    const baseProgress: Omit<TransferProgress, "bytesTransferred" | "status"> = {
      transferId,
      deviceId,
      direction: "send",
      name: file.name,
      mimeType,
      size: file.size,
      startedAt,
    };
    this.sendContexts.set(transferId, baseProgress);

    const metaMessage: ControlMessage = {
      kind: "file-meta",
      transferId,
      name: file.name,
      mimeType,
      size: file.size,
      totalChunks,
    };

    const metaSent = webrtc.send(deviceId, JSON.stringify(metaMessage));
    if (!metaSent) {
      this.sendContexts.delete(transferId);
      this.emit({ ...baseProgress, bytesTransferred: 0, status: "error" });
      throw new Error("Could not send file metadata to peer");
    }

    this.emit({ ...baseProgress, bytesTransferred: 0, status: "awaiting-accept" });

    const accepted = await this.waitForAcceptance(transferId);
    if (this.cancelledTransfers.has(transferId)) {
      this.cancelledTransfers.delete(transferId);
      this.sendContexts.delete(transferId);
      return;
    }

    if (!accepted) {
      this.sendContexts.delete(transferId);
      this.emit({ ...baseProgress, bytesTransferred: 0, status: "rejected" });
      return;
    }

    this.emit({ ...baseProgress, bytesTransferred: 0, status: "in-progress" });

    let offset = 0;
    while (offset < file.size) {
      if (this.cancelledTransfers.has(transferId) || webrtc.getState(deviceId) !== "connected") {
        this.cancelledTransfers.delete(transferId);
        this.sendContexts.delete(transferId);
        webrtc.send(deviceId, JSON.stringify({ kind: "file-cancel", transferId } satisfies ControlMessage));
        this.emit({
          ...baseProgress,
          bytesTransferred: offset,
          status: webrtc.getState(deviceId) !== "connected" ? "error" : "cancelled",
        });
        return;
      }

      await this.waitForBufferSpace(deviceId);

      const slice = file.slice(offset, offset + CHUNK_SIZE);
      if (slice.size === 0) {
        console.warn(`[fileTransfer] slice returned 0 bytes at offset ${offset}, stopping send`);
        break;
      }
      const buffer = await slice.arrayBuffer();

      // Retry up to 3 times in case mobile data channel buffer is momentarily saturated
      let sent = false;
      for (let attempt = 0; attempt < 3; attempt++) {
        await this.waitForBufferSpace(deviceId);
        if (webrtc.send(deviceId, buffer)) {
          sent = true;
          break;
        }
        await new Promise((r) => setTimeout(r, 20));
      }

      if (!sent) {
        console.error(`[fileTransfer] failed to send chunk at offset ${offset}`);
        this.sendContexts.delete(transferId);
        this.emit({ ...baseProgress, bytesTransferred: offset, status: "error" });
        return;
      }

      offset += slice.size;
      this.emitThrottled({ ...baseProgress, bytesTransferred: offset, status: "in-progress" });
    }

    webrtc.send(deviceId, JSON.stringify({ kind: "file-complete", transferId } satisfies ControlMessage));
    this.sendContexts.delete(transferId);
    this.emit({ ...baseProgress, bytesTransferred: file.size, status: "complete" });
  }

  cancelSend(transferId: string): void {
    this.cancelledTransfers.add(transferId);
  }

  acceptIncoming(deviceId: string): void {
    const pending = this.pendingOffers.get(deviceId);
    if (!pending) return;

    this.pendingOffers.delete(deviceId);

    const useIndexedDB = pending.meta.size > 1500 * 1024 * 1024; // Use memory for files <= 1.5 GB for max speed
    this.incoming.set(deviceId, {
      meta: pending.meta,
      chunkCount: 0,
      bytesReceived: 0,
      startedAt: Date.now(),
      useIndexedDB,
      inMemoryChunks: [],
    });

    webrtc.send(deviceId, JSON.stringify({ kind: "file-accept", transferId: pending.meta.transferId } satisfies ControlMessage));

    this.emit({
      transferId: pending.meta.transferId,
      deviceId,
      direction: "receive",
      name: pending.meta.name,
      mimeType: pending.meta.mimeType,
      size: pending.meta.size,
      bytesTransferred: 0,
      status: "in-progress",
      startedAt: Date.now(),
    });
  }

  rejectIncoming(deviceId: string): void {
    const pending = this.pendingOffers.get(deviceId);
    if (!pending) return;

    this.pendingOffers.delete(deviceId);
    webrtc.send(deviceId, JSON.stringify({ kind: "file-reject", transferId: pending.meta.transferId } satisfies ControlMessage));

    this.emit({
      transferId: pending.meta.transferId,
      deviceId,
      direction: "receive",
      name: pending.meta.name,
      mimeType: pending.meta.mimeType,
      size: pending.meta.size,
      bytesTransferred: 0,
      status: "rejected",
      startedAt: Date.now(),
    });
  }

  private async waitForBufferSpace(deviceId: string): Promise<void> {
    while (webrtc.bufferedAmount(deviceId) > MAX_BUFFERED_AMOUNT) {
      await new Promise((resolve) => setTimeout(resolve, 4));
    }
  }

  private waitForAcceptance(transferId: string): Promise<boolean> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.acceptWaiters.delete(transferId);
        resolve(false);
      }, ACCEPT_TIMEOUT_MS);

      this.acceptWaiters.set(transferId, (accepted) => {
        clearTimeout(timer);
        resolve(accepted);
      });
    });
  }

  private async handleControlMessage(deviceId: string, raw: string): Promise<void> {
    let message: ControlMessage;
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || !("kind" in parsed)) return;
      message = parsed as ControlMessage;
    } catch {
      return;
    }

    switch (message.kind) {
      case "file-meta": {
        if (!Number.isFinite(message.size) || message.size < 0 || message.size > 20 * 1024 * 1024 * 1024) {
          return;
        }
        this.pendingOffers.set(deviceId, { meta: message, deviceId });

        if (this.autoAcceptEnabled) {
          setTimeout(() => this.acceptIncoming(deviceId), 50);
        } else {
          this.emit({
            transferId: message.transferId,
            deviceId,
            direction: "receive",
            name: message.name,
            mimeType: message.mimeType,
            size: message.size,
            bytesTransferred: 0,
            status: "awaiting-accept",
            startedAt: Date.now(),
          });
        }
        break;
      }

      case "file-accept": {
        this.acceptWaiters.get(message.transferId)?.(true);
        this.acceptWaiters.delete(message.transferId);
        break;
      }

      case "file-reject": {
        this.acceptWaiters.get(message.transferId)?.(false);
        this.acceptWaiters.delete(message.transferId);
        break;
      }

      case "file-complete": {
        const state = this.incoming.get(deviceId);
        if (!state || state.meta.transferId !== message.transferId) return;

        let blob: Blob;
        if (state.useIndexedDB) {
          blob = await assembleBlobFromIDB(state.meta.transferId, state.meta.mimeType, state.meta.totalChunks);
          await clearTransferChunksFromIDB(state.meta.transferId);
        } else {
          blob = new Blob(state.inMemoryChunks as BlobPart[], { type: state.meta.mimeType });
        }

        const stillOurs = this.incoming.get(deviceId);
        if (stillOurs && stillOurs.meta.transferId === state.meta.transferId) {
          this.incoming.delete(deviceId);
        }

        this.emit({
          transferId: state.meta.transferId,
          deviceId,
          direction: "receive",
          name: state.meta.name,
          mimeType: state.meta.mimeType,
          size: state.meta.size,
          bytesTransferred: state.bytesReceived,
          status: "complete",
          blob,
          startedAt: state.startedAt,
        });

        break;
      }

      case "file-cancel": {
        const pending = this.pendingOffers.get(deviceId);
        if (pending && pending.meta.transferId === message.transferId) {
          this.pendingOffers.delete(deviceId);
          this.emit({
            transferId: pending.meta.transferId,
            deviceId,
            direction: "receive",
            name: pending.meta.name,
            mimeType: pending.meta.mimeType,
            size: pending.meta.size,
            bytesTransferred: 0,
            status: "cancelled",
            startedAt: Date.now(),
          });
          return;
        }

        const state = this.incoming.get(deviceId);
        if (!state || state.meta.transferId !== message.transferId) return;
        if (state.useIndexedDB) {
          await clearTransferChunksFromIDB(state.meta.transferId);
        }
        const stillOurs = this.incoming.get(deviceId);
        if (stillOurs && stillOurs.meta.transferId === state.meta.transferId) {
          this.incoming.delete(deviceId);
        }
        this.emit({
          transferId: state.meta.transferId,
          deviceId,
          direction: "receive",
          name: state.meta.name,
          mimeType: state.meta.mimeType,
          size: state.meta.size,
          bytesTransferred: state.bytesReceived,
          status: "cancelled",
          startedAt: state.startedAt,
        });
        break;
      }
    }
  }

  private async handleChunk(deviceId: string, buffer: ArrayBuffer): Promise<void> {
    const state = this.incoming.get(deviceId);
    if (!state) return;

    const chunkIndex = state.chunkCount++;
    state.bytesReceived += buffer.byteLength;

    if (state.useIndexedDB) {
      await saveChunkToIDB(state.meta.transferId, chunkIndex, buffer);
    } else {
      state.inMemoryChunks[chunkIndex] = new Uint8Array(buffer);
    }

    this.emitThrottled({
      transferId: state.meta.transferId,
      deviceId,
      direction: "receive",
      name: state.meta.name,
      mimeType: state.meta.mimeType,
      size: state.meta.size,
      bytesTransferred: state.bytesReceived,
      status: "in-progress",
      startedAt: state.startedAt,
    });
  }

  private failActiveTransfersFor(deviceId: string): void {
    const incomingState = this.incoming.get(deviceId);
    if (incomingState) {
      this.incoming.delete(deviceId);
      if (incomingState.useIndexedDB) {
        clearTransferChunksFromIDB(incomingState.meta.transferId).catch(() => {});
      }
      this.emit({
        transferId: incomingState.meta.transferId,
        deviceId,
        direction: "receive",
        name: incomingState.meta.name,
        mimeType: incomingState.meta.mimeType,
        size: incomingState.meta.size,
        bytesTransferred: incomingState.bytesReceived,
        status: "error",
        startedAt: incomingState.startedAt,
      });
    }

    const pending = this.pendingOffers.get(deviceId);
    if (pending) {
      this.pendingOffers.delete(deviceId);
      this.emit({
        transferId: pending.meta.transferId,
        deviceId,
        direction: "receive",
        name: pending.meta.name,
        mimeType: pending.meta.mimeType,
        size: pending.meta.size,
        bytesTransferred: 0,
        status: "error",
        startedAt: Date.now(),
      });
    }
  }

  getIncomingSnapshot(deviceId: string): TransferProgress | null {
    const pending = this.pendingOffers.get(deviceId);
    if (pending) {
      return {
        transferId: pending.meta.transferId,
        deviceId,
        direction: "receive",
        name: pending.meta.name,
        mimeType: pending.meta.mimeType,
        size: pending.meta.size,
        bytesTransferred: 0,
        status: "awaiting-accept",
        startedAt: Date.now(),
      };
    }
    const active = this.incoming.get(deviceId);
    if (active) {
      return {
        transferId: active.meta.transferId,
        deviceId,
        direction: "receive",
        name: active.meta.name,
        mimeType: active.meta.mimeType,
        size: active.meta.size,
        bytesTransferred: active.bytesReceived,
        status: "in-progress",
        startedAt: active.startedAt,
      };
    }
    return null;
  }

  triggerDownload(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
}

export const fileTransfer = new FileTransferService();
