import type { Request, Response, NextFunction } from 'express';
import { env } from '../env.js';
import { forbidden } from './error.js';

// Liste blanche d'origines (CLIENT_ORIGIN peut être séparé par des virgules).
export const allowedOrigins = new Set(
  env.CLIENT_ORIGIN.split(',').map(o => o.trim()).filter(Boolean),
);

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Défense CSRF : sur les requêtes de MUTATION, si un en-tête `Origin` est présent,
 * il DOIT figurer dans la liste blanche. Une origine étrangère est refusée (403).
 * (Les navigateurs attachent toujours `Origin` sur les requêtes cross-site modifiantes ;
 * l'absence d'`Origin` — même origine / outils sans cookie — est tolérée.)
 */
export function csrfOriginGuard(req: Request, _res: Response, next: NextFunction): void {
  if (!MUTATING.has(req.method)) return next();
  const origin = req.headers.origin;
  if (!origin) return next();
  if (allowedOrigins.has(origin)) return next();
  next(forbidden('Origine non autorisée.'));
}
