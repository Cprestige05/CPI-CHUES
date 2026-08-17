import type { Request, Response, NextFunction } from 'express';
import { env } from '../env.js';
import { tooMany } from './error.js';

// Limiteur en mémoire par (email + IP). Suffisant en développement ;
// à remplacer par un store partagé (Redis) en production multi-instances.
const attempts = new Map<string, { count: number; resetAt: number }>();

function key(email: string, ip: string): string {
  return `${email}|${ip}`.toLowerCase();
}

/** Bloque après trop d'échecs de connexion dans la fenêtre configurée. */
export function loginRateLimit(req: Request, _res: Response, next: NextFunction): void {
  const k = key(String(req.body?.email ?? ''), req.ip ?? '');
  const rec = attempts.get(k);
  if (rec && rec.resetAt > Date.now() && rec.count >= env.LOGIN_MAX_ATTEMPTS) {
    return next(tooMany());
  }
  next();
}

export function recordLoginFailure(email: string, ip: string): void {
  const k = key(email, ip);
  const win = env.LOGIN_WINDOW_MINUTES * 60_000;
  const t = Date.now();
  const rec = attempts.get(k);
  if (!rec || rec.resetAt <= t) attempts.set(k, { count: 1, resetAt: t + win });
  else rec.count += 1;
}

export function resetLoginAttempts(email: string, ip: string): void {
  attempts.delete(key(email, ip));
}

/** Réinitialise le limiteur (utile pour les tests). */
export function _clearRateLimit(): void {
  attempts.clear();
}
