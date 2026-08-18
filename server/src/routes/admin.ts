import { Router } from 'express';
import { ah, badRequest } from '../middleware/error.js';
import { requireAuth } from '../middleware/auth.js';
import { requireStaff, requireAdmin } from '../middleware/rbac.js';
import { dossierFilterSchema, reviewReasonSchema } from '../validation/schemas.js';
import {
  listDossiers, getDossierFull, dossierHistory,
  takeCharge, validateDocument, requestCorrection, rejectDocument, globalValidate,
  listAccounts, listAgents, approveAndAssign, activityLog,
} from '../services/admin.js';

export const adminRouter = Router();
adminRouter.use(requireAuth, requireStaff);

// Liste filtrée des dossiers soumis. Un agent ne voit QUE ses clients attribués.
adminRouter.get('/dossiers', ah(async (req, res) => {
  const filter = dossierFilterSchema.parse(req.query) as { status?: string; q?: string; agentId?: string };
  if (req.user!.role === 'AGENT_CPI') filter.agentId = req.user!.id;
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

// ── Comptes : validation + attribution d'agent (ADMIN) ──
// Liste des comptes clients (filtre ?status=pending|approved&q=…).
adminRouter.get('/accounts', requireAdmin, ah(async (req, res) => {
  const status = req.query.status === 'pending' || req.query.status === 'approved' ? req.query.status : undefined;
  const q = typeof req.query.q === 'string' ? req.query.q : undefined;
  res.json({ accounts: listAccounts({ status, q }) });
}));

// Liste des agents CPI (pour l'attribution).
adminRouter.get('/agents', requireAdmin, ah(async (_req, res) => {
  res.json({ agents: listAgents() });
}));

// Valide un compte client + l'attribue à un agent CPI.
adminRouter.post('/accounts/:id/approve', requireAdmin, ah(async (req, res) => {
  const agentId = typeof req.body?.agentId === 'string' ? req.body.agentId : '';
  if (!agentId) throw badRequest('Agent CPI requis.', 'agent_required');
  res.json({ ok: true, ...approveAndAssign(req.user!, req.params.id, agentId) });
}));

// Journal d'activité global (traçabilité admin).
adminRouter.get('/activity', requireAdmin, ah(async (_req, res) => {
  res.json({ activity: activityLog() });
}));
