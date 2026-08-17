import { writeFileSync, unlinkSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { db } from '../db/index.js';
import { env } from '../env.js';
import { newId, now, safeStoredName } from '../lib/ids.js';
import { sniffMime, isSafeOriginalName, ALLOWED_LABEL } from '../lib/documents.js';
import { badRequest, conflict, forbidden, notFound, unsupportedMedia } from '../middleware/error.js';
import { notify, logActivity } from './notify.js';

mkdirSync(env.STORAGE_DIR, { recursive: true });

export interface DocType { code: string; label: string; required_count: number; sort: number }
export const requirements = (): DocType[] =>
  db.prepare('SELECT code, label, required_count, sort FROM document_types ORDER BY sort').all() as DocType[];

export interface Dossier {
  id: string; user_id: string; status: string;
  submitted_at: number | null; decided_at: number | null;
  created_at: number; updated_at: number;
}

/** Crée le dossier du client + un emplacement par pièce requise, s'ils n'existent pas. */
export function ensureDossier(userId: string): Dossier {
  const existing = db.prepare('SELECT * FROM dossiers WHERE user_id = ?').get(userId) as Dossier | undefined;
  if (existing) return existing;

  const t = now();
  const dossierId = newId('dos');
  const tx = db.transaction(() => {
    db.prepare(
      'INSERT INTO dossiers (id, user_id, status, created_at, updated_at) VALUES (?,?,?,?,?)',
    ).run(dossierId, userId, 'BROUILLON', t, t);
    for (const rt of requirements()) {
      for (let i = 0; i < rt.required_count; i++) {
        db.prepare(
          `INSERT INTO documents (id, dossier_id, type_code, slot_index, status, created_at, updated_at)
           VALUES (?,?,?,?, 'MANQUANT', ?, ?)`,
        ).run(newId('doc'), dossierId, rt.code, i, t, t);
      }
    }
  });
  tx();
  return db.prepare('SELECT * FROM dossiers WHERE id = ?').get(dossierId) as Dossier;
}

export const getDossier = (userId: string): Dossier | undefined =>
  db.prepare('SELECT * FROM dossiers WHERE user_id = ?').get(userId) as Dossier | undefined;

// ─── Profil ────────────────────────────────────────────────────────────────
export function getProfile(userId: string) {
  return db.prepare('SELECT first_name, last_name, phone, employer, address, city FROM profiles WHERE user_id = ?').get(userId);
}
export function updateProfile(userId: string, patch: Record<string, string>) {
  const allowed = ['first_name', 'last_name', 'phone', 'employer', 'address', 'city'] as const;
  const sets: string[] = [];
  const vals: unknown[] = [];
  for (const k of allowed) {
    if (patch[k] !== undefined) { sets.push(`${k} = ?`); vals.push(patch[k]); }
  }
  if (sets.length) {
    sets.push('updated_at = ?'); vals.push(now(), userId);
    db.prepare(`UPDATE profiles SET ${sets.join(', ')} WHERE user_id = ?`).run(...vals);
  }
  return getProfile(userId);
}

// ─── Documents ──────────────────────────────────────────────────────────────
export interface DocRow {
  id: string; dossier_id: string; type_code: string; slot_index: number;
  status: string; current_version_id: string | null;
}
export interface VersionRow {
  id: string; document_id: string; version: number; original_name: string; stored_name: string;
  mime: string; size: number; sha256: string; period: string; active: number; uploaded_by: string; uploaded_at: number;
}

/** Liste des emplacements du dossier + métadonnées de la version active (jamais le fichier). */
export function listDocuments(dossierId: string) {
  const docs = db.prepare('SELECT * FROM documents WHERE dossier_id = ? ORDER BY type_code, slot_index').all(dossierId) as DocRow[];
  return docs.map(d => {
    const v = d.current_version_id
      ? (db.prepare('SELECT id, version, original_name, mime, size, period, uploaded_at FROM document_versions WHERE id = ?').get(d.current_version_id) as any)
      : null;
    return {
      id: d.id, typeCode: d.type_code, slotIndex: d.slot_index, status: d.status,
      activeVersion: v ? { id: v.id, version: v.version, originalName: v.original_name, mime: v.mime, size: v.size, period: v.period, uploadedAt: v.uploaded_at } : null,
    };
  });
}

/** Taux de complétude : nombre d'emplacements pourvus / requis. */
export function completeness(dossierId: string) {
  const items = listDocuments(dossierId);
  const filled = items.filter(i => i.activeVersion !== null).length;
  const validated = items.filter(i => i.status === 'VALIDE').length;
  const required = items.length; // 7 (cni×1 + bulletin×3 + relevé×3)
  return {
    required, filled, validated,
    complete: filled === required,
    pct: required ? Math.round((filled / required) * 100) : 0,
    missing: items.filter(i => i.activeVersion === null).map(i => ({ typeCode: i.typeCode, slotIndex: i.slotIndex })),
  };
}

const EDITABLE_BEFORE_SUBMIT = new Set(['MANQUANT', 'BROUILLON']);
const EDITABLE_CORRECTION = new Set(['A_CORRIGER', 'REJETE']);

/** Dépose (ou remplace) un fichier pour un emplacement. Crée une nouvelle version. */
export function uploadDocument(input: {
  userId: string; dossier: Dossier; typeCode: string; slotIndex: number; period: string;
  file: { buffer: Buffer; originalname: string };
}) {
  const { userId, dossier, typeCode, slotIndex, period, file } = input;

  const type = requirements().find(t => t.code === typeCode);
  if (!type) throw badRequest('Type de document inconnu.');
  if (slotIndex < 0 || slotIndex >= type.required_count) throw badRequest('Emplacement invalide.');

  const docRow = db
    .prepare('SELECT * FROM documents WHERE dossier_id = ? AND type_code = ? AND slot_index = ?')
    .get(dossier.id, typeCode, slotIndex) as DocRow | undefined;
  if (!docRow) throw notFound('Emplacement de document introuvable.');

  const submitted = dossier.status !== 'BROUILLON';
  if (submitted) {
    // Après soumission : seul un document à corriger/rejeté peut être remplacé.
    if (!EDITABLE_CORRECTION.has(docRow.status)) {
      throw conflict('Ce document ne peut pas être remplacé à ce stade.', 'not_editable');
    }
  } else if (!EDITABLE_BEFORE_SUBMIT.has(docRow.status) && !EDITABLE_CORRECTION.has(docRow.status)) {
    throw conflict('Ce document ne peut pas être modifié.', 'not_editable');
  }

  // ── Validations fichier (serveur) ──
  const buf = file.buffer;
  if (!buf || buf.length === 0) throw badRequest('Fichier vide.', 'empty_file');
  if (!isSafeOriginalName(file.originalname)) throw badRequest('Nom de fichier non autorisé.', 'unsafe_name');
  const detected = sniffMime(buf); // type MIME RÉEL (magic bytes)
  if (!detected) throw unsupportedMedia(`Format non autorisé. Formats acceptés : ${ALLOWED_LABEL}.`);

  const storedName = safeStoredName(detected.ext);
  const sha = createHash('sha256').update(buf).digest('hex');
  writeFileSync(resolve(env.STORAGE_DIR, storedName), buf, { mode: 0o600 });

  const t = now();
  const prev = db.prepare('SELECT MAX(version) AS v FROM document_versions WHERE document_id = ?').get(docRow.id) as { v: number | null };
  const version = (prev.v ?? 0) + 1;
  const versionId = newId('ver');

  const tx = db.transaction(() => {
    // L'ancienne version reste dans l'historique mais devient inactive.
    db.prepare('UPDATE document_versions SET active = 0 WHERE document_id = ? AND active = 1').run(docRow.id);
    db.prepare(
      `INSERT INTO document_versions (id, document_id, version, original_name, stored_name, mime, size, sha256, period, active, uploaded_by, uploaded_at)
       VALUES (?,?,?,?,?,?,?,?,?,1,?,?)`,
    ).run(versionId, docRow.id, version, file.originalname, storedName, detected.mime, buf.length, sha, period, userId, t);
    const newStatus = submitted ? 'SOUMIS' : 'BROUILLON';
    db.prepare('UPDATE documents SET current_version_id = ?, status = ?, updated_at = ? WHERE id = ?')
      .run(versionId, newStatus, t, docRow.id);
    db.prepare('UPDATE dossiers SET updated_at = ? WHERE id = ?').run(t, dossier.id);
  });
  tx();

  logActivity({ actorId: userId, actorRole: 'CLIENT', action: version > 1 ? 'document_replaced' : 'document_uploaded', entityType: 'document', entityId: docRow.id, meta: { typeCode, slotIndex, version } });
  return { documentId: docRow.id, versionId, version };
}

/** Supprime le fichier d'un emplacement — uniquement avant la soumission du dossier. */
export function deleteDocument(dossier: Dossier, documentId: string) {
  if (dossier.status !== 'BROUILLON') throw conflict('Suppression impossible après soumission.', 'locked');
  const doc = db.prepare('SELECT * FROM documents WHERE id = ? AND dossier_id = ?').get(documentId, dossier.id) as DocRow | undefined;
  if (!doc) throw notFound('Document introuvable.');
  const versions = db.prepare('SELECT stored_name FROM document_versions WHERE document_id = ?').all(documentId) as { stored_name: string }[];
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM document_versions WHERE document_id = ?').run(documentId);
    db.prepare("UPDATE documents SET current_version_id = NULL, status = 'MANQUANT', updated_at = ? WHERE id = ?").run(now(), documentId);
  });
  tx();
  for (const v of versions) { try { unlinkSync(resolve(env.STORAGE_DIR, v.stored_name)); } catch { /* fichier déjà absent */ } }
  logActivity({ actorId: dossier.user_id, actorRole: 'CLIENT', action: 'document_deleted', entityType: 'document', entityId: documentId });
}

/** Récupère une version pour téléchargement, avec contrôle de propriété. */
export function getVersionForUser(user: { id: string; role: string }, versionId: string) {
  const v = db.prepare(
    `SELECT dv.*, d.dossier_id AS dossier_id, dos.user_id AS owner_id
     FROM document_versions dv
     JOIN documents d ON d.id = dv.document_id
     JOIN dossiers dos ON dos.id = d.dossier_id
     WHERE dv.id = ?`,
  ).get(versionId) as (VersionRow & { owner_id: string }) | undefined;
  if (!v) throw notFound('Document introuvable.');
  const isStaff = user.role === 'AGENT_CPI' || user.role === 'ADMIN';
  if (!isStaff && v.owner_id !== user.id) throw forbidden('Vous ne pouvez pas accéder à ce document.');
  return { path: resolve(env.STORAGE_DIR, v.stored_name), mime: v.mime, originalName: v.original_name };
}

/** Soumission du dossier — refusée si les 7 pièces obligatoires ne sont pas présentes. */
export function submitDossier(userId: string) {
  const dossier = ensureDossier(userId);
  if (dossier.status !== 'BROUILLON' && dossier.status !== 'A_CORRIGER') {
    throw conflict('Le dossier a déjà été soumis.', 'already_submitted');
  }
  const profile = getProfile(userId) as any;
  if (!profile || !profile.first_name || !profile.last_name) {
    throw badRequest('Complétez vos informations personnelles avant de soumettre.', 'profile_incomplete');
  }
  const comp = completeness(dossier.id);
  if (!comp.complete) {
    throw badRequest(`Dossier incomplet : ${comp.filled}/${comp.required} pièces déposées.`, 'documents_incomplete');
  }

  const t = now();
  const tx = db.transaction(() => {
    db.prepare("UPDATE documents SET status = 'SOUMIS', updated_at = ? WHERE dossier_id = ? AND status IN ('BROUILLON','A_CORRIGER','REJETE')").run(t, dossier.id);
    db.prepare("UPDATE dossiers SET status = 'SOUMIS', submitted_at = ?, updated_at = ? WHERE id = ?").run(t, t, dossier.id);
  });
  tx();

  notify(userId, 'dossier_submitted', 'Dossier transmis', 'Votre dossier a été transmis pour vérification.');
  for (const admin of db.prepare("SELECT id FROM users WHERE role = 'ADMIN'").all() as { id: string }[]) {
    notify(admin.id, 'new_dossier', 'Nouveau dossier soumis', 'Un dossier client vient d\'être soumis.');
  }
  logActivity({ actorId: userId, actorRole: 'CLIENT', action: 'dossier_submitted', entityType: 'dossier', entityId: dossier.id });
  return db.prepare('SELECT * FROM dossiers WHERE id = ?').get(dossier.id) as Dossier;
}
