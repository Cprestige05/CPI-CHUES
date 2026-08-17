import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll } from 'vitest';

// DB + stockage TEMPORAIRES, uniques par fichier de test (hors du stockage réel).
// Exécuté avant les imports du fichier de test → `env.ts` lira ces valeurs.
const dir = mkdtempSync(join(tmpdir(), 'mes-test-'));
process.env.NODE_ENV = 'test';
process.env.DATABASE_FILE = join(dir, 'test.db');
process.env.STORAGE_DIR = join(dir, 'storage', 'documents');
process.env.LOGIN_MAX_ATTEMPTS = '5';
process.env.LOGIN_WINDOW_MINUTES = '15';

// Nettoyage des fichiers temporaires (DB + uploads de test) après le fichier de test.
afterAll(() => {
  try { rmSync(dir, { recursive: true, force: true }); } catch { /* déjà supprimé */ }
});
