import type { Request, Response, NextFunction } from 'express';
import type { Role } from '../types.js';
import { forbidden, unauthorized } from './error.js';

/** Restreint l'accès aux rôles indiqués. */
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(unauthorized());
    if (!roles.includes(req.user.role)) return next(forbidden());
    next();
  };
}

export const requireClient = requireRole('CLIENT');
export const requireStaff = requireRole('AGENT_CPI', 'ADMIN');
export const requireAdmin = requireRole('ADMIN');
