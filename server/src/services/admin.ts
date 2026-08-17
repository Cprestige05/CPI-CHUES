import { db } from '../db/index.js';
import { newId, now } from '../lib/ids.js';
import { badRequest, conflict, notFound } from '../middleware/error.js';
import { notify, logActivity } from './notify.js';
import type { AuthUser } from '../types.js';

interface DocFull {
  id: string; dossier_id: string; type_code: string; slot_index: number; status: string; current_version_id: string | null;
}
interface DossierFull { id: string; user_id: string; status: string; submitted_at: number | null; }

function getDoc(documentId: string): DocFull {
  const d = db.prepare('SELECT * FROM documents WHERE id = ?').get(documentId) as DocFull | undefined;
  if (!d) throw notFound('Document introuvable.');
  return d;
}
function getDossierById(id: string): DossierFull {
  const d = db.prepare('SELECT id, user_id, status, submitted_at FROM dossiers WHERE id = ?').get(id) as DossierFull | undefined;
  if (!d) throw notFound('Dossier introuvable.');
  return d;
}

function record(reviewer: AuthUser, dossierId: string, documentId: string | null, action: string, from: string, to: string, reason = ''): void {
  db.prepare(
    `INSERT INTO admin_reviews (id, dossier_id, document_id, reviewer_id, action, from_status, to_status, reason, created_at)
     VALUES (?,?,?,?,?,?,?,?,?)`,
  ).run(newId('rev'), dossierId, documentId, reviewer.id, action, from, to, reason, now());
  logActivity({ actorId: reviewer.id, actorRole: reviewer.role, action: `admin_${action.toLowerCase()}`, entityType: documentId ? 'document' : 'dossier', entityId: documentId ?? dossierId, meta: reason ? { hasReason: true } : undefined });
}

function setDocStatus(documentId: string, status: string): void {
  db.prepare('UPDATE documents SET status = ?, updated_at = ? WHERE id = ?').run(status, now(), documentId);
}
function setDossierStatus(dossierId: string, status: string, decided = false): void {
  if (decided) db.prepare('UPDATE dossiers SET status = ?, decided_at = ?, updated_at = ? WHERE id = ?').run(status, now(), now(), dossierId);
  else db.prepare('UPDATE dossiers SET status = ?, updated_at = ? WHERE id = ?').run(status, now(), dossierId);
}

// ─── Actions par document ────────────────────────────────────────────────────
export function takeCharge(reviewer: AuthUser, documentId: string) {
  const doc = getDoc(documentId);
  if (!doc.current_version_id) throw badRequest('Document inexistant — rien à prendre en charge.', 'no_file');
  if (doc.status !== 'SOUMIS') throw conflict('Ce document ne peut pas être pris en charge à ce stade.', 'bad_status');
  setDocStatus(documentId, 'EN_VERIFICATION');
  record(reviewer, doc.dossier_id, documentId, 'TAKE_CHARGE', 'SOUMIS', 'EN_VERIFICATION');
  return { status: 'EN_VERIFICATION' };
}

export function validateDocument(reviewer: AuthUser, documentId: string) {
  const doc = getDoc(documentId);
  if (!doc.current_version_id) throw badRequest('Impossible de valider un document inexistant.', 'no_file');
  if (!['SOUMIS', 'EN_VERIFICATION'].includes(doc.status)) throw conflict('Statut incompatible avec la validation.', 'bad_status');
  setDocStatus(documentId, 'VALIDE');
  record(reviewer, doc.dossier_id, documentId, 'VALIDATE', doc.status, 'VALIDE');
  const owner = getDossierById(doc.dossier_id).user_id;
  notify(owner, 'document_validated', 'Document validé', 'Un de vos documents a été validé.');
  return { status: 'VALIDE' };
}

export function requestCorrection(reviewer: AuthUser, documentId: string, reason: string) {
  if (!reason || !reason.trim()) throw badRequest('Motif obligatoire.', 'reason_required');
  const doc = getDoc(documentId);
  if (!doc.current_version_id) throw badRequest('Aucun document à corriger.', 'no_file');
  db.transaction(() => {
    setDocStatus(documentId, 'A_CORRIGER');
    setDossierStatus(doc.dossier_id, 'A_CORRIGER');
    record(reviewer, doc.dossier_id, documentId, 'REQUEST_CORRECTION', doc.status, 'A_CORRIGER', reason.trim());
  })();
  const owner = getDossierById(doc.dossier_id).user_id;
  notify(owner, 'correction_requested', 'Correction demandée', 'Un document doit être corrigé. Consultez le motif dans votre dossier.');
  return { status: 'A_CORRIGER' };
}

export function rejectDocument(reviewer: AuthUser, documentId: string, reason: string) {
  if (!reason || !reason.trim()) throw badRequest('Motif obligatoire.', 'reason_required');
  const doc = getDoc(documentId);
  if (!doc.current_version_id) throw badRequest('Aucun document à rejeter.', 'no_file');
  db.transaction(() => {
    setDocStatus(documentId, 'REJETE');
    setDossierStatus(doc.dossier_id, 'A_CORRIGER');
    record(reviewer, doc.dossier_id, documentId, 'REJECT', doc.status, 'REJETE', reason.trim());
  })();
  const owner = getDossierById(doc.dossier_id).user_id;
  notify(owner, 'document_rejected', 'Document rejeté', 'Un document a été rejeté. Consultez le motif dans votre dossier.');
  return { status: 'REJETE' };
}

// ─── Validation globale ───────────────────────────────────────────────────────
export function globalValidate(reviewer: AuthUser, dossierId: string) {
  const dossier = getDossierById(dossierId);
  if (dossier.status === 'BROUILLON') throw conflict('Dossier non soumis.', 'not_submitted');

  const docs = db.prepare('SELECT type_code, slot_index, status, current_version_id FROM documents WHERE dossier_id = ?').all(dossierId) as DocFull[];
  const blocking = docs.filter(d => d.status !== 'VALIDE');
  if (blocking.length > 0) {
    throw conflict(
      `Validation impossible : ${blocking.length} pièce(s) non validée(s).`,
      'not_all_valid',
    );
  }
  setDossierStatus(dossierId, 'VALIDE', true);
  record(reviewer, dossierId, null, 'GLOBAL_VALIDATE', dossier.status, 'VALIDE');
  notify(dossier.user_id, 'dossier_validated', 'Dossier validé', 'Votre dossier est complet et validé.');
  return { status: 'VALIDE' };
}

// ─── Lecture ──────────────────────────────────────────────────────────────────
export function listDossiers(filter: { status?: string; q?: string }) {
  const clauses: string[] = ['dos.status != ?'];
  const params: unknown[] = ['BROUILLON']; // on ne montre pas les brouillons non soumis
  if (filter.status) { clauses.push('dos.status = ?'); params.push(filter.status); }
  if (filter.q) {
    clauses.push('(u.email LIKE ? OR p.first_name LIKE ? OR p.last_name LIKE ?)');
    const like = `%${filter.q}%`; params.push(like, like, like);
  }
  const rows = db.prepare(
    `SELECT dos.id, dos.status, dos.submitted_at, u.email, p.first_name, p.last_name
     FROM dossiers dos JOIN users u ON u.id = dos.user_id
     LEFT JOIN profiles p ON p.user_id = dos.user_id
     WHERE ${clauses.join(' AND ')}
     ORDER BY dos.submitted_at DESC`,
  ).all(...params) as any[];
  return rows.map(r => ({ id: r.id, status: r.status, submittedAt: r.submitted_at, client: { email: r.email, firstName: r.first_name ?? '', lastName: r.last_name ?? '' } }));
}

export function getDossierFull(dossierId: string) {
  const dossier = getDossierById(dossierId);
  const profile = db.prepare('SELECT first_name, last_name, phone, employer, address, city FROM profiles WHERE user_id = ?').get(dossier.user_id);
  const user = db.prepare('SELECT email, email_verified FROM users WHERE id = ?').get(dossier.user_id) as any;
  const docs = db.prepare('SELECT * FROM documents WHERE dossier_id = ? ORDER BY type_code, slot_index').all(dossierId) as DocFull[];
  const documents = docs.map(d => ({
    id: d.id, typeCode: d.type_code, slotIndex: d.slot_index, status: d.status,
    versions: db.prepare('SELECT id, version, original_name, mime, size, period, active, uploaded_at FROM document_versions WHERE document_id = ? ORDER BY version').all(d.id),
  }));
  return { dossier, client: { email: user?.email, emailVerified: !!user?.email_verified, profile }, documents };
}

export function dossierHistory(dossierId: string) {
  getDossierById(dossierId);
  return db.prepare(
    `SELECT ar.action, ar.document_id, ar.from_status, ar.to_status, ar.reason, ar.created_at, u.email AS reviewer
     FROM admin_reviews ar LEFT JOIN users u ON u.id = ar.reviewer_id
     WHERE ar.dossier_id = ? ORDER BY ar.created_at`,
  ).all(dossierId);
}
