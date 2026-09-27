import type { IncomingMessage, ServerResponse } from "http";
import fs from "fs";
import path from "path";
import { generateQuizAI, evaluateSubmissionAI, analyzeStudentSkillsAI } from "./geminiService.ts";

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  try {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  } catch {
    // ignore
  }
}

// In-memory index of uploaded files for quick metadata retrieval
interface UploadedMeta {
  id: string;
  name: string;
  type: string;
  size: number;
  filePath: string;
  createdAt: string;
}

const fileMetadataStore = new Map<string, UploadedMeta>();

// Load existing metadata if persisted
const META_FILE = path.join(UPLOADS_DIR, "metadata.json");
if (fs.existsSync(META_FILE)) {
  try {
    const raw = fs.readFileSync(META_FILE, "utf-8");
    const list = JSON.parse(raw);
    if (Array.isArray(list)) {
      for (const item of list) {
        if (item && item.id) fileMetadataStore.set(item.id, item);
      }
    }
  } catch {
    // ignore
  }
}

function saveMetaStore() {
  try {
    const arr = Array.from(fileMetadataStore.values());
    fs.writeFileSync(META_FILE, JSON.stringify(arr), "utf-8");
  } catch {
    // ignore
  }
}

async function readRequestBody(req: IncomingMessage): Promise<any> {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") {
    return {};
  }

  if ((req as any).body !== undefined && (req as any).body !== null) {
    const b = (req as any).body;
    if (typeof b === "string") {
      try {
        return JSON.parse(b);
      } catch {
        return {};
      }
    }
    return b;
  }

  return new Promise((resolve) => {
    let rawData = "";
    req.setEncoding("utf-8");

    // Safety timeout: 15s max for body read
    const timer = setTimeout(() => {
      cleanup();
      try {
        resolve(rawData ? JSON.parse(rawData) : {});
      } catch {
        resolve({});
      }
    }, 15000);

    function cleanup() {
      clearTimeout(timer);
      req.off("data", onData);
      req.off("end", onEnd);
      req.off("error", onError);
    }

    function onData(chunk: string) {
      rawData += chunk;
      // Allow up to 100MB payload to support large uploads
      if (rawData.length > 100 * 1024 * 1024) {
        cleanup();
        resolve({});
      }
    }

    function onEnd() {
      cleanup();
      try {
        resolve(rawData ? JSON.parse(rawData) : {});
      } catch {
        resolve({});
      }
    }

    function onError() {
      cleanup();
      resolve({});
    }

    req.on("data", onData);
    req.on("end", onEnd);
    req.on("error", onError);

    if (req.readableEnded || req.complete) {
      cleanup();
      try {
        resolve(rawData ? JSON.parse(rawData) : {});
      } catch {
        resolve({});
      }
    } else if (typeof req.resume === "function") {
      req.resume();
    }
  });
}

const MIME_MAP: Record<string, string> = {
  ".pdf": "application/pdf",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".m4a": "audio/mp4",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".doc": "application/msword",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".xls": "application/vnd.ms-excel",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".ppt": "application/vnd.ms-powerpoint",
  ".txt": "text/plain; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
  ".zip": "application/zip",
  ".rar": "application/x-rar-compressed",
  ".7z": "application/x-7z-compressed",
};

export async function handleApiRequest(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const rawUrl = req.url || "";
  let url = rawUrl.split("?")[0] || "";

  // Normalize URL to always start with /api
  if (!url.startsWith("/api")) {
    url = "/api" + (url.startsWith("/") ? url : "/" + url);
  }
  if (url === "/api" || url === "/api/") {
    url = "/api/health";
  }

  // File serving endpoint: GET /api/files/:fileId
  if (url.startsWith("/api/files/") && (req.method === "GET" || req.method === "HEAD")) {
    const rawId = url.replace(/^\/api\/files\/?/, "").split("/")[0].trim();
    const cleanId = decodeURIComponent(rawId);
    let meta = fileMetadataStore.get(cleanId);
    let targetFilePath = meta?.filePath;
    let fileName = meta?.name || "file";
    let contentType = meta?.type;

    if (!targetFilePath || !fs.existsSync(targetFilePath)) {
      const direct = path.join(UPLOADS_DIR, cleanId);
      if (fs.existsSync(direct)) {
        targetFilePath = direct;
        fileName = cleanId;
      } else {
        try {
          const files = fs.readdirSync(UPLOADS_DIR);
          const found = files.find((f) => f.startsWith(cleanId));
          if (found) {
            targetFilePath = path.join(UPLOADS_DIR, found);
            fileName = found;
          }
        } catch {
          // ignore
        }
      }
    }

    if (!targetFilePath || !fs.existsSync(targetFilePath)) {
      res.statusCode = 404;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "File not found" }));
      return true;
    }

    try {
      const ext = path.extname(targetFilePath).toLowerCase() || path.extname(fileName).toLowerCase();
      if (!contentType || contentType === "application/octet-stream") {
        contentType = MIME_MAP[ext] || "application/octet-stream";
      }

      const stats = fs.statSync(targetFilePath);
      const isDownload = rawUrl.includes("download=1");

      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Headers", "Range, Content-Type, Authorization");
      res.setHeader("Accept-Ranges", "bytes");
      res.setHeader("Content-Type", contentType);
      res.setHeader(
        "Content-Disposition",
        `${isDownload ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(fileName)}`
      );

      const range = req.headers.range;
      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1;
        if (start < stats.size) {
          const chunksize = end - start + 1;
          res.statusCode = 206;
          res.setHeader("Content-Range", `bytes ${start}-${end}/${stats.size}`);
          res.setHeader("Content-Length", chunksize);
          if (req.method === "HEAD") {
            res.end();
            return true;
          }
          const fileStream = fs.createReadStream(targetFilePath, { start, end });
          fileStream.pipe(res);
          return true;
        }
      }

      res.setHeader("Content-Length", stats.size);

      if (req.method === "HEAD") {
        res.statusCode = 200;
        res.end();
        return true;
      }

      const fileStream = fs.createReadStream(targetFilePath);
      fileStream.pipe(res);
      return true;
    } catch (err: any) {
      console.error("Error streaming file:", err);
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Failed to read file" }));
      return true;
    }
  }

  // Set CORS and JSON headers for other API routes
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Content-Type", "application/json");

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return true;
  }

  const body = await readRequestBody(req);

  try {
    // 1. File Upload endpoint: POST /api/upload-file
    if (url === "/api/upload-file" && req.method === "POST") {
      const fileName = body.name || body.fileName || body.filename || "attached_file";
      const fileType = body.type || body.fileType || body.contentType || "application/octet-stream";
      const fileData = body.data || body.fileData || body.content || body.base64;
      const fileSize = typeof body.size === "number" ? body.size : (typeof body.fileSize === "number" ? body.fileSize : undefined);

      if (!fileData) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: "Missing file data" }));
        return true;
      }

      // Extract base64 content
      let fileBuffer: Buffer;
      if (typeof fileData === "string") {
        const base64Index = fileData.indexOf(";base64,");
        const base64String = base64Index !== -1 ? fileData.substring(base64Index + 8) : fileData;
        fileBuffer = Buffer.from(base64String, "base64");
      } else if (Buffer.isBuffer(fileData)) {
        fileBuffer = fileData;
      } else {
        fileBuffer = Buffer.from(JSON.stringify(fileData));
      }

      const fileId = `file_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const safeExtension = path.extname(fileName) || "";
      const diskFilename = `${fileId}${safeExtension}`;
      const filePath = path.join(UPLOADS_DIR, diskFilename);

      fs.writeFileSync(filePath, fileBuffer);

      const meta: UploadedMeta = {
        id: fileId,
        name: fileName,
        type: fileType,
        size: fileSize || fileBuffer.length,
        filePath,
        createdAt: new Date().toISOString(),
      };

      fileMetadataStore.set(fileId, meta);
      saveMetaStore();

      res.statusCode = 200;
      res.end(
        JSON.stringify({
          success: true,
          fileId,
          fileUrl: `/api/files/${fileId}`,
          fileName: meta.name,
          fileType: meta.type,
          fileSize: meta.size,
        })
      );
      return true;
    }

    if (url === "/api/ai/generate-quiz" && req.method === "POST") {
      const result = await generateQuizAI(body);
      res.statusCode = 200;
      res.end(JSON.stringify(result));
      return true;
    }

    if (url === "/api/ai/evaluate-submission" && req.method === "POST") {
      const result = await evaluateSubmissionAI(body);
      res.statusCode = 200;
      res.end(JSON.stringify(result));
      return true;
    }

    if (url === "/api/ai/skill-analysis" && req.method === "POST") {
      const result = await analyzeStudentSkillsAI(body);
      res.statusCode = 200;
      res.end(JSON.stringify(result));
      return true;
    }

    if (url === "/api/health") {
      res.statusCode = 200;
      res.end(JSON.stringify({ status: "ok", timestamp: new Date().toISOString() }));
      return true;
    }

    res.statusCode = 404;
    res.end(JSON.stringify({ error: "Endpoint not found" }));
    return true;
  } catch (err: any) {
    console.error("API error:", err);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: err.message || "Internal server error" }));
    return true;
  }
}
