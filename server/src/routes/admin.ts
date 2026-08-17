import { Router } from 'express';
import { ah } from '../middleware/error.js';
import { requireAuth } from '../middleware/auth.js';
import { requireStaff, requireAdmin } from '../middleware/rbac.js';
import { dossierFilterSchema, reviewReasonSchema } from '../validation/schemas.js';
import {
  listDossiers, getDossierFull, dossierHistory,
  takeCharge, validateDocument, requestCorrection, rejectDocument, globalValidate,
} from '../services/admin.js';

export const adminRouter = Router();
adminRouter.use(requireAuth, requireStaff);

// Liste filtrée des dossiers soumis.
adminRouter.get('/dossiers', ah(async (req, res) => {
  const filter = dossierFilterSchema.parse(req.query);
  res.json({ dossiers: listDossiers(filter) });
}));

// Détail d'un dossier (client, profil, documents + versions).
adminRouter.get('/dossiers/:id', ah(async (req, res) => {
  res.json(getDossierFull(req.params.id));
}));

// Historique complet des contrôles.
adminRouter.get('/dossiers/:id/history', ah(async (req, res) => {
  res.json({ history: dossierHistory(req.params.id) });
}));

// ── Actions par document (personnel : Agent CPI ou Administrateur) ──
adminRouter.post('/documents/:id/take-charge', ah(async (req, res) => {
  res.json({ ok: true, ...takeCharge(req.user!, req.params.id) });
}));

adminRouter.post('/documents/:id/validate', ah(async (req, res) => {
  res.json({ ok: true, ...validateDocument(req.user!, req.params.id) });
}));

adminRouter.post('/documents/:id/request-correction', ah(async (req, res) => {
  const { reason } = reviewReasonSchema.parse(req.body);
  res.json({ ok: true, ...requestCorrection(req.user!, req.params.id, reason) });
}));

adminRouter.post('/documents/:id/reject', ah(async (req, res) => {
  const { reason } = reviewReasonSchema.parse(req.body);
  res.json({ ok: true, ...rejectDocument(req.user!, req.params.id, reason) });
}));

// ── Validation globale du dossier (Administrateur uniquement) ──
adminRouter.post('/dossiers/:id/validate', requireAdmin, ah(async (req, res) => {
  res.json({ ok: true, ...globalValidate(req.user!, req.params.id) });
}));
