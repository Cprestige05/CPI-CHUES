/**
 * CLI de maintenance — utilise EXCLUSIVEMENT la connexion applicative (`db`).
 *
 *   pnpm maintenance:check     → PRAGMA integrity_check + foreign_key_check + comptes
 *   pnpm maintenance:reset     → réinitialise toutes les données (comptes + fichiers)
 *
 * Ne jamais modifier la base avec un outil externe (Python, sqlite3 CLI…).
 * Pour `reset`, arrêter d'abord le backend (une seule connexion en écriture).
 */
import { runMigrations } from '../db/migrate.js';
import {
  tableCounts, storedFiles, integrityCheck, foreignKeyCheck, resetAllData, USER_SCOPED_TABLES,
} from '../services/maintenance.js';

const action = process.argv[2] ?? 'check';

function printReport(): boolean {
  const integrity = integrityCheck();
  const fkViolations = foreignKeyCheck();
  const counts = tableCounts();
  const files = storedFiles();

  console.log('── Intégrité SQLite ────────────────────────────');
  console.log('integrity_check   :', integrity.join(', '));
  console.log('foreign_key_check :', fkViolations.length === 0 ? 'aucune violation' : JSON.stringify(fkViolations));
  console.log('── Comptes par table ───────────────────────────');
  for (const [t, n] of Object.entries(counts)) console.log(`${t.padEnd(26)} ${n}`);
  console.log('fichiers téléversés         :', files.length);

  const integrityOk = integrity.length === 1 && integrity[0] === 'ok';
  const fkOk = fkViolations.length === 0;
  const emptyUserData = counts.users === 0 && USER_SCOPED_TABLES.every(t => counts[t] === 0) && files.length === 0;
  const configOk = counts.document_types === 3 && counts._migrations >= 1;

  console.log('── Verdicts ────────────────────────────────────');
  console.log('integrity_check = ok        :', integrityOk);
  console.log('foreign_key_check vide      :', fkOk);
  console.log('données utilisateur vides   :', emptyUserData);
  console.log('config présente (types=3, migration) :', configOk);
  return integrityOk && fkOk;
}

runMigrations();

if (action === 'check') {
  const ok = printReport();
  process.exit(ok ? 0 : 1);
} else if (action === 'reset') {
  const r = resetAllData();
  console.log(`Réinitialisation : ${r.usersDeleted} compte(s) supprimé(s), ${r.filesDeleted} fichier(s) retiré(s).`);
  printReport();
} else {
  console.error(`Action inconnue : ${action}. Utilisez « check » ou « reset ».`);
  process.exit(2);
}
