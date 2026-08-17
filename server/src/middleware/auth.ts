import type { Request, Response, NextFunction, CookieOptions } from 'express';
import { db } from '../db/index.js';
import { env } from '../env.js';
import { randomToken, sha256, now, newId } from '../lib/ids.js';
import { unauthorized } from './error.js';
import '../types.js';

const COOKIE = env.SESSION_COOKIE_NAME;

function cookieOptions(maxAgeMs: number): CookieOptions {
  return {
    httpOnly: true,          // inaccessible au JS → jamais dans localStorage
    sameSite: 'lax',
    secure: env.isProd,      // `Secure` uniquement en production
    path: '/',
    maxAge: maxAgeMs,
  };
}

/** Crée une session : jeton opaque en cookie HttpOnly ; seul le HASH est stocké. */
export function createSession(res: Response, userId: string, ip = '', ua = ''): void {
  const token = randomToken(32);
  const ttl = env.SESSION_TTL_HOURS * 3_600_000;
  db.prepare(
    `INSERT INTO sessions (id, user_id, token_hash, created_at, expires_at, ip, user_agent)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(newId('ses'), userId, sha256(token), now(), now() + ttl, ip.slice(0, 64), ua.slice(0, 200));
  res.cookie(COOKIE, token, cookieOptions(ttl));
}

/** Détruit la session courante (déconnexion). */
export function destroySession(req: Request, res: Response): void {
  const token = req.cookies?.[COOKIE];
  if (token) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha256(token));
  res.clearCookie(COOKIE, { path: '/' });
}

/** Charge l'utilisateur à partir du cookie de session (sans exiger l'authentification). */
export function attachUser(req: Request, _res: Response, next: NextFunction): void {
  const token = req.cookies?.[COOKIE];
  if (!token) return next();
  const hash = sha256(token);
  const row = db
    .prepare(
      `SELECT u.id AS id, u.email AS email, u.role AS role, u.email_verified AS ev, s.expires_at AS exp
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ?`,
    )
    .get(hash) as { id: string; email: string; role: string; ev: number; exp: number } | undefined;

  if (!row) return next();
  if (row.exp < now()) {
    db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hash); // session expirée → purge
    return next();
  }
  req.user = { id: row.id, email: row.email, role: row.role as any, emailVerified: !!row.ev };
  next();
}

/** Exige une session valide. */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) return next(unauthorized());
  next();
}
