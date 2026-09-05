const DB_NAME = "GesturaChunkStore";
const DB_VERSION = 1;
const STORE_NAME = "chunks";

export interface ChunkRecord {
  transferId: string;
  chunkIndex: number;
  data: ArrayBuffer;
}

// Reuse a single open connection across chunk writes instead of
// opening a new one per chunk. Opening IndexedDB is not free — for a
// large file with thousands of chunks, re-opening on every single
// chunk adds real, avoidable overhead and can make large transfers
// noticeably slower on lower-end phones.
let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => {
      dbPromise = null; // allow retrying on a later call if this one failed
      reject(request.error);
    };
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: ["transferId", "chunkIndex"] });
        store.createIndex("transferId", "transferId", { unique: false });
      }
    };
  });
  return dbPromise;
}

export async function saveChunkToIDB(transferId: string, chunkIndex: number, data: ArrayBuffer): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const record: ChunkRecord = { transferId, chunkIndex, data };
    const request = store.put(record);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function assembleBlobFromIDB(transferId: string, mimeType: string, totalChunks: number): Promise<Blob> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const index = store.index("transferId");
    const request = index.getAll(IDBKeyRange.only(transferId));

    request.onsuccess = () => {
      const records: ChunkRecord[] = request.result;
      records.sort((a, b) => a.chunkIndex - b.chunkIndex);
      if (records.length !== totalChunks) {
        console.warn(
          `[indexedDBStorage] expected ${totalChunks} chunks for transfer ${transferId}, found ${records.length} — file may be incomplete`
        );
      }
      const buffers = records.map((r) => r.data);
      const blob = new Blob(buffers as BlobPart[], { type: mimeType || "application/octet-stream" });
      resolve(blob);
    };

    request.onerror = () => reject(request.error);
  });
}

export async function clearTransferChunksFromIDB(transferId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const index = store.index("transferId");
    const request = index.getAllKeys(IDBKeyRange.only(transferId));

    request.onsuccess = () => {
      const keys = request.result;
      keys.forEach((key) => store.delete(key));
      resolve();
    };

    request.onerror = () => reject(request.error);
  });
}
