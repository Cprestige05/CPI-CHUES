import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { db } from './index.js';
import { SERVER_ROOT } from '../env.js';
import { now } from '../lib/ids.js';

const MIGRATIONS_DIR = resolve(SERVER_ROOT, 'migrations');

/**
 * Applique toutes les migrations `.sql` non encore appliquées, dans l'ordre de nom.
 * Chaque migration s'exécute dans une transaction. Retourne le nombre appliqué.
 */
export function runMigrations(): number {
  db.exec(`CREATE TABLE IF NOT EXISTS _migrations (
    name TEXT PRIMARY KEY,
    applied_at INTEGER NOT NULL
  );`);

  const applied = new Set<string>(
    db.prepare('SELECT name FROM _migrations').all().map((r: any) => r.name as string),
  );

  const files = readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  let count = 0;
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = readFileSync(resolve(MIGRATIONS_DIR, file), 'utf8');
    const tx = db.transaction(() => {
      db.exec(sql);
      db.prepare('INSERT INTO _migrations (name, applied_at) VALUES (?, ?)').run(file, now());
    });
    tx();
    count += 1;
  }
  return count;
}

// Exécution directe : `pnpm migrate` (tsx src/db/migrate.ts)
if (process.argv[1]?.replace(/\\/g, '/').endsWith('/db/migrate.ts')) {
  const n = runMigrations();
  console.log(`[migrate] ${n} migration(s) appliquée(s).`);
}
