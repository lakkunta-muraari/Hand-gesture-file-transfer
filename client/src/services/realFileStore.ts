/**
 * realFileStore.ts
 *
 * Persists genuine File and Blob objects in browser IndexedDB.
 * Works on ALL platforms (Android, iOS, Windows, Mac, Linux).
 * Once a user uploads or selects files on their device, the actual original
 * binary File objects stay permanently in browser storage across reloads.
 */

const DB_NAME = "GesturaRealFileStore";
const DB_VERSION = 1;
const STORE_NAME = "device_files";

export type FileCategory = "pdf" | "image" | "zip" | "video" | "code" | "other";

export interface StoredRealFile {
  id: string;
  name: string;
  sectionId: string;
  dateModified: string;
  type: string;
  sizeBytes: number;
  sizeLabel: string;
  extension: FileCategory;
  file: File;
  addedAt: number;
}

let dbInstance: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("sectionId", "sectionId", { unique: false });
      }
    };
    req.onsuccess = () => {
      dbInstance = req.result;
      resolve(req.result);
    };
    req.onerror = () => reject(req.error);
  });
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export function getFileCategory(filename: string): FileCategory {
  const lower = filename.toLowerCase();
  if (/\.(pdf|doc|docx|txt|rtf|epub|odt)$/.test(lower)) return "pdf";
  if (/\.(jpg|jpeg|png|gif|webp|svg|bmp|ico|heic)$/.test(lower)) return "image";
  if (/\.(zip|tar|gz|rar|7z|bz2)$/.test(lower)) return "zip";
  if (/\.(mp4|webm|mov|mkv|avi|wmv|m4v)$/.test(lower)) return "video";
  if (/\.(ts|tsx|js|jsx|json|py|html|css|cpp|c|go|rs|java|kt|swift)$/.test(lower)) return "code";
  return "other";
}

export async function saveRealFilesToIDB(sectionId: string, files: File[]): Promise<StoredRealFile[]> {
  const db = await openDB();
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const dateStr = `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

  const saved: StoredRealFile[] = [];

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    tx.oncomplete = () => resolve(saved);
    tx.onerror = () => reject(tx.error);

    for (const f of files) {
      const id = "real-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
      const entry: StoredRealFile = {
        id,
        name: f.name,
        sectionId,
        dateModified: dateStr,
        type: f.type || "File",
        sizeBytes: f.size,
        sizeLabel: formatBytes(f.size),
        extension: getFileCategory(f.name),
        file: f,
        addedAt: Date.now(),
      };
      store.put(entry);
      saved.push(entry);
    }
  });
}

export async function loadAllRealFilesFromIDB(): Promise<Record<string, StoredRealFile[]>> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();

    req.onsuccess = () => {
      const records: StoredRealFile[] = req.result || [];
      const grouped: Record<string, StoredRealFile[]> = {};
      for (const rec of records) {
        if (!grouped[rec.sectionId]) {
          grouped[rec.sectionId] = [];
        }
        grouped[rec.sectionId].push(rec);
      }
      resolve(grouped);
    };

    req.onerror = () => reject(req.error);
  });
}

export async function deleteRealFileFromIDB(fileId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(fileId);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function clearSectionRealFiles(sectionId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const index = store.index("sectionId");
    const req = index.getAllKeys(IDBKeyRange.only(sectionId));

    req.onsuccess = () => {
      const keys = req.result;
      for (const k of keys) {
        store.delete(k);
      }
      resolve();
    };

    req.onerror = () => reject(req.error);
  });
}
