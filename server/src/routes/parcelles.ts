import { Router } from 'express';
import { ah } from '../middleware/error.js';
import { requireAuth } from '../middleware/auth.js';
import { db } from '../db/index.js';

// Catalogue des parcelles (lecture seule pour tout utilisateur connecté).
export const parcellesRouter = Router();
parcellesRouter.use(requireAuth);

// Résumé par îlot : total + disponibles (pour la vue d'ensemble / le filtre).
parcellesRouter.get('/ilots', ah(async (_req, res) => {
  const ilots = db.prepare(
    `SELECT ilot,
            COUNT(*) AS total,
            SUM(CASE WHEN statut = 'disponible' THEN 1 ELSE 0 END) AS disponibles
     FROM parcelles GROUP BY ilot ORDER BY CAST(ilot AS INTEGER)`,
  ).all();
  const totals = db.prepare(
    `SELECT COUNT(*) AS lots, COUNT(DISTINCT ilot) AS ilots,
            SUM(CASE WHEN statut = 'disponible' THEN 1 ELSE 0 END) AS disponibles
     FROM parcelles`,
  ).get();
  res.json({ ilots, totals });
}));

// Liste filtrée + paginée des lots.
parcellesRouter.get('/', ah(async (req, res) => {
  const ilot = typeof req.query.ilot === 'string' ? req.query.ilot.trim() : '';
  const statut = ['disponible', 'reserve', 'vendu'].includes(String(req.query.statut)) ? String(req.query.statut) : '';
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
  const perPage = Math.min(2500, Math.max(1, parseInt(String(req.query.perPage ?? '50'), 10) || 50));

  const clauses: string[] = [];
  const params: unknown[] = [];
  if (ilot) { clauses.push('ilot = ?'); params.push(ilot); }
  if (statut) { clauses.push('statut = ?'); params.push(statut); }
  if (q) { clauses.push('(reference LIKE ? OR ilot = ? OR numero_lot = ?)'); params.push(`%${q}%`, q, q); }
  const where = clauses.length ? 'WHERE ' + clauses.join(' AND ') : '';

  const total = (db.prepare(`SELECT COUNT(*) AS n FROM parcelles ${where}`).get(...params) as { n: number }).n;
  const lots = db.prepare(
    `SELECT id, reference, ilot, numero_lot, surface, prix, statut FROM parcelles ${where}
     ORDER BY CAST(ilot AS INTEGER), CAST(numero_lot AS INTEGER) LIMIT ? OFFSET ?`,
  ).all(...params, perPage, (page - 1) * perPage);
  res.json({ lots, total, page, perPage });
}));

// Détail d'un lot.
parcellesRouter.get('/:id', ah(async (req, res) => {
  const lot = db.prepare('SELECT id, reference, ilot, numero_lot, surface, prix, statut, created_at FROM parcelles WHERE id = ?').get(req.params.id);
  if (!lot) { res.status(404).json({ error: 'not_found', message: 'Lot introuvable.' }); return; }
  res.json({ lot });
}));
