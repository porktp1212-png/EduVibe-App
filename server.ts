import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { handleApiRequest } from './server/apiRouter.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Body parsing middleware with generous size limit for rich educational files
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Handle API requests
app.use(async (req, res, next) => {
  if (req.url && (req.url.startsWith('/api/') || req.url === '/api')) {
    const handled = await handleApiRequest(req, res);
    if (handled) return;
  }
  next();
});

// Explicit 404 handler for any unhandled /api routes (prevents returning index.html for missing APIs)
app.all('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found', path: req.url });
});

// Serve static frontend assets
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

// Single Page Application fallback
app.get('*', (req, res) => {
  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(200).send(`
      <!DOCTYPE html>
      <html lang="th">
        <head>
          <meta charset="UTF-8" />
          <title>EduVibe Server</title>
          <style>
            body { font-family: sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #0f172a; color: white; text-align: center; }
            .card { padding: 2rem; background: #1e293b; border-radius: 1rem; max-width: 500px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>EduVibe School Innovation Platform</h2>
            <p>เซิร์ฟเวอร์กำลังเตรียมระบบหรือกำลังสร้างไฟล์ส่วนติดต่อผู้ใช้งาน กรุณารีเฟรชในสักครู่...</p>
          </div>
        </body>
      </html>
    `);
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`EduVibe Server listening on port ${PORT}`);
});
