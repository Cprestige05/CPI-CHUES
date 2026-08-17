import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { MulterError } from 'multer';

export class AppError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const badRequest = (m: string, code = 'bad_request') => new AppError(400, code, m);
export const unauthorized = (m = 'Non authentifié.') => new AppError(401, 'unauthorized', m);
export const forbidden = (m = 'Accès refusé.') => new AppError(403, 'forbidden', m);
export const notFound = (m = 'Ressource introuvable.') => new AppError(404, 'not_found', m);
export const conflict = (m: string, code = 'conflict') => new AppError(409, code, m);
export const tooMany = (m = 'Trop de tentatives. Réessayez plus tard.') => new AppError(429, 'rate_limited', m);
export const payloadTooLarge = (m: string) => new AppError(413, 'payload_too_large', m);
export const unsupportedMedia = (m: string) => new AppError(415, 'unsupported_media_type', m);

/** Enveloppe un handler async : redirige les rejets vers le gestionnaire d'erreurs. */
export const ah =
  (fn: (req: Request, res: Response, next: NextFunction) => unknown): RequestHandler =>
  (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

/** Gestionnaire d'erreurs central — ne divulgue jamais de détails sensibles. */
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    res.status(err.status).json({ error: err.code, message: err.message });
    return;
  }
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'validation',
      message: 'Données invalides.',
      issues: err.issues.map(i => ({ path: i.path.join('.'), message: i.message })),
    });
    return;
  }
  if (err instanceof MulterError) {
    const tooLarge = err.code === 'LIMIT_FILE_SIZE';
    res.status(tooLarge ? 413 : 400).json({
      error: tooLarge ? 'payload_too_large' : 'upload_error',
      message: tooLarge ? 'Fichier trop volumineux.' : 'Envoi de fichier invalide.',
    });
    return;
  }
  // Message seulement (jamais le stack ni de contenu sensible en réponse).
  console.error('[error]', (err as Error)?.message ?? 'unknown');
  res.status(500).json({ error: 'server_error', message: 'Erreur interne du serveur.' });
}
