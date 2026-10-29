import { doc, getDoc, setDoc, collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { AttachedFile } from '../types';

// In-memory cache for ultra-fast instantaneous access (0ms "คลิกปุ้บเปิดได้เลย")
const memoryFileCache = new Map<string, { data: string; name: string; type: string; size: number }>();

// Simple browser-native IndexedDB helper for persistent client-side caching across sessions
const IDB_NAME = 'eduvibe_cloud_files_v1';
const IDB_STORE = 'cached_files';

function getIDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(IDB_NAME, 1);
      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function getFromIDB(id: string): Promise<{ data: string; name: string; type: string; size: number } | null> {
  try {
    const db = await getIDB();
    if (!db) return null;
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function saveToIDB(item: { id: string; data: string; name: string; type: string; size: number }): Promise<void> {
  try {
    const db = await getIDB();
    if (!db) return;
    const tx = db.transaction(IDB_STORE, 'readwrite');
    const store = tx.objectStore(IDB_STORE);
    store.put(item);
  } catch {
    // ignore
  }
}

export function extractFileId(fileOrId: string | { fileId?: string; id?: string; url?: string }): string | null {
  if (!fileOrId) return null;
  if (typeof fileOrId === 'string') {
    if (fileOrId.startsWith('cfile_') || fileOrId.startsWith('file_')) return fileOrId;
    if (fileOrId.includes('/api/files/')) {
      const clean = fileOrId.split('/api/files/')[1]?.split('?')[0];
      return clean ? decodeURIComponent(clean) : null;
    }
    return null;
  }
  if (fileOrId.fileId) return fileOrId.fileId;
  if (fileOrId.id && (fileOrId.id.startsWith('cfile_') || fileOrId.id.startsWith('file_'))) return fileOrId.id;
  if (fileOrId.url && fileOrId.url.includes('/api/files/')) {
    const clean = fileOrId.url.split('/api/files/')[1]?.split('?')[0];
    return clean ? decodeURIComponent(clean) : null;
  }
  return null;
}

/**
 * Saves a file's content to Firestore `cloud_files` collection and local server
 * so that any machine, device, or user can open it in real-time.
 */
export async function saveFileToCloud(payload: {
  name: string;
  type?: string;
  size?: number;
  data: string;
}): Promise<AttachedFile> {
  const fileId = `cfile_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const fileName = payload.name || 'file';
  const fileType = payload.type || 'application/octet-stream';
  const fileSize = payload.size || Math.round((payload.data.length * 3) / 4);
  const dataUrl = payload.data;

  // 1. Immediately store in fast memory cache & IndexedDB
  const cachedMeta = { id: fileId, data: dataUrl, name: fileName, type: fileType, size: fileSize };
  memoryFileCache.set(fileId, cachedMeta);
  saveToIDB(cachedMeta).catch(() => {});

  // 2. Save into Firestore cloud_files collection for permanent cross-device real-time sync
  try {
    const CHUNK_SIZE = 500000; // 500KB chunk size (well under Firestore's 1MB doc limit)
    if (dataUrl.length <= CHUNK_SIZE) {
      await setDoc(doc(db, 'cloud_files', fileId), {
        id: fileId,
        name: fileName,
        type: fileType,
        size: fileSize,
        data: dataUrl,
        isChunked: false,
        createdAt: new Date().toISOString(),
      });
    } else {
      // Chunk large files across subdocuments
      const chunksCount = Math.ceil(dataUrl.length / CHUNK_SIZE);
      await setDoc(doc(db, 'cloud_files', fileId), {
        id: fileId,
        name: fileName,
        type: fileType,
        size: fileSize,
        isChunked: true,
        chunksCount,
        createdAt: new Date().toISOString(),
      });

      const chunkWrites: Promise<void>[] = [];
      for (let i = 0; i < chunksCount; i++) {
        const chunkPart = dataUrl.substring(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
        chunkWrites.push(
          setDoc(doc(db, 'cloud_files', fileId, 'chunks', String(i)), {
            index: i,
            data: chunkPart,
          })
        );
      }
      await Promise.all(chunkWrites);
    }
  } catch (firestoreErr) {
    console.warn('Notice saving file to Firestore cloud_files:', firestoreErr);
  }

  // 3. Simultaneously upload to Express server /api/upload-file endpoint (non-blocking)
  try {
    fetch('/api/upload-file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: fileName,
        type: fileType,
        size: fileSize,
        data: dataUrl,
      }),
    }).catch(() => {});
  } catch {
    // ignore
  }

  return {
    id: fileId,
    fileId,
    name: fileName,
    type: fileType,
    size: fileSize,
    url: `/api/files/${fileId}`,
    // If small (<100KB), keep inline for 0ms instantaneous preview
    data: dataUrl.length < 100000 ? dataUrl : undefined,
    uploadStatus: 'ready',
  };
}

/**
 * Resolves full file data from memory, IndexedDB, Firestore cloud_files, or server endpoint.
 * Works seamlessly on any machine (เครื่องอื่น) in real-time.
 */
export async function getFileFromCloud(
  fileOrId: string | { fileId?: string; id?: string; url?: string; data?: string; name?: string; type?: string; size?: number }
): Promise<{ data: string; name: string; type: string; size?: number } | null> {
  if (!fileOrId) return null;

  // If data already provided and valid data: URL, return right away
  if (typeof fileOrId === 'object' && fileOrId.data && fileOrId.data.startsWith('data:')) {
    const fileId = extractFileId(fileOrId);
    if (fileId && !memoryFileCache.has(fileId)) {
      memoryFileCache.set(fileId, {
        data: fileOrId.data,
        name: fileOrId.name || 'file',
        type: fileOrId.type || 'application/octet-stream',
        size: fileOrId.size || 0,
      });
    }
    return {
      data: fileOrId.data,
      name: fileOrId.name || 'file',
      type: fileOrId.type || 'application/octet-stream',
      size: fileOrId.size,
    };
  }

  const fileId = extractFileId(fileOrId);
  const fallbackName = typeof fileOrId === 'object' ? fileOrId.name || 'file' : 'file';
  const fallbackType = typeof fileOrId === 'object' ? fileOrId.type || 'application/octet-stream' : 'application/octet-stream';

  // 1. Check in-memory cache (0ms instant!)
  if (fileId && memoryFileCache.has(fileId)) {
    return memoryFileCache.get(fileId)!;
  }

  // 2. Check IndexedDB cache
  if (fileId) {
    const fromIDB = await getFromIDB(fileId);
    if (fromIDB && fromIDB.data) {
      memoryFileCache.set(fileId, fromIDB);
      return fromIDB;
    }
  }

  // 3. Check Firestore cloud_files collection (real-time cross-device sync)
  if (fileId) {
    try {
      const fileDocRef = doc(db, 'cloud_files', fileId);
      const snap = await getDoc(fileDocRef);
      if (snap.exists()) {
        const fileData = snap.data();
        let completeData = fileData.data;

        // If file was chunked, reconstruct all chunks in order
        if (fileData.isChunked && fileData.chunksCount) {
          const chunkSnaps = await getDocs(
            query(collection(db, 'cloud_files', fileId, 'chunks'), orderBy('index', 'asc'))
          );
          const parts: string[] = [];
          chunkSnaps.forEach((cdoc) => {
            parts.push(cdoc.data().data || '');
          });
          completeData = parts.join('');
        }

        if (completeData) {
          const result = {
            data: completeData,
            name: fileData.name || fallbackName,
            type: fileData.type || fallbackType,
            size: fileData.size || completeData.length,
          };
          memoryFileCache.set(fileId, result);
          saveToIDB({ id: fileId, ...result }).catch(() => {});
          return result;
        }
      }
    } catch (err) {
      console.warn('Notice resolving file from Firestore cloud_files:', err);
    }
  }

  // 4. Try fetching from URL (e.g. /api/files/:id)
  const url = typeof fileOrId === 'object' ? fileOrId.url : typeof fileOrId === 'string' && fileOrId.includes('/') ? fileOrId : null;
  if (url) {
    try {
      const resp = await fetch(url);
      if (resp.ok) {
        const blob = await resp.blob();
        const reader = new FileReader();
        const dataUrl = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

        if (dataUrl) {
          const result = {
            data: dataUrl,
            name: fallbackName,
            type: blob.type || fallbackType,
            size: blob.size,
          };
          if (fileId) {
            memoryFileCache.set(fileId, result);
            saveToIDB({ id: fileId, ...result }).catch(() => {});
          }
          return result;
        }
      }
    } catch {
      // ignore
    }
  }

  return null;
}

/**
 * Proactively pre-fetches a list of files in the background so that clicking
 * on any file opens it with 0ms delay ("คลิกปุ้บเปิดได้เลย").
 */
export function prefetchFilesForList(files?: AttachedFile[]): void {
  if (!files || !Array.isArray(files) || files.length === 0) return;
  for (const f of files) {
    if (!f || f.data) continue;
    const fileId = extractFileId(f);
    if (!fileId || memoryFileCache.has(fileId)) continue;
    // Asynchronously resolve in background idle time
    getFileFromCloud(f).catch(() => {});
  }
}
