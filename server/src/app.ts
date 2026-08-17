import express from 'express';
import cookieParser from 'cookie-parser';
import { env } from './env.js';
import { attachUser } from './middleware/auth.js';
import { errorHandler } from './middleware/error.js';
import { csrfOriginGuard, allowedOrigins } from './middleware/origin.js';
import { authRouter } from './routes/auth.js';
import { dossierRouter } from './routes/dossier.js';
import { documentsRouter } from './routes/documents.js';
import { adminRouter } from './routes/admin.js';
import { notificationsRouter } from './routes/notifications.js';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  // CORS : jamais « * » avec credentials — on renvoie l'origine SI elle est autorisée.
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && allowedOrigins.has(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Credentials', 'true');
    }
    res.header('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    res.header('Vary', 'Origin');
    if (req.method === 'OPTIONS') { res.sendStatus(204); return; }
    next();
  });

  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use(csrfOriginGuard); // défense CSRF (Origin) sur les mutations
  app.use(attachUser);

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'mon-espace-server', env: env.NODE_ENV });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/dossier', dossierRouter);
  app.use('/api/documents', documentsRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/notifications', notificationsRouter);

  app.use(errorHandler);
  return app;
}
