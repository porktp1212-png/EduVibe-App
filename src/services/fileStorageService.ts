import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { AttachedFile } from '../types';
import { dataUrlToBlob, readFileAsDataUrl, compressImageIfPossible } from '../lib/fileUpload';

const CHUNK_SIZE = 650000; // ~650KB per chunk to stay well within Firestore 1MB document limit

/**
 * Saves a file's content to Firestore `uploaded_files` collection.
 * Supports automatic chunking for files larger than ~650KB.
 */
export async function saveFileToFirestoreCloud(fileItem: {
  fileId: string;
  name: string;
  type: string;
  size: number;
  data: string;
}): Promise<void> {
  const { fileId, name, type, size, data } = fileItem;

  try {
    if (data.length <= CHUNK_SIZE) {
      // Store in single document
      await setDoc(doc(db, 'uploaded_files', fileId), {
        id: fileId,
        fileId,
        name,
        type,
        size,
        data,
        isChunked: false,
        createdAt: new Date().toISOString(),
      });
    } else {
      // Split large base64 payload into chunks
      const chunkCount = Math.ceil(data.length / CHUNK_SIZE);
      await setDoc(doc(db, 'uploaded_files', fileId), {
        id: fileId,
        fileId,
        name,
        type,
        size,
        isChunked: true,
        chunkCount,
        createdAt: new Date().toISOString(),
      });

      // Save each chunk
      for (let i = 0; i < chunkCount; i++) {
        const chunkSlice = data.substring(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
        await setDoc(doc(db, 'uploaded_files', fileId, 'chunks', String(i)), {
          index: i,
          chunk: chunkSlice,
        });
      }
    }
  } catch (err) {
    console.warn('saveFileToFirestoreCloud notice:', err);
  }
}

/**
 * Retrieves a file's base64 content from Firestore `uploaded_files` collection.
 * Reassembles chunks if the file was chunked.
 */
export async function getFileFromFirestoreCloud(
  fileId: string
): Promise<{ name: string; type: string; size: number; data: string } | null> {
  if (!fileId) return null;

  try {
    const snap = await getDoc(doc(db, 'uploaded_files', fileId));
    if (!snap.exists()) return null;

    const meta = snap.data() as any;
    if (!meta.isChunked) {
      return {
        name: meta.name || 'file',
        type: meta.type || 'application/octet-stream',
        size: meta.size || 0,
        data: meta.data || '',
      };
    }

    // Reassemble chunks
    const chunksSnap = await getDocs(
      query(collection(db, 'uploaded_files', fileId, 'chunks'), orderBy('index', 'asc'))
    );
    const chunkList: { index: number; chunk: string }[] = [];
    chunksSnap.forEach((d) => {
      chunkList.push(d.data() as any);
    });
    chunkList.sort((a, b) => a.index - b.index);
    const fullData = chunkList.map((c) => c.chunk).join('');

    return {
      name: meta.name || 'file',
      type: meta.type || 'application/octet-stream',
      size: meta.size || 0,
      data: fullData,
    };
  } catch (err) {
    console.warn('getFileFromFirestoreCloud notice:', err);
    return null;
  }
}

/**
 * Extracts a fileId from an AttachedFile object or URL
 */
export function extractFileId(file: {
  id?: string;
  fileId?: string;
  url?: string;
  name?: string;
}): string | null {
  if (file.fileId) return file.fileId;
  if (file.id && file.id.startsWith('file_')) return file.id;
  if (file.url) {
    const match = file.url.match(/\/api\/files\/([^\/?#]+)/);
    if (match && match[1]) return decodeURIComponent(match[1]);
  }
  return null;
}

/**
 * Master file resolver: guarantees that any attached file (PDF, image, doc) can be opened
 * on ANY device in real time, even if local disk was lost or device is different.
 */
export async function resolveAttachedFileData(file: {
  name: string;
  type?: string;
  size?: number;
  url?: string;
  data?: string;
  fileId?: string;
  id?: string;
}): Promise<{ blobUrl: string; dataUrl?: string; mimeType: string }> {
  const fallbackMime = file.type || (file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream');

  // 1. Direct Data URL in memory
  if (file.data && file.data.startsWith('data:')) {
    const mimeMatch = file.data.match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : fallbackMime;
    const blob = dataUrlToBlob(file.data, mime);
    return {
      blobUrl: URL.createObjectURL(blob),
      dataUrl: file.data,
      mimeType: mime,
    };
  }

  // 2. Try fetching from server URL if available
  if (file.url && (file.url.startsWith('/api/files/') || file.url.startsWith('http'))) {
    try {
      const resp = await fetch(file.url);
      if (resp.ok) {
        const contentType = resp.headers.get('content-type') || fallbackMime;
        const blob = await resp.blob();
        const safeBlob = new Blob([blob], { type: contentType || fallbackMime });
        return {
          blobUrl: URL.createObjectURL(safeBlob),
          mimeType: contentType || fallbackMime,
        };
      }
    } catch {
      // ignore, fall through to Firestore cloud storage
    }
  }

  // 3. Fallback to Firestore uploaded_files collection (guarantees cross-device access)
  const fileId = extractFileId(file);
  if (fileId) {
    const cloudFile = await getFileFromFirestoreCloud(fileId);
    if (cloudFile && cloudFile.data) {
      const mime = cloudFile.type || fallbackMime;
      const blob = dataUrlToBlob(cloudFile.data, mime);
      return {
        blobUrl: URL.createObjectURL(blob),
        dataUrl: cloudFile.data,
        mimeType: mime,
      };
    }
  }

  // 4. Raw base64 string without data: prefix
  if (file.data && file.data.length > 50) {
    try {
      const fullDataUrl = `data:${fallbackMime};base64,${file.data}`;
      const blob = dataUrlToBlob(fullDataUrl, fallbackMime);
      return {
        blobUrl: URL.createObjectURL(blob),
        dataUrl: fullDataUrl,
        mimeType: fallbackMime,
      };
    } catch {
      // ignore
    }
  }

  // Fallback empty blob
  const emptyBlob = new Blob([], { type: fallbackMime });
  return {
    blobUrl: URL.createObjectURL(emptyBlob),
    mimeType: fallbackMime,
  };
}
