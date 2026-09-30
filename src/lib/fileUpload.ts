import type { AttachedFile } from '../types';

/**
 * Formats a file size in bytes into human-readable string (KB, MB, GB)
 */
export function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/**
 * Reads a File object as Data URL (base64 string)
 */
export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read file as string'));
      }
    };
    reader.onerror = () => reject(reader.error || new Error('FileReader error'));
    reader.readAsDataURL(file);
  });
}

/**
 * Compresses an image client-side to ensure fast uploads and prevent memory/storage overflow
 */
export async function compressImageIfPossible(
  file: File,
  maxWidth = 1920,
  maxHeight = 1920,
  quality = 0.85
): Promise<{ dataUrl: string; size: number; compressed: boolean }> {
  // If not an image or SVG/GIF, return original dataUrl
  if (!file.type.startsWith('image/') || file.type.includes('svg') || file.type.includes('gif')) {
    const dataUrl = await readFileAsDataUrl(file);
    return { dataUrl, size: file.size, compressed: false };
  }

  // If already under 800KB, read directly
  if (file.size < 800 * 1024) {
    const dataUrl = await readFileAsDataUrl(file);
    return { dataUrl, size: file.size, compressed: false };
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new globalThis.Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({ dataUrl: e.target?.result as string, size: file.size, compressed: false });
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const dataUrl = canvas.toDataURL(mimeType, quality);
        // Estimate base64 payload size
        const estimatedSize = Math.round((dataUrl.length * 3) / 4);
        resolve({ dataUrl, size: estimatedSize, compressed: true });
      };

      img.onerror = () => {
        resolve({ dataUrl: e.target?.result as string, size: file.size, compressed: false });
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      resolve({ dataUrl: '', size: 0, compressed: false });
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Uploads a file payload to server /api/upload-file endpoint
 */
export async function uploadFileToServer(fileItem: {
  name: string;
  type: string;
  size: number;
  data: string;
}): Promise<{ fileUrl: string; fileId: string } | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

    const resp = await fetch('/api/upload-file', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: fileItem.name,
        fileName: fileItem.name,
        type: fileItem.type,
        fileType: fileItem.type,
        size: fileItem.size,
        fileSize: fileItem.size,
        data: fileItem.data,
        fileData: fileItem.data,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (resp.ok) {
      const data = await resp.json();
      if (data && data.fileUrl) {
        return { fileUrl: data.fileUrl, fileId: data.fileId || '' };
      }
    }
  } catch (err) {
    console.warn('Upload to server notice (falling back to inline storage):', err);
  }
  return null;
}

export type FileCategory =
  | 'pdf'
  | 'image'
  | 'word'
  | 'excel'
  | 'powerpoint'
  | 'archive'
  | 'text'
  | 'video'
  | 'audio'
  | 'file';

export function getFileCategory(name: string, type?: string): FileCategory {
  const ext = (name.split('.').pop() || '').toLowerCase();
  const mime = (type || '').toLowerCase();

  if (ext === 'pdf' || mime.includes('pdf')) return 'pdf';
  if (
    ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'heic', 'heif'].includes(ext) ||
    mime.startsWith('image/')
  ) {
    return 'image';
  }
  if (['doc', 'docx'].includes(ext) || mime.includes('word') || mime.includes('officedocument.wordprocessingml')) {
    return 'word';
  }
  if (
    ['xls', 'xlsx', 'csv'].includes(ext) ||
    mime.includes('excel') ||
    mime.includes('spreadsheetml') ||
    mime.includes('csv')
  ) {
    return 'excel';
  }
  if (
    ['ppt', 'pptx'].includes(ext) ||
    mime.includes('powerpoint') ||
    mime.includes('presentationml')
  ) {
    return 'powerpoint';
  }
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext) || mime.includes('zip') || mime.includes('compressed')) {
    return 'archive';
  }
  if (['txt', 'md', 'json', 'js', 'ts', 'html', 'css', 'py'].includes(ext) || mime.startsWith('text/')) {
    return 'text';
  }
  if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext) || mime.startsWith('video/')) {
    return 'video';
  }
  if (['mp3', 'wav', 'ogg', 'm4a', 'aac'].includes(ext) || mime.startsWith('audio/')) {
    return 'audio';
  }

  return 'file';
}

/**
 * Processes a File object, handles compression (if image) and uploads to server
 */
export async function processSingleFile(file: File): Promise<AttachedFile> {
  const isImage = file.type.startsWith('image/');
  let dataUrl = '';
  let finalSize = file.size;

  try {
    if (isImage) {
      const comp = await compressImageIfPossible(file);
      dataUrl = comp.dataUrl;
      finalSize = comp.size;
    } else {
      dataUrl = await readFileAsDataUrl(file);
    }
  } catch (readErr) {
    console.warn('Failed to read file buffer:', readErr);
  }

  // Attempt to upload to server endpoint
  let serverResult: { fileUrl: string; fileId: string } | null = null;
  if (dataUrl) {
    serverResult = await uploadFileToServer({
      name: file.name,
      type: file.type || 'application/octet-stream',
      size: finalSize,
      data: dataUrl,
    });
  }

  const fileUrl = serverResult?.fileUrl || (dataUrl.startsWith('data:') ? dataUrl : undefined);

  return {
    name: file.name,
    type: file.type || 'application/octet-stream',
    size: finalSize,
    url: fileUrl || (dataUrl ? dataUrl : undefined),
    data: dataUrl || undefined,
    uploadStatus: 'ready',
  };
}

/**
 * Converts a data URL or base64 string to a Blob object
 */
export function dataUrlToBlob(dataUrl: string, fallbackMime = 'application/octet-stream'): Blob {
  try {
    const parts = dataUrl.split(',');
    let mime = fallbackMime;
    let b64Data = dataUrl;

    if (parts.length > 1) {
      const mimeMatch = parts[0].match(/:(.*?);/);
      if (mimeMatch) {
        mime = mimeMatch[1];
      }
      b64Data = parts[1];
    }

    const binaryString = atob(b64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return new Blob([bytes], { type: mime });
  } catch (err) {
    console.error('Error converting data URL to Blob:', err);
    return new Blob([], { type: fallbackMime });
  }
}

/**
 * Converts a data URL to a same-origin Blob URL
 */
export function dataUrlToBlobUrl(dataUrl: string, fallbackMime = 'application/octet-stream'): string {
  const blob = dataUrlToBlob(dataUrl, fallbackMime);
  return URL.createObjectURL(blob);
}

/**
 * Converts a base64 string to Uint8Array
 */
export function base64ToUint8Array(b64String: string): Uint8Array {
  const cleanB64 = b64String.includes(';base64,')
    ? b64String.substring(b64String.indexOf(';base64,') + 8)
    : b64String;
  const binaryString = atob(cleanB64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Downloads or opens a file in a reliable cross-browser way (supports base64, data:, blob:, and server URLs)
 */
export function downloadOrOpenFile(
  fileUrl?: string,
  fileName?: string,
  forceDownload = false
) {
  if (!fileUrl) return;

  // Handle data: URLs safely using Blob URLs to avoid browser frame navigation restrictions
  if (fileUrl.startsWith('data:')) {
    const mime = fileUrl.match(/:(.*?);/)?.[1] || 'application/octet-stream';
    const blob = dataUrlToBlob(fileUrl, mime);
    const blobUrl = URL.createObjectURL(blob);

    if (forceDownload) {
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = fileName || 'downloaded-file';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    } else {
      const a = document.createElement('a');
      a.href = blobUrl;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 120000);
    }
    return;
  }

  // Handle blob: URLs
  if (fileUrl.startsWith('blob:')) {
    const a = document.createElement('a');
    a.href = fileUrl;
    if (forceDownload) {
      a.download = fileName || 'downloaded-file';
    } else {
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    }
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return;
  }

  // Handle server and external URLs
  const targetUrl = forceDownload && fileUrl.startsWith('/api/files/')
    ? `${fileUrl}?download=1`
    : fileUrl;

  const a = document.createElement('a');
  a.href = targetUrl;
  if (forceDownload) {
    a.download = fileName || 'downloaded-file';
  } else {
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
  }
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
