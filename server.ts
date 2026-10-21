import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import app from './src/server/app';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    // Mount Vite dev server in middleware mode
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[KPMBP Contingent Hub] Dev & API server running on http://0.0.0.0:${PORT}`);
  });
}

// Run only when started directly for development or container hosting (never inside Vercel Serverless Functions)
if (!process.env.VERCEL) {
  startServer().catch((err) => {
    console.error('[KPMBP Contingent Hub] Failed to start server:', err);
  });
}

export { app, startServer };
export default app;
