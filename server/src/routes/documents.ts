import { Router } from 'express';
import { ah, badRequest } from '../middleware/error.js';
import { requireAuth } from '../middleware/auth.js';
import { requireClient, requireApproved } from '../middleware/rbac.js';
import { upload } from '../middleware/upload.js';
import { uploadMetaSchema } from '../validation/schemas.js';
import { ensureDossier, uploadDocument, deleteDocument, getVersionForUser } from '../services/dossier.js';

export const documentsRouter = Router();

// Dépôt / remplacement d'un fichier (client). Le remplacement crée une nouvelle version.
documentsRouter.post('/', requireAuth, requireClient, requireApproved, upload.single('file'), ah(async (req, res) => {
  if (!req.file) throw badRequest('Aucun fichier fourni.', 'no_file');
  const meta = uploadMetaSchema.parse(req.body);
  const dossier = ensureDossier(req.user!.id);
  const out = uploadDocument({
    userId: req.user!.id, dossier,
    typeCode: meta.typeCode, slotIndex: meta.slotIndex, period: meta.period,
    file: { buffer: req.file.buffer, originalname: req.file.originalname },
  });
  res.status(201).json({ ok: true, ...out });
}));

// Téléchargement sécurisé (propriétaire ou personnel). Jamais servi en statique public.
documentsRouter.get('/:versionId/download', requireAuth, ah(async (req, res) => {
  const { path, mime, originalName } = getVersionForUser(req.user!, req.params.versionId);
  res.setHeader('Content-Type', mime);
  res.setHeader('Content-Disposition', `attachment; filename="${originalName.replace(/[^\w.\- ]/g, '_')}"`);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.sendFile(path);
}));

// Suppression d'un document — uniquement avant la soumission.
documentsRouter.delete('/:documentId', requireAuth, requireClient, requireApproved, ah(async (req, res) => {
  const dossier = ensureDossier(req.user!.id);
  deleteDocument(dossier, req.params.documentId);
  res.json({ ok: true });
}));
