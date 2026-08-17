import { Router } from 'express';
import { ah } from '../middleware/error.js';
import { requireAuth } from '../middleware/auth.js';
import { requireClient } from '../middleware/rbac.js';
import { profileSchema } from '../validation/schemas.js';
import {
  ensureDossier, getProfile, updateProfile, listDocuments, completeness, submitDossier, requirements,
} from '../services/dossier.js';

export const dossierRouter = Router();
dossierRouter.use(requireAuth, requireClient);

// Récupère (ou crée) le dossier du client connecté + profil + documents + complétude.
dossierRouter.get('/', ah(async (req, res) => {
  const dossier = ensureDossier(req.user!.id);
  res.json({
    dossier,
    profile: getProfile(req.user!.id),
    requirements: requirements(),
    documents: listDocuments(dossier.id),
    completeness: completeness(dossier.id),
  });
}));

// Met à jour le profil.
dossierRouter.patch('/profile', ah(async (req, res) => {
  const patch = profileSchema.parse(req.body);
  const map: Record<string, string> = {};
  if (patch.firstName !== undefined) map.first_name = patch.firstName;
  if (patch.lastName !== undefined) map.last_name = patch.lastName;
  if (patch.phone !== undefined) map.phone = patch.phone;
  if (patch.employer !== undefined) map.employer = patch.employer;
  if (patch.address !== undefined) map.address = patch.address;
  if (patch.city !== undefined) map.city = patch.city;
  res.json({ ok: true, profile: updateProfile(req.user!.id, map) });
}));

// Complétude seule.
dossierRouter.get('/completeness', ah(async (req, res) => {
  const dossier = ensureDossier(req.user!.id);
  res.json(completeness(dossier.id));
}));

// Soumission (bloquée si les 7 pièces obligatoires ne sont pas présentes).
dossierRouter.post('/submit', ah(async (req, res) => {
  const dossier = submitDossier(req.user!.id);
  res.json({ ok: true, dossier });
}));
