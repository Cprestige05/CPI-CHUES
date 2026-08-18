import type { Request, Response, NextFunction } from 'express';
import type { Role } from '../types.js';
import { AppError, forbidden, unauthorized } from './error.js';

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

/**
 * Exige un compte validé par l'admin. Le personnel (agent/admin) est approuvé
 * d'office ; un client non validé reçoit 403 `not_approved` (défense en profondeur —
 * le front affiche de son côté l'écran « compte en attente »).
 */
export function requireApproved(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) return next(unauthorized());
  if (!req.user.approved) {
    return next(new AppError(403, 'not_approved', "Compte en attente de validation par l'administrateur."));
  }
  next();
}
