import { handleApiRequest } from '../server/apiRouter.ts';

export default async function handler(req: any, res: any) {
  const originalUrl = req.url || '';
  if (!originalUrl.startsWith('/api')) {
    req.url = '/api' + (originalUrl.startsWith('/') ? originalUrl : '/' + originalUrl);
  }

  const handled = await handleApiRequest(req, res);

  if (!handled && !res.headersSent) {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      status: 'ok',
      service: 'EduVibe API Engine',
      version: '1.0.0',
      endpoints: [
        '/api/health',
        '/api/ai/generate-quiz',
        '/api/ai/evaluate-submission',
        '/api/ai/skill-analysis',
        '/api/upload-file',
        '/api/files/:id',
      ]
    }));
  }
}
