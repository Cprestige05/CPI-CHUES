/**
 * Maintenance des données — TOUJOURS via la connexion applicative (`db`),
 * qui force `PRAGMA foreign_keys = ON`. Aucune manipulation SQLite externe
 * (Python, sqlite3 CLI…) n'est autorisée sur la base : les cascades FK et les
 * fichiers physiques ne seraient pas gérés correctement.
 */
import { resolve } from 'node:path';
import { existsSync, unlinkSync, readdirSync } from 'node:fs';
import { db } from '../db/index.js';
import { env } from '../env.js';

/** Tables liées à un utilisateur (doivent toutes retomber à 0 après purge). */
export const USER_SCOPED_TABLES = [
  'profiles', 'sessions', 'dossiers', 'documents', 'document_versions',
  'admin_reviews', 'notifications', 'email_verification_tokens', 'password_reset_tokens',
] as const;

export const ALL_TABLES = [
  'users', ...USER_SCOPED_TABLES, 'activity_logs', 'document_types', 'parcelles', '_migrations',
] as const;

export function tableCounts(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const t of ALL_TABLES) {
    const r = db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get() as { n: number };
    out[t] = r.n;
  }
  return out;
}

/** Noms de fichiers physiques encore présents dans le stockage (hors .gitkeep). */
export function storedFiles(): string[] {
  if (!existsSync(env.STORAGE_DIR)) return [];
  return readdirSync(env.STORAGE_DIR).filter(f => f !== '.gitkeep');
}

/** PRAGMA integrity_check — doit valoir exactement ['ok']. */
export function integrityCheck(): string[] {
  return (db.pragma('integrity_check') as { integrity_check: string }[]).map(r => r.integrity_check);
}

/** PRAGMA foreign_key_check — doit renvoyer un tableau vide. */
export function foreignKeyCheck(): unknown[] {
  return db.pragma('foreign_key_check') as unknown[];
}

/**
 * Supprime un utilisateur et TOUTES ses données liées via cascade FK,
 * puis ses fichiers téléversés. Transactionnel et sûr.
 */
export function deleteUserCascade(userId: string): { filesDeleted: number; storedNames: string[] } {
  // 1) Récupère les fichiers physiques AVANT suppression (les lignes vont disparaître).
  const storedNames = (
    db.prepare(
      `SELECT dv.stored_name FROM document_versions dv
         JOIN documents d  ON d.id  = dv.document_id
         JOIN dossiers dos ON dos.id = d.dossier_id
        WHERE dos.user_id = ?`,
    ).all(userId) as { stored_name: string }[]
  ).map(r => r.stored_name);

  // 2) Suppression transactionnelle. `db` a déjà foreign_keys = ON → cascade complète.
  const tx = db.transaction(() => {
    const res = db.prepare('DELETE FROM users WHERE id = ?').run(userId);
    if (res.changes === 0) throw new Error('Utilisateur introuvable.');
    // Contrôle final des relations à l'intérieur de la transaction.
    const violations = db.pragma('foreign_key_check') as unknown[];
    if (violations.length > 0) throw new Error('Violation de contrainte FK détectée après suppression.');
  });
  tx();

  // 3) Fichiers physiques (après commit DB).
  let filesDeleted = 0;
  for (const name of storedNames) {
    const p = resolve(env.STORAGE_DIR, name);
    if (existsSync(p)) { unlinkSync(p); filesDeleted++; }
  }
  return { filesDeleted, storedNames };
}

/**
 * Réinitialise TOUTES les données applicatives (comptes + fichiers), en
 * conservant la configuration (document_types) et le journal des migrations.
 * Transactionnel ; contrôle final des relations.
 */
export function resetAllData(): { usersDeleted: number; filesDeleted: number } {
  const before = (db.prepare('SELECT COUNT(*) AS n FROM users').get() as { n: number }).n;
  const names = storedFiles();

  const tx = db.transaction(() => {
    db.prepare('DELETE FROM users').run();          // cascade → tables liées à l'utilisateur
    db.prepare('DELETE FROM activity_logs').run();  // logs (actor_id sans FK) → nettoyage explicite
    const violations = db.pragma('foreign_key_check') as unknown[];
    if (violations.length > 0) throw new Error('Violation de contrainte FK après réinitialisation.');
  });
  tx();

  let filesDeleted = 0;
  for (const name of names) {
    const p = resolve(env.STORAGE_DIR, name);
    if (existsSync(p)) { unlinkSync(p); filesDeleted++; }
  }
  return { usersDeleted: before, filesDeleted };
}
