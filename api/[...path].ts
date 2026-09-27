import type { IncomingMessage, ServerResponse } from 'http';
import { handleApiRequest } from '../server/apiRouter.ts';

export default async function handler(req: any, res: any) {
  // Ensure req.url has /api prefix for matching in handleApiRequest
  const originalUrl = req.url || '';
  if (!originalUrl.startsWith('/api/')) {
    req.url = '/api' + (originalUrl.startsWith('/') ? originalUrl : '/' + originalUrl);
  }

  const handled = await handleApiRequest(req, res);

  if (!handled && !res.headersSent) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'API route not found' }));
  }
}
