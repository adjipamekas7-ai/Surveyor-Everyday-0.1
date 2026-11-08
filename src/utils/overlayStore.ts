/**
 * Surveyor Everyday - Penyimpanan gambar overlay peta di IndexedDB.
 * Gambar besar TIDAK boleh disimpan di localStorage (batas ~5 MB membuat seluruh
 * proyek gagal tersimpan). Overlay hanya menyimpan referensi "idb:<id>".
 */

const DB_NAME = 'SurveyorEverydayOverlays';
const STORE = 'images';
const PREFIX = 'idb:';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('IndexedDB tidak didukung'));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function overlayRef(id: string): string {
  return PREFIX + id;
}

export async function saveOverlayBlob(id: string, blob: Blob): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(blob, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
  db.close();
}

async function getOverlayBlob(id: string): Promise<Blob | null> {
  const db = await openDb();
  const blob = await new Promise<Blob | null>((resolve, reject) => {
    const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(id);
    req.onsuccess = () => resolve((req.result as Blob) ?? null);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return blob;
}

const urlCache = new Map<string, string>();

/** "idb:<id>" -> blob URL. URL biasa (data:/http) dikembalikan apa adanya. */
export async function resolveOverlayUrl(url: string): Promise<string | null> {
  if (!url.startsWith(PREFIX)) return url;
  const id = url.slice(PREFIX.length);
  const cached = urlCache.get(id);
  if (cached) return cached;
  try {
    const blob = await getOverlayBlob(id);
    if (!blob) return null;
    const objUrl = URL.createObjectURL(blob);
    urlCache.set(id, objUrl);
    return objUrl;
  } catch {
    return null;
  }
}

export async function deleteOverlayBlob(url: string): Promise<void> {
  if (!url.startsWith(PREFIX)) return;
  const id = url.slice(PREFIX.length);
  const cached = urlCache.get(id);
  if (cached) {
    URL.revokeObjectURL(cached);
    urlCache.delete(id);
  }
  try {
    const db = await openDb();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
    db.close();
  } catch {
    // abaikan
  }
}
